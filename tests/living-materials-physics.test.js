import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine,FIXED_STEP,MAX_SPEED} from '../src/physics.js';
const room=(type,patch={})=>({start:[0,0],target:{type:1,pos:[2.8,-2.8]},obstacles:[],platforms:[],ramps:[],jumpPads:[],bumpers:[],zones:type?[{type,x:0,z:0,r:20,dx:1,dz:0}]:[],...patch});
const make=(type,patch)=>{const e=new GameEngine([room(type,patch)]);e.start();return e;};
const run=(e,seconds,input={x:0,z:0},fps=120)=>{for(let i=0;i<Math.round(seconds*fps);i++)e.advance(1/fps,input);return e.state.cube;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('shallow water slips more than dry floor but hydrodynamic drag increases with speed',()=>{
 const coast=(type,v)=>{const e=make(type);e.state.cube.vx=v;return run(e,.2).vx/v;};
 assert.ok(coast(1,2)>coast(0,2));assert.ok(coast(1,5)<coast(1,1));
 const e=make(1);run(e,.5);assert.ok(e.state.cube.wetness>.7);
});
test('slime holds against tiny tilts, yields to a deliberate tilt and leaves temporary tack',()=>{
 const e=make(2,{zones:[{type:2,x:0,z:0,r:.6}]});run(e,.6);const x=e.state.cube.x;
 run(e,1,{x:.035,z:0});assert.ok(Math.abs(e.state.cube.x-x)<.005,'static adhesion must hold');
 run(e,3,{x:1,z:0});assert.ok(e.state.cube.x>.8,'slime must remain escapable');
 e.reset();e.start();run(e,.5);const coated=e.state.cube.slime;assert.ok(coated>.7);
 e.state.cube.x=2;run(e,.1);assert.ok(e.state.cube.slime>0&&e.state.cube.slime<coated);run(e,3);assert.ok(e.state.cube.slime<.001);
});
test('slime absorbs sliding energy faster than dry floor and water',()=>{
 const speed=type=>{const e=make(type);e.state.cube.vx=2;return run(e,.5).vx;};assert.ok(speed(2)<speed(0)*.5);assert.ok(speed(0)<speed(1));
});
test('moving sand entrains the cube to a finite current and damps cross-current slip',()=>{
 const e=make(3,{start:[-2.5,0]});run(e,2);assert.ok(e.state.cube.vx>1.5&&e.state.cube.vx<2.5);
 const sideways=make(3);sideways.state.cube.vz=1;run(sideways,.5);assert.ok(sideways.state.cube.vz<.5);
 const reverse=make(3);run(reverse,1,{x:-1,z:0});assert.ok(reverse.state.cube.vx<0,'player can oppose sand current');
});
test('each sand patch uses its own current and zero-length flow stays finite',()=>{
 const e=make(3,{zones:[{type:3,x:0,z:0,r:1,dx:0,dz:-1,flowSpeed:1.4}]});run(e,.5);assert.ok(e.state.cube.vz<-.5);near(e.state.cube.vx,0);
 const z=make(3,{zones:[{type:3,x:0,z:0,r:1,dx:0,dz:0}]});run(z,.5);assert.ok([z.state.cube.vx,z.state.cube.vz].every(Number.isFinite));
});
test('ground liquids and sand cannot pull an airborne cube or one on a raised platform',()=>{
 for(const type of [1,2,3]){
  const air=make(type),dry=make(0);for(const e of [air,dry])Object.assign(e.state.cube,{y:1,grounded:false,vx:1});run(air,.1);run(dry,.1);near(air.state.cube.vx,dry.state.cube.vx);near(air.state.cube.vz,dry.state.cube.vz);
  const up=make(type,{platforms:[{x:0,z:0,w:2,d:2,h:.6}]});run(up,.4);near(up.state.cube.x,0);near(up.state.cube.z,0);assert.equal(up.state.surface,'platform');
 }
});
test('water coating dries gradually after contact ends',()=>{
 const e=make(1,{zones:[{type:1,x:0,z:0,r:.6}]});run(e,.5);e.state.cube.x=2;const wet=e.state.cube.wetness;run(e,.1);assert.ok(e.state.cube.wetness>0&&e.state.cube.wetness<wet);run(e,4);assert.ok(e.state.cube.wetness<.001);
});
test('gelatin bumper compresses along impact, removes tangential energy and settles',()=>{
 const e=make(0,{start:[.52,0],bumpers:[{x:0,z:0,r:.3,strength:4.2}]});Object.assign(e.state.cube,{vx:-2,vz:1});e.advance(FIXED_STEP);
 const j=e.state.bumperJelly?.[0];assert.ok(j?.compression>.02);assert.ok(j.axisX>.9);assert.ok(e.state.cube.vx>0);assert.ok(Math.abs(e.state.cube.vz)<.9);assert.ok(Math.hypot(e.state.cube.vx,e.state.cube.vz)<=MAX_SPEED);
 Object.assign(e.state.cube,{x:2,z:2,vx:0,vz:0});run(e,2);assert.ok(Math.abs(j.compression)<.001&&Math.abs(j.velocity)<.01);
});
test('new material state freezes on pause and resets cleanly for a new attempt',()=>{
 const e=make(2);run(e,.3);e.pause();const before=structuredClone(e.state);e.advance(10,{x:1,z:1});assert.deepEqual(e.state,before);e.reset();assert.equal(e.state.cube.slime,0);assert.equal(e.state.cube.wetness,0);
});
for(const type of [1,2,3])test(`material ${type} agrees across render frame rates`,()=>{
 const results=[10,30,60,120,144].map(fps=>{const e=make(type);run(e,2,{x:.35,z:.13},fps);return e.state;});for(const s of results){near(s.cube.x,results[0].cube.x);near(s.cube.z,results[0].cube.z);near(s.cube.wetness,results[0].cube.wetness);near(s.cube.slime,results[0].cube.slime);}
});

for(const flowSpeed of [2.4,4])test('sand remains escapable with soft gravity at flow '+flowSpeed,()=>{
 const e=new GameEngine([room(3,{zones:[{type:3,x:0,z:0,r:20,dx:1,dz:0,flowSpeed}]})],{strongGravity:false});e.start();run(e,2,{x:-1,z:0});assert.ok(e.state.cube.vx<-.1&&e.state.cube.x<-.1);
});
