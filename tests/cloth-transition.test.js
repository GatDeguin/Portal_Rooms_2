import test from 'node:test';import assert from 'node:assert/strict';import {dynamicReceivers} from '../src/hand-room.js';
const state={cube:{x:0,y:0,z:0,q:[0,0,0,1]}};
test('cloth shadow receivers follow the animated cube and remove it after disappearance',()=>{
 assert.equal(dynamicReceivers(state,null,false,{scale:0,lift:0,spin:0}).length,0);
 const lifted=dynamicReceivers(state,null,false,{scale:1,lift:1,spin:0});let minY=Infinity;for(let i=1;i<lifted.length;i+=3)minY=Math.min(minY,lifted[i]);assert.ok(minY>1);
});
