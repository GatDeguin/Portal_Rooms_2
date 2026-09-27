import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomReceiverCache,roomReceivers} from '../src/hand-room.js';
const room={jumpPads:[{x:.3,z:-.5,r:.4}]};
const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-6,`${x} != ${y}`);
function bounds(v){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<v.length;i++) {const k=i%3;min[k]=Math.min(min[k],v[i]);max[k]=Math.max(max[k],v[i]);}return {min,max};}
test('jump pad receiver is a spherical cap above the floor, not a flat disc',()=>{
 const frame=new RoomReceiverCache().update(room,0,[],[]),b=bounds(frame.movingVertices);
 assert.ok(frame.movingVertices.length>1000);assert.deepEqual(frame.staticVertices,roomReceivers({}));close(b.min[0],-.1);close(b.max[0],.7);close(b.min[2],-.9);close(b.max[2],-.1);close(b.min[1],.012);close(b.max[1],.152);
 const R=(.4*.4+.14*.14)/(.28),cy=.152-R;
 for(let i=0;i<frame.movingVertices.length;i+=3){const p=frame.movingVertices.slice(i,i+3);close(Math.hypot(p[0]-.3,p[1]-cy,p[2]+.5),R);}
});
test('pad compression changes cap height while keeping its base and footprint fixed',()=>{
 const cache=new RoomReceiverCache(),neutral=cache.update(room,1,[],[]),compressed=cache.update(room,1,[],[{compression:.5}]),b=bounds(compressed.movingVertices);
 assert.equal(compressed.movingChanged,true);assert.strictEqual(compressed.staticVertices,neutral.staticVertices);close(b.max[1],.082);close(b.min[1],.012);close(b.max[0],.7);close(b.min[2],-.9);
 const repeat=cache.update(structuredClone(room),1,[],[{compression:.5}]);assert.equal(repeat.movingChanged,false);
 const rebound=cache.update(room,1,[],[{compression:-.8}]);close(bounds(rebound.movingVertices).max[1],.173);
});

test('elevated jump pads keep their entire cap above the authored platform height',()=>{
 const frame=new RoomReceiverCache().update({jumpPads:[{x:0,z:0,r:.4,y:.5}]},0,[],[{compression:.5}]),b=bounds(frame.movingVertices);
 close(b.min[1],.512);close(b.max[1],.582);
});
