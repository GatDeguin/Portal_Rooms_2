import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const api=await import('../src/hand-rig.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const rig=()=>{assert.equal(typeof api.HandRig,'function','the articulated reference rig is available');return new api.HandRig();};
const transform=(m,p)=>[0,1,2].map(k=>m[k]*p[0]+m[4+k]*p[1]+m[8+k]*p[2]+m[12+k]);
test('all skinning bones preserve the authored bind pose',()=>{
 const r=rig();r.update(api.REST,1);
 for(let i=0;i<20;i++)transform(r.matrices.subarray(i*16,i*16+16),[1,3,.5]).forEach((v,k)=>assert.ok(Math.abs(v-[1,3,.5][k])<1e-5));
});
test('both hands retarget into game coordinates without inverted depth',()=>{
 for(const sign of [1,-1]){
  const r=rig(),pose=new Float32Array(63);
  for(let i=0;i<21;i++)pose.set([api.REST[i*3]*.09*sign+1,api.REST[i*3+1]*.09+.4,api.REST[i*3+2]*.09-.5],i*3);
  r.update(pose,sign);const p=transform(r.matrices.subarray(0,16),[1,3,.5]);
  [1+.09*sign,.67,-.455].forEach((v,k)=>assert.ok(Math.abs(v-p[k])<1e-5));
 }
});
test('collapsed tracking joints never upload NaN bone transforms',()=>{
 const r=rig();r.update(new Float32Array(63),-1);assert.ok(r.matrices.every(Number.isFinite));
});
test('shipped mesh has valid indices and normalized bone weights',async()=>{
 const bytes=await readFile(new URL('../assets/hands/atelier-v03.bin',import.meta.url));
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 assert.equal(d.getUint32(0,true),0x444e4148);
 const count=d.getUint32(4,true),indices=d.getUint32(8,true),stride=d.getUint32(12,true);
 assert.equal(stride,18);assert.equal(bytes.length,16+count*72+indices*4);
 for(let i=0;i<count;i++){
  let sum=0;for(let j=0;j<4;j++){
   const bone=d.getFloat32(16+i*72+24+j*4,true);assert.ok(Number.isInteger(bone)&&bone>=0&&bone<20);
   const weight=d.getFloat32(16+i*72+40+j*4,true);assert.ok(weight>=0);sum+=weight;
  }assert.ok(Math.abs(sum-1)<1e-5);
 }
 for(let i=0;i<indices;i++)assert.ok(d.getUint32(16+count*72+i*4,true)<count);
});

const roomApi=await import('../src/hand-room.js');
const cache=()=>{assert.equal(typeof roomApi.RoomReceiverCache,'function');return new roomApi.RoomReceiverCache();};
test('worker clones reuse static receivers across frames',()=>{
 const c=cache(),room={obstacles:[{x:0,z:0,w:1,d:1}],platforms:[]};
 const a=c.update(room,0),b=c.update(structuredClone(room),1);
 assert.strictEqual(a.staticVertices,b.staticVertices);assert.equal(b.staticChanged,false);
});
test('moving objects update without rebuilding floor, walls and stationary objects',()=>{
 const c=cache(),room={obstacles:[{x:0,z:0,w:1,d:1,move:{axis:'x',amp:1,speed:1}}]};
 const a=c.update(room,0),b=c.update(structuredClone(room),1);
 assert.strictEqual(a.staticVertices,b.staticVertices);assert.equal(b.staticChanged,false);
 assert.notDeepEqual(a.movingVertices,b.movingVertices);assert.equal(b.movingChanged,true);
});
test('changing a level receiver invalidates geometry even when its room ID is unchanged',()=>{
 const c=cache(),room={id:1,platforms:[{x:0,z:0,w:1,d:1,h:.5}]};
 const a=c.update(room,0);room.platforms[0].h=1;const b=c.update(room,0);
 assert.notStrictEqual(a.staticVertices,b.staticVertices);assert.equal(b.staticChanged,true);
 assert.notDeepEqual(a.staticVertices,b.staticVertices);
});
