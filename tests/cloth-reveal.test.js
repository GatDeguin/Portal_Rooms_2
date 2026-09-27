import {MASTERY_LEVELS} from '../src/levels-mastery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';
import {ClothSystem} from '../src/cloth-physics.js';
import {clothsForRoom} from '../src/cloth-layout.js';
import {cameraForHands} from '../src/hand-view.js';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
function hidden(frames,target,origin){
 const direction=sub(target,origin);
 for(const f of frames)for(let i=0;i<f.indices.length;i+=3){
  const p=n=>Array.from(f.positions.slice(n*3,n*3+3)),a=p(f.indices[i]),b=p(f.indices[i+1]),c=p(f.indices[i+2]),e1=sub(b,a),e2=sub(c,a),h=cross(direction,e2),det=dot(e1,h);
  if(Math.abs(det)<1e-9)continue;const s=sub(origin,a),u=dot(s,h)/det;if(u<0||u>1)continue;const q=cross(s,e1),v=dot(direction,q)/det;if(v<0||u+v>1)continue;const t=dot(e2,q)/det;if(t>0&&t<1)return true;
 }
 return false;
}
const camera=(room,width=1200,height=800)=>cameraForHands({cube:{x:room.start[0],y:0,z:room.start[1],q:[0,0,0,1]},time:0,gravity:{x:0,z:0},shake:0},{dynamicCamera:false},{width,height}).origin;
test('room 6 has two grounded curtains that hide the actual green goal from landscape and portrait cameras',()=>{
 const room=LEVELS[5],defs=clothsForRoom(room),frames=new ClothSystem(room).snapshot();
 assert.equal(frames.length,2);
 for(const def of defs)assert.ok(def.top-def.height<=.02,'hem reaches the floor');
 for(const origin of [camera(room),camera(room,390,844)])for(const [dx,dz] of [[0,0],[-.36,0],[.36,0],[0,-.35],[0,.35]])assert.ok(hidden(frames,[2.05+dx,.055,-1.75+dz],origin),'goal footprint is behind the curtains');
 assert.equal(frames.filter(f=>f.supports?.[0]).length+frames.filter(f=>f.supports?.[1]).length,2,'only the outside posts support the shared rail');
});
test('a moving cube parts the room 6 curtains to expose the goal without being repositioned',()=>{
 const room=LEVELS[5],s=new ClothSystem(room),origin=camera(room),target=[2.05,.055,-1.75],cube={x:1.83,y:0,z:-.35,size:.48,q:[0,0,0,1],vx:0,vy:0,vz:-1.6};
 assert.ok(hidden(s.snapshot(),target,origin));let exposed=false;
 for(let i=0;i<180;i++){
  cube.z=-.35-i*.009;const z=cube.z;s.step(1/120,{cube,time:i/120});assert.equal(cube.z,z);
  if(!hidden(s.snapshot(),target,origin))exposed=true;
 }
 assert.ok(exposed,'pushing through fabric must reveal the real goal');
});
test('curtain definitions preserve reveal purpose and raised support feet for authored level fixtures',()=>{
 const s=new ClothSystem({id:55,cloths:[{id:'curtain',x:0,z:0,top:1.5,height:1,width:1.4,baseY:.5,supports:[true,false],reveal:{kind:'jump',index:0}}]});
 const f=s.snapshot()[0];assert.deepEqual(f.reveal,{kind:'jump',index:0});assert.equal(f.baseY,.5);assert.deepEqual(f.supports,[true,false]);
});

import {EXPANSION_LEVELS} from '../src/levels-expansion.js';
test('every shipped curtain hides its named gameplay object rather than an empty part of the room',()=>{
 for(const room of [...LEVELS,...EXPANSION_LEVELS,...MASTERY_LEVELS]){
  const frames=new ClothSystem(room).snapshot();
  for(const f of frames){
   if(!f.reveal)continue;
   const reveal=f.reveal,target=room.sequence?.[reveal.index??0]??room.target;
   let point;
   if(reveal.kind==='jump'){const p=room.jumpPads[reveal.index??0];point=[p.x,(p.y??0)+.14,p.z];}
   else if(reveal.kind==='bumper'){const b=room.bumpers[reveal.index??0];point=[b.x,(b.h??.34)/2,b.z];}
   else if(reveal.kind==='portal')point=[target.pos[0],(target.y??0)+.74,-3.185];
   else point=[target.pos[0],(target.y??0)+.055,target.pos[1]];
   assert.ok(hidden(frames,point,camera(room)),`room ${room.id} does not hide ${reveal.kind}`);
  }
 }
});
