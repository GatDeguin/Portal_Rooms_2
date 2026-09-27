import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';

// Record the real renderer's WebGL boundary; Node cannot create a GPU context.
function fixture(){
  const uniforms={},gl=new Proxy({}, {get:(_,key)=>{
    if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
    if(key==='getExtension')return ()=>null;
    if(key==='getParameter')return ()=>[8192,8192];
    if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
    if(key==='getUniformLocation')return (_,name)=>name;
    if(key==='getAttribLocation')return ()=>0;
    if(key.startsWith('uniform'))return (name,...values)=>{uniforms[name]=values;};
    if(key.startsWith('create'))return ()=>({});
    if(key===key.toUpperCase())return 1;
    return ()=>{};
  }});
  const canvas={width:640,height:360,clientWidth:640,clientHeight:360,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
  const renderer=new Renderer(canvas,{quality:'low'});renderer.externallyTimed=true;
  const source=new GameEngine(),engine={state:structuredClone(source.state),room:structuredClone(source.room),target:structuredClone(source.target)};
  return {renderer,engine,uniforms};
}
test('each sand patch uploads its own normalized current, including default speed and empty slots',()=>{
  const {renderer,engine,uniforms}=fixture();
  engine.room.zones=[{type:3,x:-1,z:0,r:.7,dx:3,dz:4,flowSpeed:1.5},{type:1,x:0,z:1,r:.6},{type:3,x:1,z:0,r:.5,dx:0,dz:-2}];
  renderer.draw(engine,{});
  assert.deepEqual(uniforms.uZoneFlow0,[.6,.8,1.5,0]);
  assert.deepEqual(uniforms.uZoneFlow1,[0,0,0,0]);
  assert.deepEqual(uniforms.uZoneFlow2,[0,-1,2.4,0]);
  assert.deepEqual(uniforms.uZoneFlow7,[0,0,0,0]);
});
test('cube film and jelly impacts reach the GPU without changing simulation state',()=>{
  const {renderer,engine,uniforms}=fixture();
  Object.assign(engine.state.cube,{wetness:.8,slime:.45,vx:1.2,vz:-.6,y:0,grounded:true});
  engine.room.bumpers=[{x:0,z:0,r:.34}];
  engine.state.bumperJelly=[{compression:.2,velocity:-.7,axisX:0,axisZ:-3}];
  const before=structuredClone(engine);renderer.draw(engine,{});
  assert.deepEqual(uniforms.uCubeVelocity,[1.2,-.6]);
  assert.deepEqual(uniforms.uSurfaceContact,[.8,.45,1,0]);
  assert.deepEqual(uniforms.uBumpFx0,[.2,-.7,0,-1]);
  assert.deepEqual(engine,before);
});
test('floor ripples stop under airborne, elevated, and presentation-lifted cubes while film remains',()=>{
  const {renderer,engine,uniforms}=fixture();
  Object.assign(engine.state.cube,{wetness:.9,slime:.3,y:0,grounded:false});
  renderer.draw(engine,{});assert.deepEqual(uniforms.uSurfaceContact,[.9,.3,0,0]);
  Object.assign(engine.state.cube,{y:.6,grounded:true});
  renderer.draw(engine,{});assert.equal(uniforms.uSurfaceContact[2],0);
  engine.state.cube.y=0;engine.transition={scale:1,lift:.3,energy:.6,clock:1};
  renderer.draw(engine,{effects:true});assert.equal(uniforms.uSurfaceContact[2],0);
});
test('changing rooms clears old currents and jelly states; legacy snapshots remain dry and rigid',()=>{
  const {renderer,engine,uniforms}=fixture();
  engine.room.zones=[{type:3,x:0,z:0,r:1,dx:-1,dz:0}];engine.room.bumpers=[{x:0,z:0,r:.34}];
  engine.state.bumperJelly=[{compression:.15,velocity:.4,axisX:1,axisZ:0}];
  renderer.draw(engine,{});
  engine.room.zones=[];engine.room.bumpers=[];delete engine.state.bumperJelly;
  delete engine.state.cube.wetness;delete engine.state.cube.slime;
  renderer.draw(engine,{});
  assert.deepEqual(uniforms.uZoneFlow0,[0,0,0,0]);
  assert.deepEqual(uniforms.uBumpFx0,[0,0,0,0]);
  assert.deepEqual(uniforms.uSurfaceContact.slice(0,2),[0,0]);
});
test('reduced effects retain the physical flow and bounded deformation instead of removing gameplay cues',()=>{
  const {renderer,engine,uniforms}=fixture();engine.room.zones=[{type:3,x:0,z:0,r:1,dx:0,dz:1}];
  engine.room.bumpers=[{x:0,z:0,r:.34}];engine.state.bumperJelly=[{compression:4,velocity:20,axisX:1,axisZ:0}];
  Object.assign(engine.state.cube,{wetness:8,slime:-2});
  for(const reduced of [false,true]){
    renderer.motionQuery={matches:reduced};renderer.draw(engine,{effects:reduced,dynamicCamera:true});
    assert.equal(uniforms.uLook[3],0);
    assert.deepEqual(uniforms.uZoneFlow0,[0,1,2.4,0]);
    assert.deepEqual(uniforms.uBumpFx0,[.26,4,1,0]);
    assert.deepEqual(uniforms.uSurfaceContact.slice(0,2),[1,0]);
  }
});

test('invalid or excessive authored currents use the same finite speed limits as physics',()=>{
  const {renderer,engine,uniforms}=fixture();
  engine.room.zones=[{type:3,x:0,z:0,r:1,dx:NaN,dz:Infinity,flowSpeed:Infinity},{type:3,x:1,z:0,r:.4,dx:0,dz:0,flowSpeed:9},{type:3,x:-1,z:0,r:.4,dx:-1,dz:0,flowSpeed:-3}];
  renderer.draw(engine,{});
  assert.deepEqual(uniforms.uZoneFlow0,[1,0,2.4,0]);
  assert.deepEqual(uniforms.uZoneFlow1,[1,0,4,0]);
  assert.deepEqual(uniforms.uZoneFlow2,[-1,0,0,0]);
});

test('jelly deformation uploads a bounded inverse affine map with identity at rest',()=>{
 const {renderer,engine,uniforms}=fixture();engine.room.bumpers=[{x:0,z:0,r:.34}];
 engine.state.bumperJelly=[{compression:.2,velocity:0,axisX:1,axisZ:0}];renderer.draw(engine,{});
 const warp=uniforms.uBumpWarp0;assert.ok(warp,'The inverse map must be computed once per frame');
 const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,actual+' != '+expected);
 close(warp[0],.19047619047619047);close(warp[1],0);close(warp[2],-.07407407407407407);close(warp[3],-.09090909090909091);
 engine.state.bumperJelly[0].compression=0;renderer.draw(engine,{});assert.deepEqual(uniforms.uBumpWarp0,[0,0,0,0]);
 engine.state.bumperJelly[0].compression=.000001;renderer.draw(engine,{});assert.deepEqual(uniforms.uBumpWarp0,[0,0,0,0]);
 delete engine.state.bumperJelly;renderer.draw(engine,{});assert.deepEqual(uniforms.uBumpWarp0,[0,0,0,0]);
});
