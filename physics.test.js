import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine,FIXED_STEP,MAX_SPEED,restitution} from '../src/physics.js';
import {LEVELS} from '../src/levels.js';
import {rampHeight,movingAt,activeTarget,sweepBox} from '../src/geometry.js';
const room=patch=>({start:[-2,0],target:{type:1,pos:[2.7,-2.7]},obstacles:[],zones:[],platforms:[],ramps:[],jumpPads:[],bumpers:[],...patch});
const run=(engine,seconds,input={x:0,z:0},fps=120)=>{for(let i=0;i<Math.round(seconds*fps);i++)engine.advance(1/fps,input);};
const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
test('fixed physics agrees at 10, 30, 60, 120 and 144 rendered FPS',()=>{const results=[10,30,60,120,144].map(fps=>{const e=new GameEngine([room({})]);e.start();run(e,2,{x:.45,z:-.3},fps);return e.state;});for(const s of results){assert.equal(s.steps,240);near(s.cube.x,results[0].cube.x);near(s.cube.z,results[0].cube.z);near(s.elapsed,2);}});
test('paused clock freezes moving obstacles and resumes without accumulated debt',()=>{const e=new GameEngine([room({obstacles:[{x:0,z:0,w:.4,d:1,move:{axis:'z',amp:.5,speed:1}}]})]);e.start();run(e,.2);e.pause();const before=structuredClone(e.state);e.advance(100,{x:1,z:1});assert.deepEqual(e.state,before);e.start();e.advance(FIXED_STEP);near(e.state.time,before.time+FIXED_STEP);});
test('corner sweep produces both contact normals',()=>{const hit=sweepBox({x:-1,z:-1},{x:2,z:2},{x:0,z:0,w:.4,d:.4},.24);assert.ok(hit);assert.equal(hit.nx,-1);assert.equal(hit.nz,-1);});
test('a fast cube cannot tunnel through a 0.02-unit wall',()=>{const e=new GameEngine([room({obstacles:[{x:0,z:0,w:.02,d:6.4}]})]);e.start();e.state.cube.vx=100;run(e,3,{x:1,z:0});assert.ok(e.state.cube.x<=-.25+1e-5);assert.ok(e.state.cube.y<.01);});
test('ice conserves more momentum than wood, while viscous floor removes more',()=>{const speed=type=>{const e=new GameEngine([room({zones:type?[{type,x:-2,z:0,r:5}]:[]})]);e.start();e.state.cube.vz=2;run(e,.5);return Math.abs(e.state.cube.vz);};const ice=speed(1),wood=speed(0),brake=speed(2);assert.ok(ice>wood);assert.ok(wood>brake);});
test('faster impact has a different but bounded restitution',()=>{assert.ok(restitution(4)>restitution(.5));assert.ok(restitution(100)<=.46);});
test('walking up a joined ramp reaches the platform without teleporting',()=>{const e=new GameEngine([room({start:[-1.25,0],ramps:[{x:0,z:0,w:2,d:1,h:.6,dx:1,dz:0}],platforms:[{x:1.5,z:0,w:1,d:1,h:.6}]})]);e.start();let old=e.state.cube.y;for(let i=0;i<1500&&e.state.cube.x<1.3;i++){e.advance(FIXED_STEP,{x:.18,z:0});assert.ok(e.state.cube.y-old<=.09+1e-6);old=e.state.cube.y;}assert.ok(e.state.cube.x>=1.3,`ramp stalled at ${e.state.cube.x}`);near(e.state.cube.y,.6);});
test('a tall platform cannot be mounted directly from the side',()=>{const e=new GameEngine([room({start:[-1.5,0],platforms:[{x:0,z:0,w:1,d:1,h:.7}]})]);e.start();run(e,3,{x:1,z:0});assert.ok(e.state.cube.x<-.73);near(e.state.cube.y,0);});
test('an airborne cube lands on the platform instead of the floor beneath it',()=>{const e=new GameEngine([room({start:[0,0],platforms:[{x:0,z:0,w:1,d:1,h:.62}]})]);Object.assign(e.state.cube,{y:1.1,vy:-1,grounded:false,support:-1});e.start();run(e,.7);near(e.state.cube.y,.62);assert.equal(e.state.cube.support,0);assert.equal(e.state.cube.grounded,true);});
test('platform carries a resting cube by exactly its own displacement',()=>{const p={x:0,z:0,w:2,d:2,h:.6,move:{axis:'x',amp:.5,speed:1,phase:0}};const e=new GameEngine([room({start:[0,0],platforms:[p]})]);e.start();run(e,1);near(e.state.cube.x,movingAt(p,1).x);near(e.state.cube.y,.6);});
test('room 18 target stays attached to the moving platform',()=>{const l=LEVELS[17];for(const time of [0,.5,2,5]){const t=activeTarget(l,0,time),p=movingAt(l.platforms[0],time);near(t.pos[0],p.x);near(t.pos[1],p.z);}});
test('air control is weaker than ground control',()=>{const a=new GameEngine([room({})]),b=new GameEngine([room({})]);Object.assign(a.state.cube,{y:1,grounded:false,support:-1});a.start();b.start();a.advance(FIXED_STEP,{x:1,z:0});b.advance(FIXED_STEP,{x:1,z:0});assert.ok(a.state.cube.vx<b.state.cube.vx*.5);});
test('bumper center hit produces finite, bounded escape velocity',()=>{const e=new GameEngine([room({start:[0,0],bumpers:[{x:0,z:0,r:.3,strength:999}]})]);e.start();e.advance(FIXED_STEP);const c=e.state.cube;assert.ok([c.x,c.z,c.vx,c.vz].every(Number.isFinite));assert.ok(Math.hypot(c.x,c.z)>=.54);assert.ok(Math.hypot(c.vx,c.vz)<=MAX_SPEED);});
test('bumper cooldown prevents energy stacking inside one contact',()=>{const e=new GameEngine([room({start:[0,0],bumpers:[{x:0,z:0,r:.3,strength:5}]})]);e.start();e.advance(FIXED_STEP);const until=e.state.bumperCooldowns[0];Object.assign(e.state.cube,{x:0,z:0});e.advance(FIXED_STEP);assert.equal(e.state.bumperCooldowns[0],until);});
test('stability target cannot be charged from underneath a raised platform',()=>{const e=new GameEngine([room({start:[0,0],target:{type:3,pos:[0,0],y:.7}})]);e.start();run(e,2);assert.equal(e.state.solved,false);assert.equal(e.state.cube.hold,0);});
test('a portal uses its configured position rather than a hardcoded back-wall coordinate',()=>{const e=new GameEngine([room({start:[0,0],target:{type:4,pos:[0,0]}})]);e.start();e.advance(FIXED_STEP);assert.equal(e.state.solved,true);});
test('last-room fourth platform and raised stair bases are present',()=>{assert.equal(LEVELS[21].platforms.length,4);assert.equal(LEVELS[19].ramps[1].base,.32);assert.equal(LEVELS[19].ramps[2].base,.55);});
test('final jump has enough theoretical height to reach the elevated portal',()=>{const l=LEVELS[21],pad=l.jumpPads[0];assert.ok((pad.y??0)+pad.power**2/(2*6.8)>l.sequence.at(-1).y);});
test('all vertical ramps reach the declared base and top at their axis endpoints',()=>{for(const l of LEVELS)for(const r of l.ramps){const ux=Math.sign(r.dx),uz=Math.sign(r.dz);near(rampHeight(r,r.x-ux*r.w/2,r.z-uz*r.d/2),r.base??0);near(rampHeight(r,r.x+ux*r.w/2,r.z+uz*r.d/2),r.h);}});
for(const [index,l] of LEVELS.entries())test(`room ${index+1}: definitions, finite physics and target sequence regression`,()=>{
  assert.equal(l.id,index+1);assert.ok(l.name&&l.hint&&l.objective);assert.ok(l.start.every(Number.isFinite));for(const shape of [...l.obstacles,...l.ramps,...l.platforms])assert.ok(shape.w>0&&shape.d>0);
  const e=new GameEngine(LEVELS);e.reset(index);e.start();for(let i=0;i<360;i++){e.advance(FIXED_STEP,{x:Math.sin(i*.037),z:Math.cos(i*.051)});const c=e.state.cube;assert.ok([c.x,c.y,c.z,c.vx,c.vy,c.vz,...c.q].every(Number.isFinite));assert.ok(Math.abs(c.x)<=2.96001&&Math.abs(c.z)<=2.96001);assert.ok(c.y>=-1e-5);}
  // Rule verification, not a completed human playthrough of the room.
  e.reset(index);e.state.elapsed=2;for(let step=0;step<(l.sequence?.length??1);step++){const t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true,hold:0});e.checkTarget(.6);if(step<(l.sequence?.length??1)-1)assert.equal(e.state.seq,step+1);}assert.equal(e.state.solved,true);assert.equal(e.active,false);
});
test('elevated ice applies at its own height rather than on the floor underneath',()=>{
  const elevated=room({start:[0,0],platforms:[{x:0,z:0,w:4,d:4,h:.6}],zones:[{type:1,x:0,z:0,y:.6,r:2}]});
  const e=new GameEngine([elevated]);e.start();run(e,.1);assert.equal(e.state.surface,'ice');
  const lower=new GameEngine([room({start:[0,0],zones:[{type:1,x:0,z:0,y:.6,r:2}]})]);lower.start();run(lower,.1);assert.notEqual(lower.state.surface,'ice');
});
