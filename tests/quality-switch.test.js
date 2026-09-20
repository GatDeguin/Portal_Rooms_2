import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';

function fixture(parallel=true){
  const flags={busy:false,fail:false,gpuBusy:false,timer:true,disjoint:false,gpuNs:1000000},calls=[],deleted=[];
  const constants=new Map();let n=1;
  const timer={TIME_ELAPSED_EXT:37300,QUERY_RESULT_AVAILABLE_EXT:37301,QUERY_RESULT_EXT:37302,GPU_DISJOINT_EXT:37303,createQueryEXT:()=>({}),beginQueryEXT(){},endQueryEXT(){},deleteQueryEXT(){},getQueryObjectEXT:(q,key)=>key===37301?!flags.gpuBusy:flags.gpuNs};
  const gl=new Proxy({}, {get:(_,key)=>{
    if(key==='getExtension')return name=>name==='KHR_parallel_shader_compile'&&parallel?{COMPLETION_STATUS_KHR:37297}:name==='EXT_disjoint_timer_query'&&flags.timer?timer:null;
    if(key==='checkFramebufferStatus')return ()=>gl.FRAMEBUFFER_COMPLETE;
    if(key==='shaderSource')return (shader,source)=>shader.source=source;
    if(key==='attachShader')return (program,shader)=>(program.shaders??=[]).push(shader);
    if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
    if(key==='getParameter')return p=>p===37303?flags.disjoint:[8192,8192];
    if(key==='getError')return ()=>0;
    if(key==='NO_ERROR')return 0;
    if(key==='getShaderParameter')return shader=>{if(!shader.source?.includes('#define STEPS'))return true;calls.push('COMPILE_STATUS');if(flags.busy)throw Error('blocking shader query');return !flags.fail;};
    if(key==='getProgramParameter')return (program,p)=>{if(!program.shaders?.some(shader=>shader.source?.includes('#define STEPS')))return true;if(p===37297){calls.push('COMPLETION_STATUS');return !flags.busy;}calls.push('LINK_STATUS');if(flags.busy)throw Error('blocking link query');return !flags.fail;};
    if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'compile failed';
    if(key==='getAttribLocation')return ()=>0;
    if(key==='getUniformLocation')return (_,name)=>name;
    if(key==='deleteProgram'||key==='deleteShader')return obj=>deleted.push(obj);
    if(key.startsWith('create'))return ()=>({});
    if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,n++);return constants.get(key);}
    return ()=>{};
  }});
  globalThis.innerWidth=640;globalThis.innerHeight=360;globalThis.devicePixelRatio=1;
  const canvas={width:640,height:360,clientWidth:640,clientHeight:360,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
  const r=new Renderer(canvas);r.lastScene=new GameEngine();r.lastSettings={};calls.length=0;deleted.length=0;
  return {r,flags,calls,deleted};
}
const switchQuality=(r,...args)=>(r.requestQuality??r.setQuality).call(r,...args);

test('a menu quality change yields instead of synchronously waiting for the compiler',async()=>{
  const {r,flags,calls}=fixture();flags.busy=true;const before=r.quality;
  let pending;assert.doesNotThrow(()=>{pending=switchQuality(r,'high');});
  assert.equal(typeof pending?.then,'function','quality changes must be asynchronous');
  assert.equal(r.quality,before);assert.equal(calls.length,0);
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.ok(!calls.includes('COMPILE_STATUS'));assert.ok(!calls.includes('LINK_STATUS'));
  flags.busy=false;await pending;assert.equal(r.quality.mode,'high');r.destroy();
});
test('cancelled quality changes retain the previous renderer and dispose candidate objects',async()=>{
  const {r,flags,deleted}=fixture();flags.busy=true;const before=r.quality,controller=new AbortController();
  const pending=switchQuality(r,'cinematic',{signal:controller.signal});
  await new Promise(resolve=>setTimeout(resolve,25));controller.abort();
  await assert.rejects(pending,{name:'AbortError'});assert.equal(r.quality,before);assert.ok(deleted.length>=3);r.destroy();
});
test('a stalled compiler times out without replacing the working quality',async()=>{
  const {r,flags}=fixture();flags.busy=true;const before=r.quality;
  await assert.rejects(switchQuality(r,'cinematic',{timeoutMs:30}),/tiempo|tardó/i);
  assert.equal(r.quality,before);assert.equal(r.programs.has('cinematic'),false);r.destroy();
});
test('link failure is transactional and never persists a broken quality',async()=>{
  const {r,flags}=fixture();flags.fail=true;const before=r.quality;
  await assert.rejects(switchQuality(r,'high'),/compile failed/);assert.equal(r.quality,before);r.destroy();
});
test('switching to a cached quality does not compile it again',async()=>{
  const {r,calls}=fixture();await switchQuality(r,'high');await switchQuality(r,'medium');calls.length=0;
  await switchQuality(r,'high');assert.deepEqual(calls,[]);r.destroy();
});
test('portable fallback works without the parallel compilation extension',async()=>{
  const {r}=fixture(false);const p=switchQuality(r,'low');assert.equal(typeof p?.then,'function');await p;assert.equal(r.quality.mode,'low');r.destroy();
});

