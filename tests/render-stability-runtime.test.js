import test from 'node:test';
import assert from 'node:assert/strict';
import {AdaptiveQuality} from '../src/quality.js';
import {WorkerRenderer} from '../src/renderer-client.js';

test('auto starts Low and a single fast frame cannot promote it',()=>{const q=new AdaptiveQuality('auto');q.sample(8);assert.equal(q.tier,'low');});
for(const ms of [200,251,500,2000])test(`auto immediately reacts to an observed ${ms}ms render`,()=>{const q=new AdaptiveQuality('auto');q.tier='high';assert.equal(q.sample(ms),true);assert.ok(q.tier!=='high'||q.scale<1);});
test('every manual tier remains explicit under slow and catastrophic samples',()=>{for(const tier of ['low','medium','high','cinematic']){const q=new AdaptiveQuality(tier);for(const ms of [200,500,2000])for(let n=0;n<40;n++)q.sample(ms);assert.equal(q.tier,tier);assert.equal(q.scale,1);}});
function fixture(){
 const workers=[],shown=[],config={bare:false,failMode:null,presentationFailure:false,width:640};
 const canvas={clientWidth:640,clientHeight:360,width:640,height:360,getContext:()=>({transferFromImageBitmap:b=>{if(config.presentationFailure)throw new Error('presentation failed');shown.push(b);}})};
 const workerFactory=()=>{const w={posts:[],terminate(){this.terminated=true;},postMessage(p){this.posts.push(p);if(p.type==='init')queueMicrotask(()=>this.onmessage({data:config.failMode===p.quality?{type:'error',message:'first frame failed'}:{type:'ready',quality:{mode:p.quality,tier:p.tier??(p.quality==='auto'?'low':p.quality),scale:1},description:p.quality,bitmap:config.bare?null:{width:config.width,height:360,close(){}},renderMs:16}}));}};workers.push(w);return w;};
 return {workers,canvas,workerFactory,shown,config};
}
const scene={state:{time:0},room:{id:1},target:{type:1,pos:[0,0]}};
test('paused busy worker still trips its frame watchdog',async()=>{const f=fixture();let failure;const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low',timeoutMs:20,onContextLost:e=>failure=e});r.draw(scene,{});r.pause();await new Promise(resolve=>setTimeout(resolve,40));assert.ok(failure);r.destroy();});
test('main RAF intervals are not posted as worker adaptive render samples',async()=>{const f=fixture();const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});r.sample(16);r.draw(scene,{});assert.equal(f.workers[0].posts.find(p=>p.type==='frame').elapsed,undefined);r.destroy();});
test('stale frame IDs close bitmap without releasing the current in-flight draw',async()=>{const f=fixture();const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});r.draw(scene,{});r.draw(scene,{});const w=f.workers[0],p=w.posts.find(p=>p.type==='frame');let closed=false;w.onmessage({data:{type:'frame',id:p.id-1,bitmap:{width:640,height:360,close(){closed=true;}},quality:{mode:'low',tier:'low',scale:1},description:'low'}});assert.equal(closed,true);assert.equal(w.posts.filter(p=>p.type==='frame').length,1);r.destroy();});
test('a candidate reporting compile readiness without a usable frame cannot replace the live renderer',async()=>{const f=fixture();const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});f.config.bare=true;await assert.rejects(r.requestQuality('cinematic'),/imagen/);assert.equal(r.quality.mode,'low');assert.equal(f.workers[0].terminated,undefined);r.destroy();});
test('failed saved Cinematic gets one visible Low recovery and records no preference writes',async()=>{const f=fixture();f.config.failMode='cinematic';const settings={quality:'cinematic'};const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:settings.quality,settings});assert.equal(r.quality.mode,'low');assert.match(r.warning,/preferencia/);assert.equal(settings.quality,'cinematic');assert.equal(f.workers.length,2);r.destroy();});
test('dead Auto worker recovers once at Low, then reports loss instead of looping',async()=>{const f=fixture();let failures=0;const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto',onContextLost:()=>failures++});f.workers[0].onerror({message:'dead'});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(r.quality.tier,'low');assert.equal(f.workers.length,2);assert.equal(failures,0);f.workers[1].onerror({message:'dead again'});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(failures,1);assert.equal(f.workers.length,2);r.destroy();});
test('latest queued resize reaches the next frame and duplicate replies do not advance the queue',async()=>{const f=fixture();const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});r.draw(scene,{});f.canvas.clientWidth=800;r.draw(scene,{});f.canvas.clientWidth=900;r.draw(scene,{});const w=f.workers[0],first=w.posts.find(p=>p.type==='frame');const reply={type:'frame',id:first.id,quality:{mode:'low',tier:'low',scale:1},description:'low'};w.onmessage({data:reply});const frames=w.posts.filter(p=>p.type==='frame');assert.equal(frames.length,2);assert.equal(frames[1].size.width,900);r.draw(scene,{});w.onmessage({data:reply});assert.equal(w.posts.filter(p=>p.type==='frame').length,2);r.destroy();});
test('long fast runs never select Cinematic and alternating pressure cannot cause promotion oscillation',()=>{const q=new AdaptiveQuality('auto');for(let i=0;i<4000;i++)q.sample(16);assert.equal(q.tier,'high');q.sample(2000);for(let i=0;i<600;i++)q.sample(i%2?16:40);assert.equal(q.tier,'low');});

