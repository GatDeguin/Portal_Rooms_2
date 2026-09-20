import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';
function fixture(precision=23){
 const log=[],constants=new Map();let id=1,currentProgram=null,framebuffer=null,active=0,dither=true;
 const flags={failFramebuffer:false,failShade:false};
 const gl=new Proxy({}, {get:(_,key)=>{
  if(key==='getShaderPrecisionFormat')return ()=>({precision});
  if(key==='getExtension')return ()=>null;
  if(key==='getParameter')return p=>p===gl.MAX_VIEWPORT_DIMS?[8192,8192]:p===gl.FRAMEBUFFER_BINDING?framebuffer:p===gl.ACTIVE_TEXTURE?active:[0,0,640,360];
  if(key==='isEnabled')return p=>p===gl.DITHER&&dither;
  if(key==='enable'||key==='disable')return p=>{if(p===gl.DITHER)dither=key==='enable';};
  if(key==='shaderSource')return (s,source)=>s.source=source;
  if(key==='attachShader')return (p,s)=>(p.shaders??=[]).push(s);
  if(key==='getShaderParameter')return ()=>true;
  if(key==='getProgramParameter')return p=>!(flags.failShade&&p.shaders?.some(s=>s.source?.includes('vec4 surface=texture2D(uSurfaceHits')));
  if(key==='getProgramInfoLog')return ()=>'shade failed';
  if(key==='getUniformLocation')return (p,name)=>({p,name});
  if(key==='getAttribLocation')return ()=>0;
  if(key==='useProgram')return p=>currentProgram=p;
  if(key==='bindFramebuffer')return (_,p)=>framebuffer=p;
  if(key==='activeTexture')return unit=>active=unit;
  if(key==='checkFramebufferStatus')return ()=>flags.failFramebuffer?0:gl.FRAMEBUFFER_COMPLETE;
  if(key==='drawArrays')return ()=>log.push({kind:'draw',program:currentProgram,framebuffer,dither});
  if(key.startsWith('uniform'))return (loc,...values)=>log.push({kind:'uniform',loc,values});
  if(key.startsWith('delete'))return resource=>log.push({kind:key,resource});
  if(key==='texImage2D')return (...args)=>log.push({kind:'allocate',args});
  if(key.startsWith('create'))return ()=>({id:id++});
  if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,id++);return constants.get(key);}
  return ()=>{};
 }});
 globalThis.devicePixelRatio=1;
 const canvas={width:640,height:360,clientWidth:640,clientHeight:360,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
 const r=new Renderer(canvas);r.externallyTimed=true;
 return {r,gl,canvas,log,flags};
}
test('High highp caches two programs, draws the same scene into hits then beauty, and reuses target',()=>{
 const {r,log,canvas}=fixture(),engine=new GameEngine();r.setQuality('high');const entry=r.program();assert.ok(entry.surface,'High has a dedicated surface program');
 log.length=0;r.draw(engine,{});let draws=log.filter(x=>x.kind==='draw');assert.equal(draws.length,2);assert.equal(draws[0].program,entry.surface.program);assert.ok(draws[0].framebuffer);assert.equal(draws[0].dither,false);assert.equal(draws[1].program,entry.program);assert.equal(draws[1].framebuffer,null);assert.equal(draws[1].dither,true);
 const scene=log.filter(x=>x.kind==='uniform'&&x.loc.name==='uTime');assert.equal(scene.length,2);assert.deepEqual(scene[0].values,scene[1].values);assert.deepEqual(log.find(x=>x.kind==='uniform'&&x.loc.name==='uSurfaceHits').values,[1]);
 const target=r.surfaceTarget;assert.equal(target.width,canvas.width);log.length=0;r.draw(engine,{});assert.equal(r.surfaceTarget,target);assert.equal(log.filter(x=>x.kind==='allocate').length,0);
 canvas.clientWidth=800;r.resize();r.draw(engine,{});assert.notEqual(r.surfaceTarget,target);assert.ok(log.some(x=>x.kind==='deleteTexture'&&x.resource===target.texture));
 const programs=[entry.program,entry.surface.program];r.destroy();for(const program of programs)assert.equal(log.filter(x=>x.kind==='deleteProgram'&&x.resource===program).length,1);
});
test('Low, Medium and mediump keep the single-pass path',()=>{
 for(const [precision,tier] of [[23,'low'],[23,'medium'],[0,'high'],[0,'cinematic']]){const {r,log}=fixture(precision);r.setQuality(tier);log.length=0;r.draw(new GameEngine(),{});assert.equal(r.program().surface,undefined);assert.equal(log.filter(x=>x.kind==='draw').length,1);assert.equal(r.surfaceTarget,undefined);r.destroy();}
});
test('failed target resize retains old resources and restores default framebuffer/dither',()=>{
 const {r,gl,canvas,log,flags}=fixture();r.setQuality('high');r.draw(new GameEngine(),{});const target=r.surfaceTarget;canvas.clientWidth=900;r.resize();flags.failFramebuffer=true;
 assert.throws(()=>r.draw(new GameEngine(),{}),/framebuffer|superficie/i);assert.equal(r.surfaceTarget,target);assert.equal(gl.getParameter(gl.FRAMEBUFFER_BINDING),null);assert.equal(gl.isEnabled(gl.DITHER),true);assert.equal(log.some(x=>x.kind==='deleteTexture'&&x.resource===target.texture),false);r.destroy();
});

test('second-program failure is transactional in synchronous and asynchronous preparation',async()=>{
 for(const asynchronous of [false,true]){
  const {r,flags,log}=fixture();const previous=r.quality;flags.failShade=true;
  if(asynchronous)await assert.rejects(r.prepareProgram('high'),/shade failed/);else assert.throws(()=>r.setQuality('high'),/shade failed/);
  assert.equal(r.quality,previous);assert.equal(r.programs.has('high'),false);
  const deleted=log.filter(x=>x.kind==='deleteProgram');assert.equal(deleted.length,3,'tiny LUT program and both candidate programs released');assert.equal(new Set(deleted.map(x=>x.resource)).size,3);r.destroy();
 }
});
test('one GPU timing query encloses both rendering passes',()=>{
 const {r,log}=fixture();r.setQuality('high');log.length=0;
 r.timerExtension={createQueryEXT:()=>({}),beginQueryEXT:()=>log.push({kind:'begin'}),endQueryEXT:()=>log.push({kind:'end'}),deleteQueryEXT(){}};
 r.draw(new GameEngine(),{});assert.deepEqual(log.filter(x=>['begin','draw','end'].includes(x.kind)).map(x=>x.kind),['begin','draw','draw','end']);r.destroy();
});
