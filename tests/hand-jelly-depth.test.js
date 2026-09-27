import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomReceiverCache,roomReceivers} from '../src/hand-room.js';

const bumper={x:.8,z:-.7,r:.5,h:.4};
const room={id:99,bumpers:[bumper]};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
function bounds(vertices,project=([x,y,z])=>[x,y,z]){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<vertices.length;i+=3){const p=project(Array.from(vertices.slice(i,i+3)));for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}
 return {min,max};
}
test('neutral jelly receivers retain the authored cylinder with no rigid duplicate in static cache',()=>{
 const empty=roomReceivers({}),authored=roomReceivers(room).slice(empty.length),cache=new RoomReceiverCache();
 const frame=cache.update(room,0,[{compression:0,axisX:3,axisZ:4}]);
 assert.deepEqual(frame.staticVertices,empty,'the static cache cannot retain a second rigid bumper');
 assert.deepEqual(frame.movingVertices,authored,'neutral geometry is byte-identical to the authored cylinder');
 assert.equal(frame.movingVertices.length,1296);
 const box=bounds(frame.movingVertices);close(box.min[0],.3);close(box.max[0],1.3);close(box.min[1],0);close(box.max[1],.4);close(box.min[2],-1.2);close(box.max[2],-.2);
});
test('compressed receiver uses normalized impact axes, directional extents and a planted base',()=>{
 const frame=new RoomReceiverCache().update(room,1,[{compression:.2,axisX:3,axisZ:4}]);
 assert.equal(frame.movingVertices.length,1296);
 const local=bounds(frame.movingVertices,([x,y,z])=>[(x-.8)*.6+(z+.7)*.8,y,-(x-.8)*.8+(z+.7)*.6]);
 close(local.min[0],-.42);close(local.max[0],.42);close(local.min[1],0);close(local.max[1],.44);close(local.min[2],-.54);close(local.max[2],.54);
 // At theta=0 the top rim follows the normalized impact axis, not world X.
 close(frame.movingVertices[3],1.052);close(frame.movingVertices[4],.44);close(frame.movingVertices[5],-.364);
});
test('receiver cache refreshes a changed jelly snapshot even while its time is unchanged',()=>{
 const cache=new RoomReceiverCache(),a=cache.update(room,2,[{compression:0}]),b=cache.update(structuredClone(room),2,[{compression:.2,axisX:1,axisZ:0}]);
 assert.equal(b.staticChanged,false);assert.strictEqual(a.staticVertices,b.staticVertices);assert.equal(b.movingChanged,true);assert.notDeepEqual(a.movingVertices,b.movingVertices);
 const c=cache.update(structuredClone(room),2,[{compression:.2,axisX:1,axisZ:0}]);assert.equal(c.movingChanged,false);assert.strictEqual(b.movingVertices,c.movingVertices);
 const d=cache.update(room,2,[{compression:.2,axisX:0,axisZ:1}]);assert.equal(d.movingChanged,true);
 const box=bounds(d.movingVertices);close(box.min[0],.26);close(box.max[0],1.34);close(box.min[2],-1.12);close(box.max[2],-.28);
});
test('rebound and absent jelly snapshots use the same bounded scales and neutral fallback as rendering',()=>{
 const cache=new RoomReceiverCache(),neutral=cache.update(room).movingVertices;
 const tiny=cache.update(room,0,[{compression:.000001,axisX:0,axisZ:1}]);assert.deepEqual(tiny.movingVertices,neutral);
 const b=cache.update(room,0,[{compression:-.9,axisX:0,axisZ:0}]),box=bounds(b.movingVertices);
 close(box.min[0],.282);close(box.max[0],1.318);close(box.min[1],0);close(box.max[1],.391);close(box.min[2],-1.191);close(box.max[2],-.209);
 const c=cache.update(room,0,[{compression:4}]),high=bounds(c.movingVertices);close(high.max[0],1.196);close(high.max[1],.452);close(high.max[2],-.148);
});