test('failed candidate presentation restores the previous canvas size and requests its image even while paused',async()=>{const f=fixture();const r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});f.config.width=1280;f.config.presentationFailure=true;await assert.rejects(r.requestQuality('high'),/presentation failed/);assert.equal(r.quality.mode,'low');assert.equal(f.canvas.width,640);assert.equal(f.workers[0].posts.filter(p=>p.type==='frame').length,1);r.destroy();});

test('a compile may exceed the frame deadline but must finish inside its separate preparation deadline',async()=>{
 const f=fixture(),native=f.workerFactory;const workerFactory=()=>{const w=native(),send=w.postMessage;w.postMessage=function(packet){if(packet.type==='init'){setTimeout(()=>send.call(this,packet),45);return;}return send.call(this,packet);};return w;};
 const r=await WorkerRenderer.create(f.canvas,{quality:'low',workerFactory,timeoutMs:20,prepareTimeoutMs:100});assert.equal(r.quality.mode,'low');r.destroy();
});
test('prepared starts the first-image watchdog and repeated prepared packets cannot extend it',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture(),native=f.workerFactory;const workerFactory=()=>{const w=native();w.postMessage=function(packet){this.posts.push(packet);if(packet.type==='init'){setTimeout(()=>this.onmessage({data:{type:'prepared'}}),45);setTimeout(()=>this.onmessage({data:{type:'prepared'}}),55);setTimeout(()=>this.onmessage({data:{type:'prepared'}}),65);}};return w;};
 const pending=WorkerRenderer.create(f.canvas,{quality:'low',workerFactory,timeoutMs:30,prepareTimeoutMs:200});const rejected=assert.rejects(pending,/primera imagen|tardó/);
 t.mock.timers.tick(44);assert.notEqual(f.workers[0].terminated,true,'compilation has its own budget');
 t.mock.timers.tick(1);t.mock.timers.tick(29);assert.notEqual(f.workers[0].terminated,true);
 t.mock.timers.tick(1);assert.equal(f.workers[0].terminated,true,'duplicate prepared must not re-arm the watchdog');await rejected;
});

test('aborted bootstrap terminates its worker without spawning Low recovery',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'cinematic',signal:controller.signal}),{name:'AbortError'});
 assert.equal(f.workers.length,1);assert.equal(f.workers[0].terminated,true);
});
test('Auto tier promotion uses a candidate worker while the current worker remains responsive',async()=>{
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto'}),old=f.workers[0];
 old.onmessage({data:{type:'promotion',tier:'medium'}});assert.equal(f.workers.length,2);assert.equal(old.terminated,undefined);
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(r.quality.mode,'auto');assert.equal(r.quality.tier,'medium');assert.equal(old.terminated,true);r.destroy();
});
test('failed Auto candidate is blocked for the session and does not discard the current worker',async()=>{
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto'}),old=f.workers[0];f.config.failMode='auto';
 old.onmessage({data:{type:'promotion',tier:'medium'}});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(old.terminated,undefined);assert.equal(r.quality.tier,'low');old.onmessage({data:{type:'promotion',tier:'medium'}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.workers.length,2);r.destroy();
});

test('cancelling an in-progress bootstrap closes its worker and never retries another worker',async()=>{
 const f=fixture(),controller=new AbortController(),native=f.workerFactory;
 const workerFactory=()=>{const worker=native();worker.postMessage=packet=>worker.posts.push(packet);return worker;};
 const pending=WorkerRenderer.create(f.canvas,{workerFactory,quality:'auto',signal:controller.signal});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(f.workers.length,1);assert.equal(f.workers[0].terminated,true);
});
test('Auto candidate compilation can exceed frame timeout while the current worker keeps delivering frames',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto',timeoutMs:15,prepareTimeoutMs:150}),old=f.workers[0],native=f.workerFactory;
 r.workerFactory=()=>{const worker=native(),post=worker.postMessage;worker.postMessage=packet=>{if(packet.type==='init')setTimeout(()=>post.call(worker,packet),50);else post.call(worker,packet);};return worker;};
 old.onmessage({data:{type:'promotion',tier:'medium'}});
 for(let n=0;n<3;n++){r.draw(scene,{});old.onmessage({data:{type:'frame',id:old.posts.filter(p=>p.type==='frame').at(-1).id,quality:{mode:'auto',tier:'low',scale:1},description:'low'}});t.mock.timers.tick(12);await Promise.resolve();}
 assert.equal(old.terminated,undefined);t.mock.timers.tick(25);for(let n=0;n<8;n++)await Promise.resolve();assert.equal(r.quality.tier,'medium');assert.equal(r.lost,false);r.destroy();
});