test('main-thread fallback refuses uncached heavy tiers without parallel compilation',async()=>{const {r,calls}=fixture(false);await assert.rejects(r.requestQuality('cinematic'),/segundo plano|paralela/);assert.equal(r.quality.tier,'low');assert.deepEqual(calls,[]);r.destroy();});

test('fallback heavy quality is not committed while its first GPU draw remains pending',async()=>{const {r,flags}=fixture();flags.gpuBusy=true;const previous=r.quality;const pending=r.requestQuality('high',{timeoutMs:60});await new Promise(resolve=>setTimeout(resolve,25));assert.equal(r.quality,previous);await assert.rejects(pending,/primera imagen|GPU/);assert.equal(r.quality,previous);r.destroy();});
test('fallback heavy quality without a usable GPU timing extension is refused without replacement',async()=>{const {r}=fixture();r.timerExtension=null;const previous=r.quality;await assert.rejects(r.requestQuality('cinematic'),/GPU|temporización/);assert.equal(r.quality,previous);r.destroy();});

test('fallback Auto first High GPU cost immediately returns to Low when catastrophic',async()=>{const {r,flags}=fixture();flags.gpuNs=2000e6;const next=new (r.quality.constructor)('auto');next.tier='high';await r.switchQuality(next);assert.equal(r.quality.mode,'auto');assert.equal(r.quality.tier,'low');assert.equal(r.quality.scale,.5);r.destroy();});
test('fallback Auto cannot promote into High without timing support',async()=>{const {r}=fixture();await r.requestQuality('medium');r.quality.mode='auto';r.timerExtension=null;r.asyncCompile=true;for(let n=0;n<360;n++)r.adapt(2);await r.autoPending?.promise;assert.equal(r.quality.mode,'auto');assert.equal(r.quality.tier,'medium');assert.equal(r.programs.has('high'),false);r.destroy();});

test('fallback compilation time does not consume the separate first-draw budget',async()=>{const {r,flags}=fixture();flags.busy=true;const pending=r.requestQuality('high',{timeoutMs:25,prepareTimeoutMs:150});setTimeout(()=>flags.busy=false,45);await pending;assert.equal(r.quality.mode,'high');r.destroy();});

test('failed Auto High preparation is attempted once per session instead of looping every headroom period',async()=>{
 const {r,flags,calls}=fixture();await r.requestQuality('medium');r.quality.mode='auto';r.asyncCompile=true;flags.fail=true;calls.length=0;
 for(let n=0;n<360;n++)r.adapt(2);await r.autoPending?.promise;const attempts=calls.filter(x=>x==='LINK_STATUS').length;assert.equal(attempts,1);assert.equal(r.quality.tier,'medium');
 for(let window=0;window<5;window++){for(let n=0;n<360;n++)r.adapt(2);await r.autoPending?.promise;}
 assert.equal(calls.filter(x=>x==='LINK_STATUS').length,1,'a failed tier must not be compiled automatically again');
 flags.fail=false;await r.requestQuality('auto');assert.equal(r.failedAutoTiers.has('high'),true,'resetting Auto must not erase another tier failure');await r.requestQuality('high');assert.equal(r.quality.mode,'high','an explicit user retry remains available');assert.equal(r.failedAutoTiers.has('high'),false);r.destroy();
});

test('an aborted Auto promotion does not permanently block the tier and emergency downgrade still works',async()=>{
 const {r,flags}=fixture();await r.requestQuality('medium');r.quality.mode='auto';r.asyncCompile=true;flags.busy=true;
 for(let n=0;n<360;n++)r.adapt(2);const pending=r.autoPending.promise;r.adapt(2000);assert.equal(r.quality.tier,'low');assert.equal(r.quality.scale,.5);
 flags.busy=false;await pending;assert.equal(r.failedAutoTiers.has('high'),false);r.destroy();
});
