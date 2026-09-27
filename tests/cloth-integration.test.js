import test from 'node:test';import assert from 'node:assert/strict';
import {GameEngine} from '../src/physics.js';import {HandGameEngine} from '../src/hand-physics.js';import {dynamicReceivers} from '../src/hand-room.js';
const room={id:1,start:[0,1.5],target:{type:1,pos:[2.5,-2.5]},obstacles:[],platforms:[],ramps:[],zones:[],bumpers:[],jumpPads:[]};
test('cloth integrates on the game fixed clock and pauses without debt',()=>{
 const e=new GameEngine([room]);assert.ok(e.state.cloths?.length>0);const initial=structuredClone(e.state.cloths);e.start();for(let i=0;i<30;i++)e.advance(1/60);assert.notDeepEqual(e.state.cloths,initial);
 e.pause();const before=structuredClone(e.state);e.advance(5);assert.deepEqual(e.state,before);e.reset();assert.deepEqual(e.state.cloths,initial);
});
test('the cloth solver receives hands after the hand step and publishes a serializable snapshot',()=>{
 const e=new HandGameEngine([room]);let received;e.clothSystem={step(dt,data){received={dt,...data};},snapshot(){return [{id:'probe',positions:new Float32Array([1,2,3])}];}};
 e.start();const hand={id:'test',palm:{x:1,y:1,z:1},points:[],pinch:{active:false}};e.advance(1/120,{x:0,z:0,hands:[hand]});assert.strictEqual(received.hands[0],hand);assert.strictEqual(received.cube,e.state.cube);assert.equal(e.state.cloths[0].id,'probe');assert.deepEqual(structuredClone(e.state.cloths),e.state.cloths);
});
test('hand depth receivers include cloth triangles so hidden hands and their shadows respect fabric',()=>{
 const state={cube:{x:0,y:0,z:0,q:[0,0,0,1]}},before=dynamicReceivers(state,null);
 state.cloths=[{positions:new Float32Array([0,1,0,1,1,0,0,2,0]),indices:new Uint16Array([0,1,2])}];const after=dynamicReceivers(state,null);assert.equal(after.length,before.length+9);assert.deepEqual(Array.from(after.slice(-9)),[0,1,0,1,1,0,0,2,0]);
});
