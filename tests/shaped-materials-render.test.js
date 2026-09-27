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

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);
test('circle, rotated rounded rectangle, and capsule upload their actual physical footprints',()=>{
 const {renderer,engine,uniforms}=fixture();engine.room.jumpPads=[];engine.room.zones=[
 {type:1,x:0,z:0,r:.7},{type:2,x:1,z:0,shape:'rect',w:2.4,d:.8,corner:.1,angle:Math.PI/2},
 {type:3,x:-1,z:0,shape:'capsule',w:2,d:.6,angle:-Math.PI/4,dx:0,dz:1}];
 renderer.draw(engine,{});
 assert.deepEqual(uniforms.uZoneShape0,[.7,.7,.7,0]);assert.deepEqual(uniforms.uZoneBasis0,[1,0,0,0]);
 assert.deepEqual(uniforms.uZoneShape1,[1.2,.4,.1,Math.PI/2]);close(uniforms.uZoneBasis1[0],0);close(uniforms.uZoneBasis1[1],1);
 assert.deepEqual(uniforms.uZoneShape2,[1,.3,.3,-Math.PI/4]);assert.deepEqual(uniforms.uZoneFlow2,[0,1,2.4,0]);
 assert.ok(uniforms.uZone1.every(Number.isFinite),'Rectangles without legacy radius still upload finite uniforms');
});
test('pad compression keeps its source index after mixed zones and deduplicated jump pads',()=>{
 const {renderer,engine,uniforms}=fixture();engine.room.zones=[{type:2,x:0,z:1,r:.8},{type:5,x:1,z:0,r:.5}];
 engine.room.jumpPads=[{x:-1,z:0,r:.4},{x:1,z:0,r:.5}];engine.state.jumpJelly=[{compression:0,velocity:0},{compression:.5,velocity:-1.2}];
 const before=structuredClone(engine);renderer.draw(engine,{});
 assert.deepEqual(uniforms.uZoneMotion0,[0,0,0,0]);assert.equal(uniforms.uZoneMotion1[0],.5);assert.equal(uniforms.uZoneMotion1[1],-1.2);
 close(uniforms.uZoneMotion1[2],1.8207142857142857);close(uniforms.uZoneMotion1[3],-1.7387142857142858);
 close(uniforms.uZoneMotion2[2],.6414285714285715);close(uniforms.uZoneMotion2[3],-.48942857142857143);
 assert.deepEqual(uniforms.uZoneShape1,[.5,.5,.5,0]);assert.deepEqual(engine,before);
});
test('slip and sticky stretch reach the renderer while disabled effects retain physical dome compression',()=>{
 const {renderer,engine,uniforms}=fixture();engine.room.zones=[];engine.room.jumpPads=[{x:0,z:0,r:.5}];
 engine.state.jumpJelly=[{compression:.48,velocity:2}];Object.assign(engine.state.cube,{slip:.7,stickyStretch:{x:-.35,z:.2}});
 renderer.draw(engine,{effects:false});assert.equal(uniforms.uSurfaceContact[3],.7);assert.deepEqual(uniforms.uStickyStretch,[-.35,.2]);assert.equal(uniforms.uZoneMotion0[0],.48);assert.equal(uniforms.uLook[3],0);
 engine.room.jumpPads=[];delete engine.state.jumpJelly;delete engine.state.cube.stickyStretch;delete engine.state.cube.slip;
 renderer.draw(engine,{});assert.deepEqual(uniforms.uZoneShape0,[0,0,0,0]);assert.deepEqual(uniforms.uZoneMotion0,[0,0,0,0]);assert.deepEqual(uniforms.uStickyStretch,[0,0]);assert.equal(uniforms.uSurfaceContact[3],0);
});

test('an elevated jump cap keeps its base on the supporting platform',()=>{
 const {renderer,engine,uniforms}=fixture();engine.room.zones=[];engine.room.jumpPads=[{x:0,z:0,r:.4,y:.5}];engine.state.jumpJelly=[{compression:0,velocity:0}];renderer.draw(engine,{});
 close(uniforms.uZoneMotion0[3],.010571428571428565);close(uniforms.uZoneMotion0[3]+uniforms.uZoneMotion0[2]-.14,.512);
});
