import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {AdaptiveQuality} from '../src/quality.js';
function fixture(){
 const flags={ready:false,disjoint:false,result:600e6},deleted=[],queries=[],samples=[];
 const extension={TIME_ELAPSED_EXT:1,QUERY_RESULT_AVAILABLE_EXT:2,QUERY_RESULT_EXT:3,GPU_DISJOINT_EXT:4,createQueryEXT(){const q={};queries.push(q);return q;},beginQueryEXT(){},endQueryEXT(){},getQueryObjectEXT(q,p){return p===2?flags.ready:flags.result;},deleteQueryEXT:q=>deleted.push(q)};
 const gl={getExtension:n=>n==='EXT_disjoint_timer_query'?extension:null,getParameter:()=>flags.disjoint};
 const r=Object.create(Renderer.prototype);Object.assign(r,{gl,timerExtension:extension,quality:{},lost:false,adapt:ms=>samples.push(ms)});
 return {r,flags,deleted,queries,samples};
}
test('a pending GPU query is bounded to one and a valid GPU duration is sampled only once',()=>{
 const {r,flags,queries,samples,deleted}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(12);assert.deepEqual(samples,[]);
 r.beginRenderTiming();r.endRenderTiming();r.observeRender(15);assert.equal(queries.length,1);assert.deepEqual(samples,[]);
 flags.ready=true;r.pollRenderTiming();r.pollRenderTiming();assert.deepEqual(samples,[600]);assert.equal(deleted.length,1);
});
test('disjoint slow CPU and genuinely expired queries preserve pressure and release their resource',()=>{
 for(const stale of [false,true]){const {r,flags,samples,deleted}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(40);if(stale)r.pendingTiming.started=performance.now()-2100;else flags.disjoint=true;r.pollRenderTiming();assert.equal(samples.length,1);assert.ok(stale?samples[0]>=2100:samples[0]===40);assert.equal(deleted.length,1);}
});test('200ms observed wall time acts immediately even while GPU query is unavailable',()=>{const {r,flags,samples,deleted}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(250);assert.deepEqual(samples,[250]);flags.ready=true;r.pollRenderTiming();assert.equal(deleted.length,1);assert.deepEqual(samples,[250]);});
test('fast submissions behind a pending GPU query do not count as recovery headroom',()=>{const {r,samples}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(5);for(let n=0;n<100;n++){r.beginRenderTiming();r.endRenderTiming();r.observeRender(5);}assert.deepEqual(samples,[]);});
test('emergency render cost still downgrades while an automatic promotion is compiling',()=>{const r=Object.create(Renderer.prototype);const quality={mode:'auto',tier:'medium',scale:1,sample(ms){if(ms>=200){this.tier='low';this.scale=.5;return true;}return false;}};Object.assign(r,{quality,qualityEpoch:0,asyncCompile:true,programs:new Map([['low',{}]]),autoPending:{},resize(){}});r.adapt(2000);assert.equal(quality.tier,'low');assert.equal(quality.scale,.5);});

test('first-frame GPU settling yields until a query becomes available and remains bounded',async()=>{const {r,flags,samples}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(10);let done=false;const pending=r.settleRenderTiming().then(()=>done=true);await new Promise(resolve=>setTimeout(resolve,5));assert.equal(done,false);flags.ready=true;await pending;assert.deepEqual(samples,[600]);assert.equal(r.lastTimingState,'gpu');});
test('first-frame query timeout falls back honestly to observed cost without inventing completion',async()=>{const {r,samples,deleted}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(10);await r.settleRenderTiming({timeoutMs:5});assert.equal(r.lastTimingState,'expired');assert.ok(samples.every(ms=>ms>28),'short unresolved waits cannot be counted as recovery headroom');assert.equal(deleted.length,1);});

test('later catastrophic GPU evidence escalates an earlier slow wall response without averaging the frame twice',()=>{const {r,flags}=fixture();r.quality=new AdaptiveQuality('auto');r.quality.tier='high';r.adapt=Renderer.prototype.adapt;r.resize=()=>{};r.programs=new Map();r.beginRenderTiming();r.endRenderTiming();r.observeRender(250);assert.equal(r.quality.tier,'medium');flags.ready=true;flags.result=2000e6;r.pollRenderTiming();assert.equal(r.quality.tier,'low');assert.equal(r.quality.scale,.5);assert.equal(r.quality.frames,0);});

