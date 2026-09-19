import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/renderer-client.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
function fixture(){
 const workers=[],presented=[],config={delay:0,fail:false};
 const canvas={clientWidth:640,clientHeight:360,width:640,height:360,getContext:()=>({transferFromImageBitmap:b=>presented.push(b)})};
 const workerFactory=()=>{
   const w={terminated:false,posts:[],terminate(){this.terminated=true;},postMessage(data){
     this.posts.push(data);
     if(data.type==='init'){
       this.mode=data.quality;const fail=config.fail;
       setTimeout(()=>this.onmessage?.({data:fail?{type:'error',message:'fixture rejected'}:{type:'ready',quality:{mode:this.mode,tier:this.mode==='auto'?'medium':this.mode,scale:1},width:640,height:360,description:this.mode}}),config.delay);
     }
   }};workers.push(w);return w;
 };
 return {canvas,workers,presented,config,workerFactory};
}
test('quality compilation is staged in another worker, preserving the live renderer',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});
 const old=f.workers[0];f.config.delay=25;const pending=r.requestQuality('cinematic');
 assert.equal(r.quality.mode,'low');assert.equal(old.terminated,false);
 await pending;assert.equal(r.quality.mode,'cinematic');assert.equal(old.terminated,true);r.destroy();
});
test('cancelling a candidate terminates only that worker, not the previous renderer',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});
 f.config.delay=30;const controller=new AbortController(),p=r.requestQuality('high',{signal:controller.signal});controller.abort();
 await assert.rejects(p,{name:'AbortError'});assert.equal(r.quality.mode,'low');assert.equal(f.workers[0].terminated,false);assert.equal(f.workers[1].terminated,true);r.destroy();
});
test('a compiler watchdog returns to the last working quality',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low',timeoutMs:15});
 f.config.delay=60;await assert.rejects(r.requestQuality('cinematic'),/tiempo|tardó/i);
 assert.equal(r.quality.mode,'low');assert.equal(f.workers[0].terminated,false);assert.equal(f.workers[1].terminated,true);r.destroy();
});
test('a failed candidate cannot discard the active renderer',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'medium'});
 f.config.fail=true;await assert.rejects(r.requestQuality('high'),/fixture rejected/);assert.equal(f.workers[0].terminated,false);assert.equal(r.quality.mode,'medium');r.destroy();
});
test('render backpressure bounds the queue and closes stale bitmaps',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});
 const engine={state:{time:0},room:{id:1},target:{type:1,pos:[0,0]}};
 for(let i=0;i<100;i++){engine.state.time=i;r.draw(engine,{});}
 assert.equal(f.workers[0].posts.filter(p=>p.type==='frame').length,1);
 let closed=false;const bitmap={width:640,height:360,close:()=>{closed=true;}};
 r.destroy();f.workers[0].onmessage({data:{type:'frame',bitmap}});assert.equal(closed,true);assert.equal(f.presented.length,0);
});
test('pausing drops queued frames instead of drawing behind the menu',async()=>{
 assert.equal(typeof api.WorkerRenderer,'function');const f=fixture();
 const r=await api.WorkerRenderer.create(f.canvas,{workerFactory:f.workerFactory,quality:'low'});
 const engine={state:{time:0},room:{id:1},target:{type:1,pos:[0,0]}};
 r.draw(engine,{});r.draw(engine,{});assert.equal(typeof r.pause,'function');r.pause();
 const w=f.workers[0];w.onmessage({data:{type:'frame',quality:{mode:'low',tier:'low',scale:1},description:'low'}});
 assert.equal(w.posts.filter(p=>p.type==='frame').length,1);r.destroy();
});
