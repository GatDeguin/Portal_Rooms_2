import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {preparationTimeout} from '../src/renderer.js';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/renderer-worker.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'');
test('worker measures draw plus bitmap transfer, never caller elapsed, and validates a full usable first image',async()=>{
 const sent=[],samples=[],draws=[],preparations=[];let time=0;
 class Renderer{constructor(canvas,options){this.canvas=canvas;this.quality={mode:options.quality,tier:'low',scale:1,resetSamples(){}};this.gl={NO_ERROR:0,getError:()=>0};}program(){}async prepareProgram(tier,options){preparations.push(options.timeoutMs);time+=25;}async settleRenderTiming(){}resize(){this.canvas.width=this.canvas.clientWidth;this.canvas.height=this.canvas.clientHeight;}draw(){draws.push([this.canvas.width,this.canvas.height]);time+=300;}observeRender(ms){samples.push(ms);}description(){return 'Low';}}
 class OffscreenCanvas{constructor(w,h){this.width=w;this.height=h;}getContext(){}addEventListener(){}removeEventListener(){}transferToImageBitmap(){time+=25;return {width:this.width,height:this.height,close(){}};}}
 const self={postMessage:p=>sent.push(p)},context={self,Renderer,OffscreenCanvas,preparationTimeout,performance:{now:()=>time}};context.globalThis=context;vm.runInNewContext(code,context);
 await self.onmessage({data:{type:'init',quality:'auto',scene:{},settings:{},size:{width:640,height:360,dpr:1}}});
 assert.deepEqual(preparations,[60000,59975],'Low and requested preparation share a decreasing aggregate budget');
 const preparedIndex=sent.findIndex(p=>p.type==='prepared');assert.ok(preparedIndex>=0&&preparedIndex<sent.findIndex(p=>p.type==='ready'),'prepared precedes first usable image');
 const ready=sent.find(p=>p.type==='ready');assert.ok(ready.bitmap,'ready must carry the validated image');assert.deepEqual(draws.at(-1),[640,360]);
 await self.onmessage({data:{type:'frame',id:7,elapsed:16,scene:{},settings:{},size:{width:640,height:360,dpr:1}}});
 const frame=sent.find(p=>p.type==='frame');assert.equal(frame.id,7);assert.equal(frame.renderMs,325);assert.equal(samples.at(-1),325);
});

test('Auto High caches Low, Medium and High within one decreasing preparation budget; explicit High skips Medium',async()=>{
 for(const mode of ['auto','high']){
  const prepared=[],sent=[];let time=0;
  class Renderer{constructor(canvas){this.canvas=canvas;this.quality={mode,tier:mode==='auto'?'low':'high',scale:1};this.gl={NO_ERROR:0,getError:()=>0};}async prepareProgram(tier,options){prepared.push([tier,options.timeoutMs]);time+=30000;}async settleRenderTiming(){}resize(){}draw(){}observeRender(){}description(){return this.quality.tier;}}
  class OffscreenCanvas{constructor(width,height){Object.assign(this,{width,height});}getContext(){}addEventListener(){}removeEventListener(){}transferToImageBitmap(){return {width:2,height:2,close(){}};}}
  const self={postMessage:p=>sent.push(p)},context={self,Renderer,OffscreenCanvas,preparationTimeout,performance:{now:()=>time}};context.globalThis=context;vm.runInNewContext(code,context);
  await self.onmessage({data:{type:'init',quality:mode,tier:'high',prepareTimeoutMs:180000,scene:{},settings:{},size:{width:640,height:360,dpr:1}}});
  assert.deepEqual(prepared,mode==='auto'?[['low',180000],['medium',150000],['high',120000]]:[['low',180000],['high',150000]]);assert.ok(sent.some(p=>p.type==='ready'));
 }
});
