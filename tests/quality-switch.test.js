import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';

function fixture(parallel=true){
  const flags={busy:false,fail:false},calls=[],deleted=[];
  const constants=new Map();let n=1;
  const gl=new Proxy({}, {get:(_,key)=>{
    if(key==='getExtension')return name=>name==='KHR_parallel_shader_compile'&&parallel?{COMPLETION_STATUS_KHR:37297}:null;
    if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
    if(key==='getParameter')return ()=>[8192,8192];
    if(key==='getShaderParameter')return ()=>{calls.push('COMPILE_STATUS');if(flags.busy)throw Error('blocking shader query');return !flags.fail;};
    if(key==='getProgramParameter')return (_,p)=>{if(p===37297){calls.push('COMPLETION_STATUS');return !flags.busy;}calls.push('LINK_STATUS');if(flags.busy)throw Error('blocking link query');return !flags.fail;};
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
  const r=new Renderer(canvas);calls.length=0;deleted.length=0;
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
