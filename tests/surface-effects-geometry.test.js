import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceEffectsGeometry,hasSurfaceEffects} from '../src/surface-effects-geometry.js';
const cube={x:0,y:0,z:0,q:[0,0,0,1],size:.48,slime:0,wetness:0};
const state=fx=>({cube:{...cube},surfaceFx:fx});
const particle=(type=1)=>({x:.3,y:.5,z:-.4,vx:0,vy:3,vz:0,size:.04,life:.8,maxLife:1,type});
function bounds(v){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<v.length;i+=8)for(let k=0;k<3;k++){min[k]=Math.min(min[k],v[i+k]);max[k]=Math.max(max[k],v[i+k]);}return {min,max};}
test('water splash particles produce finite volumetric droplets with normals and velocity stretch',()=>{
 const batches=surfaceEffectsGeometry(state({particles:[particle()]})),b=batches.find(b=>b.kind===1);assert.ok(b.vertices.length>=32*3*8);const box=bounds(b.vertices);
 assert.ok(box.max[1]-box.min[1]>(box.max[0]-box.min[0])*1.3);assert.ok(box.max[2]-box.min[2]>.07);
 for(let i=0;i<b.vertices.length;i+=8){assert.ok(Math.abs(Math.hypot(...b.vertices.slice(i+3,i+6))-1)<1e-5);assert.ok(b.vertices[i+6]>0&&b.vertices[i+6]<=1);}
});
test('ripples are world-space rings above the ground and fade using the presented lifetime',()=>{
 const s=state({ripples:[{x:1,z:2,y:.025,r:.4,life:.6,maxLife:1,type:1}]}),a=surfaceEffectsGeometry(s).find(b=>b.kind===3),box=bounds(a.vertices);
 assert.ok(box.min[0]<.61&&box.max[0]>1.39);assert.ok(box.min[2]<1.61&&box.max[2]>2.39);assert.equal(box.min[1],box.max[1]);assert.ok(Math.abs(box.min[1]-.025)<1e-6);
 s.surfaceFx.ripples[0].life=.1;const b=surfaceEffectsGeometry(s).find(b=>b.kind===3);assert.ok(b.vertices[6]<a.vertices[6]);
});
test('sticky gel generates thick globules and strands from the floor anchor to the cube',()=>{
 const s=state({stretch:{x:-.9,z:.4,strength:1}});s.cube.slime=.8;
 const b=surfaceEffectsGeometry(s).find(b=>b.kind===2),box=bounds(b.vertices);
 assert.ok(box.min[0]<-.85,'strands reach the absolute anchor');assert.ok(box.max[0]>.2,'gel coats the cube rim');assert.ok(box.max[1]>.2);assert.ok(box.min[1]>=.01);
 const low=surfaceEffectsGeometry(s,{reduced:true});assert.ok(low.reduce((n,b)=>n+b.vertices.length,0)<b.vertices.length);
});
test('effect geometry has a bounded budget and discards expired or nonfinite emissions',()=>{
 const a=surfaceEffectsGeometry(state({particles:Array.from({length:500},()=>particle())})),b=surfaceEffectsGeometry(state({particles:Array.from({length:96},()=>particle())}));
 assert.equal(a.reduce((n,b)=>n+b.vertices.length,0),b.reduce((n,b)=>n+b.vertices.length,0));
 assert.deepEqual(surfaceEffectsGeometry(state({particles:[{...particle(),life:0},{...particle(),x:NaN}]})),[]);
 assert.deepEqual(surfaceEffectsGeometry(state({particles:[particle()]}),{enabled:false}),[]);
});
test('effects without curtains remain visible but do not animate from wall-clock time',()=>{
 const s=state({particles:[particle(2)]});assert.equal(hasSurfaceEffects(s),true);assert.equal(hasSurfaceEffects(state({particles:[],ripples:[]})),false);
 const copy=structuredClone(s),a=surfaceEffectsGeometry(s),b=surfaceEffectsGeometry(s);assert.deepEqual(a,b);assert.deepEqual(s,copy);
});

import {SurfaceEffectsCache} from '../src/surface-effects-geometry.js';
test('unchanged presented frames reuse effect geometry while a new physics tick refreshes it',()=>{
 const cache=new SurfaceEffectsCache(),s={...state({particles:[particle()]}),time:1};
 const a=cache.update(s),b=cache.update(s);assert.equal(b.changed,false);assert.strictEqual(a.batches,b.batches);
 s.time+=1/120;s.surfaceFx.particles[0].y+=.1;const c=cache.update(s);assert.equal(c.changed,true);assert.notDeepEqual(c.batches,a.batches);
 const d=cache.update(s,{enabled:false});assert.deepEqual(d.batches,[]);
});

test('sticky coating has visible contact lobes while leaving the upper cube exposed',()=>{
 const s=state({});s.cube.slime=1;const b=surfaceEffectsGeometry(s).find(b=>b.kind===2),box=bounds(b.vertices);
 assert.ok(box.max[0]>.36&&box.min[0]<-.36,'gel forms a substantial lower rim');assert.ok(box.max[1]>.25&&box.max[1]<.4,'lobes climb the sides but leave the top visible');
});
test('attached gel follows the visible cube center and disappearance during transitions',()=>{
 const s=state({});s.cube.slime=1;const raw=surfaceEffectsGeometry(s).find(b=>b.kind===2),b=bounds(raw.vertices);assert.ok(Math.abs((b.max[1]+b.min[1])/2-.16925)<1e-6);
 const raised=surfaceEffectsGeometry(s,{transition:{scale:.5,lift:.4,spin:0}}).find(b=>b.kind===2),a=bounds(raised.vertices);
 assert.ok(a.min[1]>.5,'coating rises with the entering cube');assert.ok(a.max[0]<b.max[0]*.6,'coating shrinks with the cube');
 assert.deepEqual(surfaceEffectsGeometry(s,{transition:{scale:0,lift:.4,spin:0}}),[]);
});
