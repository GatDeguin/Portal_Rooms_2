import test from 'node:test';
import assert from 'node:assert/strict';
import {footprint,containsFootprint,signedDistance} from '../src/shapes.js';
import {surfaceResponse,createJumpJelly,stepJumpJelly,impactJumpJelly} from '../src/surface-physics.js';
import {GameEngine} from '../src/physics.js';
const floor={kind:'wood',height:0};
const room=type=>({id:999,start:[0,0],target:{type:1,pos:[2.7,2.7]},zones:[{type,x:0,z:0,shape:'rect',w:5,d:5}],obstacles:[],ramps:[],platforms:[],jumpPads:[],bumpers:[],cloths:[]});
const state=(vx=0,vz=0)=>({cube:{x:0,z:0,y:0,vx,vz,grounded:true,wetness:0,slime:0}});
test('same rounded footprint supports rectangles, capsules, rotation and legacy circles',()=>{
 assert.equal(containsFootprint({x:0,z:0,r:1},.71,.71),false);
 assert.equal(containsFootprint({x:0,z:0,shape:'rect',w:4,d:1},1.8,.3),true);
 const capsule={x:0,z:0,shape:'capsule',w:4,d:1,angle:Math.PI/2};
 assert.equal(containsFootprint(capsule,0,1.8),true);assert.equal(containsFootprint(capsule,.8,0),false);
 assert.ok(Math.abs(signedDistance({x:0,z:0,r:1},2,0)-1)<1e-8);
 assert.deepEqual(footprint({r:.6}),{halfW:.6,halfD:.6,corner:.6,angle:0});
});
test('water loses sideways grip while reversing still brakes and can turn',()=>{
 const s=state(2.5,0),r=surfaceResponse(room(1),s,floor,1/120,0,5.7);
 assert.ok(r.az>1&&r.az<4,'lateral response is reduced at speed');assert.ok(s.cube.slip>.3);
 const reverse=surfaceResponse(room(1),s,floor,1/120,-5.7,0);assert.ok(reverse.ax< -2);
});
test('slime develops elastic memory and dissipates at rest without reversing',()=>{
 const s=state(1.5,0);surfaceResponse(room(2),s,floor,.08,0,0);s.cube.x+=.2;
 const r=surfaceResponse(room(2),s,floor,.08,0,0);
 assert.ok(r.ax<0,'gel stretches back toward contact');assert.ok(r.adhesion>.3);assert.ok(r.friction>3.5);
});
test('even weak gravity can pull free of sticky gel',()=>{
 const e=new GameEngine([room(2)],{strongGravity:false});e.start();
 for(let n=0;n<2400;n++)e.advance(1/120,{x:1,z:0});
 assert.ok(e.state.cube.x>2.6,'intentional continuous tilt leaves the gel');
});
test('rubber launch spring compresses, overshoots then settles with identical fixed steps',()=>{
 const j=createJumpJelly({jumpPads:[{}]});impactJumpJelly(j[0],3);assert.ok(j[0].compression>.1);
 let overshoot=false;for(let n=0;n<720;n++){stepJumpJelly(j,1/120);overshoot ||= j[0].compression<0;}
 assert.ok(overshoot);assert.ok(Math.abs(j[0].compression)<.001);assert.ok(Math.abs(j[0].velocity)<.001);
});