test('first-frame settlement returns its own query result even if a newer frame starts another query',async()=>{const {r,flags}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(10);const query=r.pendingTiming;const pending=r.settleRenderTiming({query});flags.disjoint=true;r.pollRenderTiming();flags.disjoint=false;r.beginRenderTiming();r.endRenderTiming();r.observeRender(12);flags.ready=true;r.pollRenderTiming();const result=await pending;assert.equal(result.state,'disjoint');});

test('worker Auto proposals keep tier and program preparation out of the active worker',()=>{
 const quality=new AdaptiveQuality('auto');let requested,prepared=0;
 const r=Object.create(Renderer.prototype);Object.assign(r,{quality,asyncCompile:true,externallyTimed:true,failedAutoTiers:new Set(),programs:new Map([['low',{}]]),resize(){},onAutoTier:tier=>requested=tier,prepareProgram:()=>{prepared++;}});
 for(let n=0;n<360;n++)r.adapt(2);assert.equal(requested,'medium');assert.equal(quality.tier,'low');assert.equal(prepared,0);assert.equal(r.autoPending.external,true);
 r.adapt(2000);assert.equal(quality.tier,'low');assert.equal(quality.scale,.5);assert.equal(r.autoPending,null);
});

test('a GPU query still pending after two seconds causes emergency pressure instead of fast CPU headroom',()=>{
 const {r}=fixture();r.quality=new AdaptiveQuality('auto');r.quality.tier='high';r.adapt=Renderer.prototype.adapt;r.resize=()=>{};r.programs=new Map();r.beginRenderTiming();r.endRenderTiming();r.observeRender(2);r.pendingTiming.started=performance.now()-2100;r.pollRenderTiming();assert.equal(r.lastTimingState,'expired');assert.equal(r.quality.tier,'low');assert.equal(r.quality.scale,.5);
});
test('an aged but available fast GPU query uses GPU duration rather than delayed polling time',()=>{
 const {r,flags,samples}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(2);r.pendingTiming.started=performance.now()-9000;flags.ready=true;flags.result=3e6;r.pollRenderTiming();assert.equal(r.lastTimingState,'gpu');assert.deepEqual(samples,[3]);
});
test('disjoint and invalid fast GPU queries cannot supply recovery headroom',()=>{
 for(const disjoint of [true,false]){const {r,flags,samples}=fixture();r.beginRenderTiming();r.endRenderTiming();r.observeRender(2);flags.disjoint=disjoint;flags.ready=true;flags.result=0;r.pollRenderTiming();assert.deepEqual(samples,[]);}
});

test('explicit first-frame settling timeout preserves the elapsed GPU-wait emergency signal',async()=>{
 const {r}=fixture();r.quality=new AdaptiveQuality('auto');r.quality.tier='high';r.adapt=Renderer.prototype.adapt;r.resize=()=>{};r.programs=new Map();r.beginRenderTiming();r.endRenderTiming();r.observeRender(2);r.pendingTiming.started=performance.now()-1500;
 const result=await r.settleRenderTiming({timeoutMs:0});assert.equal(result.state,'expired');assert.ok(result.cost>=1500);assert.equal(r.quality.tier,'low');assert.equal(r.quality.scale,.5);
});

test('cached Auto High emergency Medium and subsequent High recovery require no compilation or external proposal',()=>{
 const quality=new AdaptiveQuality('auto');quality.tier='high';let proposals=0,compiles=0;
 const r=Object.create(Renderer.prototype);Object.assign(r,{quality,asyncCompile:true,externallyTimed:true,failedAutoTiers:new Set(),programs:new Map([['low',{}],['medium',{}],['high',{}]]),resize(){},onAutoTier:()=>proposals++,prepareProgram:()=>compiles++});
 r.adapt(250);assert.equal(quality.tier,'medium');assert.equal(quality.scale,.75);
 for(let n=0;n<2000;n++)r.adapt(2);assert.equal(quality.tier,'high');assert.equal(quality.scale,1);assert.equal(proposals,0);assert.equal(compiles,0);assert.equal(r.autoPending,undefined);
});
