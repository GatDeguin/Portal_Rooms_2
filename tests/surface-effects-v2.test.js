import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/physics.js';
import {createSurfaceFx,stepSurfaceFx} from '../src/surface-effects.js';
const room={id:999,start:[0,0],target:{type:1,pos:[2.8,2.8]},zones:[{x:0,z:0,r:3,type:1}],cloths:[]};
test('water contact emits bounded finite droplets and expanding ripples, with extra spray when skidding',()=>{
 const make=slip=>({cube:{x:0,y:0,z:0,vx:2,vz:0,grounded:true,slip},surfaceFx:createSurfaceFx()});
 const fast=make(1),straight=make(0);
 for(let i=0;i<2000;i++){stepSurfaceFx(room,fast,1/120);stepSurfaceFx(room,straight,1/120);}
 assert.ok(fast.surfaceFx.particles.length>straight.surfaceFx.particles.length);assert.ok(fast.surfaceFx.particles.length<=96);
 assert.ok(fast.surfaceFx.ripples.length<=24);assert.ok(fast.surfaceFx.ripples.some(r=>r.r>.2));
 assert.ok(fast.surfaceFx.particles.every(p=>[p.x,p.y,p.z,p.vx,p.vy,p.vz,p.life,p.maxLife,p.size].every(Number.isFinite)));
});
test('effects are deterministic, pause with simulation, and reset cleanly',()=>{
 const a=new GameEngine([room]),b=new GameEngine([room]);a.start();b.start();
 for(let i=0;i<100;i++){a.advance(1/60,{x:.6,z:.2});b.advance(1/60,{x:.6,z:.2});}
 assert.deepEqual(a.state.surfaceFx,b.state.surfaceFx);a.pause();const before=structuredClone(a.state.surfaceFx);a.advance(5,{x:1,z:0});assert.deepEqual(a.state.surfaceFx,before);
 a.reset();assert.equal(a.state.surfaceFx.particles.length,0);
});
test('raised cubes never splash in water underneath',()=>{
 const state={cube:{x:0,y:1,z:0,vx:2,vz:0,grounded:true,slip:1},surfaceFx:createSurfaceFx()};
 stepSurfaceFx(room,state,1/60);assert.equal(state.surfaceFx.particles.length,0);
});

test('overlapping sand above water suppresses obsolete water spray',()=>{
 const scene={...room,zones:[{x:0,z:0,r:1,type:1},{x:0,z:0,r:1,type:3}]};
 const state={cube:{x:0,y:0,z:0,vx:2,vz:0,grounded:true,slip:1},surfaceFx:createSurfaceFx()};
 stepSurfaceFx(scene,state,1/60);assert.equal(state.surfaceFx.particles.length,0);assert.equal(state.surfaceFx.lastType,0);
});