test('a slow Auto High candidate proposal before ready is delivered after presentation',async()=>{
 const f=fixture(),native=f.workerFactory;
 const workerFactory=()=>{const worker=native(),send=worker.postMessage;worker.postMessage=packet=>{
  if(packet.type==='init'&&packet.tier==='high'){
   worker.posts.push(packet);queueMicrotask(()=>{
    // The first High render costs 250ms: uncached Medium is proposed before ready.
    worker.onmessage({data:{type:'promotion',tier:'medium'}});
    worker.onmessage({data:{type:'ready',quality:{mode:'auto',tier:'high',scale:.75},description:'high',renderMs:250,bitmap:{width:640,height:360,close(){}}}});
   });
  }else send.call(worker,packet);
 };return worker;};
 const r=await WorkerRenderer.create(f.canvas,{workerFactory,quality:'auto'});
 f.workers[0].onmessage({data:{type:'promotion',tier:'high'}});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(f.workers.length,3,'the early Medium proposal must create a candidate after High becomes current');assert.equal(r.quality.tier,'medium');assert.equal(r.autoPromotion,null);
 r.draw(scene,{});const current=f.workers[2],frame=current.posts.find(p=>p.type==='frame');current.onmessage({data:{type:'frame',id:frame.id,renderMs:50,quality:{mode:'auto',tier:'medium',scale:1},description:'medium'}});assert.equal(r.current.busy,false);assert.equal(r.quality.tier,'medium');r.destroy();
});

test('each worker session selects its measured aggregate compile budget independently of the 12-second frame budget',async()=>{
 for(const [quality,budget] of [['auto',60000],['low',60000],['medium',90000],['high',180000],['cinematic',180000]]){
  const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality});assert.equal(f.workers[0].posts[0].prepareTimeoutMs,budget);assert.equal(r.timeoutMs,12000);r.destroy();
 }
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto'});await r.requestQuality('auto',{tier:'high'});assert.equal(f.workers[1].posts[0].prepareTimeoutMs,180000);r.destroy();
});
test('explicit test timeouts override aggregate budgets without changing frame semantics',async()=>{
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'cinematic',timeoutMs:123,prepareTimeoutMs:456});assert.equal(f.workers[0].posts[0].prepareTimeoutMs,456);assert.equal(r.timeoutMs,123);r.destroy();
 const g=fixture(),q=await WorkerRenderer.create(g.canvas,{workerFactory:g.workerFactory,quality:'high',timeoutMs:789});assert.equal(g.workers[0].posts[0].prepareTimeoutMs,789);assert.equal(q.timeoutMs,789);q.destroy();
});

test('repeated same-target Auto proposals neither recreate a candidate nor prematurely release its worker wait',async()=>{
 const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto'}),old=f.workers[0],native=f.workerFactory;
 r.workerFactory=()=>{const worker=native();worker.postMessage=p=>worker.posts.push(p);return worker;};
 old.onmessage({data:{type:'promotion',tier:'high'}});old.onmessage({data:{type:'promotion',tier:'high'}});
 try{assert.equal(f.workers.length,2);assert.equal(old.posts.some(p=>p.type==='promotion-result'),false);}finally{r.destroy();}await new Promise(resolve=>setTimeout(resolve,0));
});

test('pressure-cancelled Auto promotion is blocked, while user cancellation remains retryable',async()=>{
 for(const pressure of [true,false]){
  const f=fixture(),r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto'}),old=f.workers[0],native=f.workerFactory;
  r.workerFactory=()=>{const worker=native();worker.postMessage=p=>worker.posts.push(p);return worker;};
  try{
   old.onmessage({data:{type:'promotion',tier:'high'}});
   if(pressure){r.draw(scene,{});old.onmessage({data:{type:'frame',id:old.posts.filter(p=>p.type==='frame').at(-1).id,quality:{mode:'auto',tier:'low',scale:.5},description:'low'}});}
   else r.autoPromotion.controller.abort();
   await new Promise(resolve=>setTimeout(resolve,0));assert.equal(r.failedAutoTiers.has('high'),pressure);
   assert.equal(old.posts.filter(p=>p.type==='promotion-result').at(-1).failed,pressure);
   old.onmessage({data:{type:'promotion',tier:'high'}});assert.equal(f.workers.length,pressure?2:3);
  }finally{r.destroy();}await new Promise(resolve=>setTimeout(resolve,0));
 }
});

test('recovery warning arrives before recovery worker creation and first readiness, without automatic resume',async()=>{
 const f=fixture(),warnings=[],settings={quality:'auto'};let phase='playing',r;
 r=await WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'auto',settings,onWarning:message=>{warnings.push({message,workers:f.workers.length,recovering:r.recovering});phase='paused';}});
 try{
  f.workers[0].onerror({message:'worker stopped'});
  assert.equal(warnings.length,1);assert.equal(warnings[0].workers,1,'warning precedes creating the rescue worker');assert.equal(warnings[0].recovering,true);assert.match(warnings[0].message,/recuperando|recuperación/i);assert.equal(phase,'paused');
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(warnings.length,2);assert.equal(r.recovering,false);assert.equal(phase,'paused');assert.equal(r.quality.mode,'auto');assert.deepEqual(settings,{quality:'auto'});
 }finally{r.destroy();}
});
