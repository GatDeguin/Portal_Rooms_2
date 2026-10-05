import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exercise the actual worker startup protocol with a tiny renderer stand-in.
// The real browser suite covers compilation and first-image validation.
async function preparations(mode,tier){
 const calls=[],messages=[],previous={self:globalThis.self,canvas:globalThis.OffscreenCanvas,renderer:globalThis.__PreparationRenderer};
 globalThis.self={postMessage:message=>messages.push(message)};
 globalThis.OffscreenCanvas=class{constructor(width,height){Object.assign(this,{width,height});}transferToImageBitmap(){return {width:this.width,height:this.height,close(){}};}};
 globalThis.__PreparationRenderer=class{
  constructor(view,{quality}){this.view=view;this.quality={mode:quality,tier:quality==='auto'?'low':quality,scale:1};this.gl={NO_ERROR:0,getError:()=>0};}
  async prepareProgram(tier){calls.push(tier);}
  resize(){} draw(){} observeRender(){} async settleRenderTiming(){} description(){return 'fixture';}
 };
 try{
  let source=await readFile(new URL('../src/renderer-worker.js',import.meta.url),'utf8');
  source=source.replace("import {Renderer,preparationTimeout} from './renderer.js';",'const Renderer=globalThis.__PreparationRenderer,preparationTimeout=()=>90000;');
  source=source.replace("import {WebGPURenderer} from './renderer-webgpu.js';",'');
  await import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+mode+' '+tier).toString('base64'));
  await self.onmessage({data:{type:'init',backend:'webgl',quality:mode,tier,size:{width:160,height:100,dpr:1},scene:{},settings:{},reduced:false}});
  assert.ok(messages.some(m=>m.type==='ready'),JSON.stringify(messages));
  assert.ok(!messages.some(m=>m.type==='error'),JSON.stringify(messages));
  return calls;
 }finally{
  if(previous.self===undefined)delete globalThis.self;else globalThis.self=previous.self;
  if(previous.canvas===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous.canvas;
  if(previous.renderer===undefined)delete globalThis.__PreparationRenderer;else globalThis.__PreparationRenderer=previous.renderer;
 }
}
for(const tier of ['low','medium','high','cinematic'])test(`manual ${tier} prepares its only usable tier without an unused rescue shader`,async()=>assert.deepEqual(await preparations(tier),[tier]));
for(const [tier,expected] of [['medium',['low','medium']],['high',['low','medium','high']]])test(`automatic ${tier} retains every emergency fallback`,async()=>assert.deepEqual(await preparations('auto',tier),expected));
