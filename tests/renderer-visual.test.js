import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';
import {movingAt} from '../src/geometry.js';
function fixture(){
  const commands={},flags={fail:false,textures:0,uploads:0,deletedTextures:[]},gl=new Proxy({}, {get:(_,key)=>{
    if(key==='checkFramebufferStatus')return ()=>1;
    if(key==='createTexture')return ()=>({texture:++flags.textures});
    if(key==='texImage2D')return ()=>flags.uploads++;
    if(key==='deleteTexture')return texture=>flags.deletedTextures.push(texture);
    if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
    if(key==='getExtension')return ()=>null;
    if(key==='getParameter')return ()=>[8192,8192];
    if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>!flags.fail;
    if(key==='getShaderInfoLog')return ()=>'fixture compile failure';
    if(key==='getUniformLocation')return (_,name)=>name;
    if(key==='getAttribLocation')return ()=>0;
    if(key.startsWith('uniform'))return (name,...args)=>commands[name]=args;
    if(key.startsWith('create'))return ()=>({});
    if(key===key.toUpperCase())return 1;
    return ()=>{};
  }});
  globalThis.innerWidth=640;globalThis.innerHeight=360;globalThis.devicePixelRatio=1;
  const canvas={width:640,height:360,clientWidth:640,clientHeight:360,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
  return {r:new Renderer(canvas),commands,flags};
}
test('effects off stops decoration but moving platforms retain simulation time',()=>{
  const {r,commands}=fixture(),e=new GameEngine();e.reset(17);e.state.time=2;
  const before=structuredClone(e.state);r.draw(e,{dynamicCamera:false,effects:false});
  assert.equal(commands.uLook?.[3],0);assert.equal(commands.uTime[0],2);
  assert.equal(commands.uPlat0[0],movingAt(e.room.platforms[0],2).x);assert.deepEqual(e.state,before);
});
test('system reduced motion overrides a saved dynamic camera and effects choice',()=>{
  const {r,commands}=fixture(),e=new GameEngine();r.motionQuery={matches:true};e.state.shake=1;e.state.gravity={x:.5,z:.6};
  r.draw(e,{dynamicCamera:true,effects:true});assert.deepEqual(commands.uGravity,[0,0]);assert.equal(commands.uMotion[0],0);assert.equal(commands.uShake[0],0);assert.equal(commands.uLook?.[3],0);
});
test('a rejected shader selection rolls back the renderer instead of stranding the UI',()=>{
  const {r,flags}=fixture(),previous=r.quality;flags.fail=true;
  assert.throws(()=>r.setQuality('cinematic'),/fixture compile failure/);assert.equal(r.quality,previous);assert.equal(r.quality.mode,'auto');
});

test('relief lattice is lazy, bound to sampler zero, reused between heavy tiers, and deleted once',()=>{
 const {r,commands,flags}=fixture(),engine=new GameEngine();r.draw(engine,{});assert.equal(flags.textures,0,'Low does not prepare the relief lattice');
 r.setQuality('high');r.draw(engine,{});const lattice=r.reliefNoiseTexture;assert.equal(flags.textures,2);assert.equal(flags.uploads,2);assert.deepEqual(commands.uReliefNoise,[0]);
 r.setQuality('cinematic');r.draw(engine,{});assert.equal(r.reliefNoiseTexture,lattice);assert.equal(flags.textures,2);r.destroy();r.destroy();assert.equal(flags.deletedTextures.filter(t=>t===lattice).length,1);assert.equal(flags.deletedTextures.length,2);
});
