import {AdaptiveQuality,drawingSize} from './quality.js';
import {visitSceneUniforms} from './scene-uniforms.js';
import {GPU_UNIFORMS} from './gpu-uniform-layout.js';
import {FULLSCREEN_WGSL,RESOLVE_WGSL,NOISE_WGSL} from './gpu-post.js';
import {PhotoSequence} from './photo-sequence.js';
const abort=()=>new DOMException('Preparación cancelada.','AbortError');
const UNIFORM_INDEX=new Map(GPU_UNIFORMS.map((name,i)=>[name,i*4]));
/** Existing SDF/materials translated offline. No WebGL work is used by this backend. */
export class WebGPURenderer{
 static async create(canvas,options={}){
  if(!navigator.gpu)throw Error('WebGPU no disponible.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No hay adaptador WebGPU.');
  const features=adapter.features.has('timestamp-query')?['timestamp-query']:[];
  const device=await adapter.requestDevice({requiredFeatures:features});
  let renderer;try{if(options.signal?.aborted)throw abort();renderer=new WebGPURenderer(canvas,device,options);await renderer.initialize();return renderer;}catch(error){renderer?.destroy();if(!renderer)device.destroy();throw error;}
 }
 constructor(canvas,device,{quality='auto',onContextLost=()=>{}}={}){
  this.canvas=canvas;this.device=device;this.onContextLost=onContextLost;this.programs=new Map();this.pendingPrograms=new Map();this.failedAutoTiers=new Set();this.quality=new AdaptiveQuality(quality);this.photo=new PhotoSequence();this.lost=false;this.qualityEpoch=0;this.backend='WebGPU';
  this.context=canvas.getContext('webgpu');if(!this.context)throw Error('No se pudo crear el contexto WebGPU.');this.format=navigator.gpu.getPreferredCanvasFormat();
  this.context.configure({device,format:this.format,alphaMode:'opaque'});
  this.uniformData=new Float32Array(GPU_UNIFORMS.length*4);this.uniformBuffer=device.createBuffer({size:this.uniformData.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.resolveData=new Float32Array([1,0,1,1]);this.resolveBuffer=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.vertex=device.createShaderModule({label:'Fullscreen vertex',code:FULLSCREEN_WGSL});
  this.sceneLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:4,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
  this.scenePipelineLayout=device.createPipelineLayout({bindGroupLayouts:[this.sceneLayout]});this.sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});this.nearest=device.createSampler();
  if(device.features.has('timestamp-query')){this.queries=device.createQuerySet({type:'timestamp',count:2});this.queryResolve=device.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC});this.queryRead=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});}
  this.lossHandler=error=>{if(this.lost)return;this.lost=true;this.onContextLost(error instanceof Error?error:Error(error?.message??'Se perdió el dispositivo WebGPU.'));};
  device.lost.then(info=>{if(info.reason!=='destroyed')this.lossHandler(info);});device.addEventListener('uncapturederror',this.lossHandler);
  this.resize();
 }
 async initialize(){
  const device=this.device;device.pushErrorScope('validation');
  this.resolvePipeline=await device.createRenderPipelineAsync({label:'HDR spatial AA / photo resolve',layout:'auto',vertex:{module:this.vertex,entryPoint:'vertexMain'},fragment:{module:device.createShaderModule({code:RESOLVE_WGSL}),entryPoint:'resolve',targets:[{format:'rgba16float'},{format:this.format}]}});
  const noisePipeline=await device.createRenderPipelineAsync({label:'Relief lattice',layout:'auto',vertex:{module:this.vertex,entryPoint:'vertexMain'},fragment:{module:device.createShaderModule({code:NOISE_WGSL}),entryPoint:'noise',targets:[{format:'rgba8unorm'}]}});
  this.noise=device.createTexture({size:[256,256],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT});
  const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:this.noise.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});pass.setPipeline(noisePipeline);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);
  const error=await device.popErrorScope();if(error)throw Error(error.message);
 }
 passes(tier){return ['high','cinematic'].includes(tier)?['surface','shade']:['combined'];}
 async prepareProgram(tier,{signal,timeoutMs=180000}={}){
  if(this.programs.has(tier))return this.programs.get(tier);if(this.pendingPrograms.has(tier))return this.pendingPrograms.get(tier);
  const epoch=this.qualityEpoch,started=performance.now(),check=()=>{if(this.lost||signal?.aborted||this.qualityEpoch!==epoch)throw abort();if(performance.now()-started>timeoutMs)throw Error('La preparación WebGPU tardó demasiado.');};
  const prepare=(async()=>{const entries=[];for(const pass of this.passes(tier)){check();const response=await fetch(new URL(`../assets/shaders/${tier}-${pass}.wgsl`,import.meta.url),{signal});if(!response.ok)throw Error('Falta el shader local '+tier+'-'+pass);const module=this.device.createShaderModule({label:tier+' '+pass,code:await response.text()});const info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw Error(errors.map(m=>m.message).join('\n'));check();
   entries.push(await this.device.createRenderPipelineAsync({label:tier+' '+pass,layout:this.scenePipelineLayout,vertex:{module:this.vertex,entryPoint:'vertexMain'},fragment:{module,entryPoint:'main',targets:[{format:pass==='surface'?'rgba8unorm':'rgba16float'}]}}));check();}
   const entry={shade:entries.at(-1),surface:entries.length===2?entries[0]:null};this.programs.set(tier,entry);return entry;})();
  this.pendingPrograms.set(tier,prepare);try{return await prepare;}finally{this.pendingPrograms.delete(tier);}
 }
 resize(){
  if(this.lost)return;const size=drawingSize(this.canvas.clientWidth||globalThis.innerWidth||2,this.canvas.clientHeight||globalThis.innerHeight||2,globalThis.devicePixelRatio||1,this.quality.tier,this.quality.scale),limit=this.device.limits.maxTextureDimension2D;size.width=Math.min(size.width,limit);size.height=Math.min(size.height,limit);
  if(this.canvas.width===size.width&&this.canvas.height===size.height&&this.targets)return;
  this.canvas.width=size.width;this.canvas.height=size.height;this.releaseTargets();this.photo.reset();
  const create=format=>this.device.createTexture({size:[size.width,size.height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  this.targets={current:create('rgba16float'),surface:create('rgba8unorm'),history:[create('rgba16float'),create('rgba16float')]};this.historyIndex=0;this.allocatedTargetBytes=size.width*size.height*28;
 }
 releaseTargets(){if(!this.targets)return;this.targets.current.destroy();this.targets.surface.destroy();this.targets.history.forEach(x=>x.destroy());this.targets=null;}
 async requestQuality(mode,{signal}={}){const next=new AdaptiveQuality(mode);await this.prepareProgram(next.tier,{signal});if(signal?.aborted)throw abort();this.quality=next;this.resize();}
 startPhoto(){this.photo.start();}
 cancelPhoto(){this.photo.reset();}
 async draw(engine,settings){
  if(this.lost)return;const entry=this.programs.get(this.quality.tier);if(!entry)throw Error('Shader WebGPU aún no preparado.');this.lastScene=engine;this.lastSettings=settings;
  const sample=this.photo.next(),device=this.device,targets=this.targets;
  const write=(name,...values)=>{const offset=UNIFORM_INDEX.get(name);if(offset!==undefined)this.uniformData.set(values,offset);};
  this.uniformData.fill(0);visitSceneUniforms(engine,settings,this.canvas.width,this.canvas.height,this.motionQuery?.matches===true,{one:write,two:write,four:write});write('uSample',...(sample?.jitter??[0,0]),0,0);device.queue.writeBuffer(this.uniformBuffer,0,this.uniformData);
  const group=device.createBindGroup({layout:this.sceneLayout,entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.noise.createView()},{binding:2,resource:this.sampler},{binding:3,resource:targets.surface.createView()},{binding:4,resource:this.nearest}]});
  const encoder=device.createCommandEncoder();let first=true;
  const scenePass=(pipeline,texture)=>{const options={colorAttachments:[{view:texture.createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]};if(this.queries&&first)options.timestampWrites={querySet:this.queries,beginningOfPassWriteIndex:0};first=false;const pass=encoder.beginRenderPass(options);pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();};
  // Surface pass must not bind its own output as an input, even when optimized away.
  if(entry.surface){const surfaceGroup=device.createBindGroup({layout:this.sceneLayout,entries:[{binding:0,resource:{buffer:this.uniformBuffer}},{binding:1,resource:this.noise.createView()},{binding:2,resource:this.sampler},{binding:3,resource:this.noise.createView()},{binding:4,resource:this.nearest}]});const options={colorAttachments:[{view:targets.surface.createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}],...(this.queries?{timestampWrites:{querySet:this.queries,beginningOfPassWriteIndex:0}}:{})};const p=encoder.beginRenderPass(options);p.setPipeline(entry.surface);p.setBindGroup(0,surfaceGroup);p.draw(3);p.end();first=false;}
  scenePass(entry.shade,targets.current);
  const previous=targets.history[this.historyIndex],next=targets.history[1-this.historyIndex];this.resolveData.set([sample?.weight??1,sample?1:0,1,sample?0:1]);device.queue.writeBuffer(this.resolveBuffer,0,this.resolveData);
  const resolveGroup=device.createBindGroup({layout:this.resolvePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:targets.current.createView()},{binding:1,resource:previous.createView()},{binding:2,resource:this.sampler},{binding:3,resource:{buffer:this.resolveBuffer}}]});
  const p=encoder.beginRenderPass({colorAttachments:[{view:next.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]},{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}],...(this.queries?{timestampWrites:{querySet:this.queries,endOfPassWriteIndex:1}}:{})});p.setPipeline(this.resolvePipeline);p.setBindGroup(0,resolveGroup);p.draw(3);p.end();
  if(this.queries){encoder.resolveQuerySet(this.queries,0,2,this.queryResolve,0);encoder.copyBufferToBuffer(this.queryResolve,0,this.queryRead,0,16);}
  device.queue.submit([encoder.finish()]);
  if(this.queries){await this.queryRead.mapAsync(GPUMapMode.READ);const time=new BigUint64Array(this.queryRead.getMappedRange());this.lastGPUCost=Number(time[1]-time[0])/1e6;this.queryRead.unmap();this.lastTimingState='gpu';}else{await device.queue.onSubmittedWorkDone();this.lastTimingState='wall';}
  if(this.lost)return;if(this.targets!==targets)return;this.historyIndex=1-this.historyIndex;if(sample)this.photo.commit(sample);
 }
 observeRender(ms){if(this.photo.active)return;const quality=this.quality,previous=quality.tier;if(!quality.sample(this.lastGPUCost>0?this.lastGPUCost:ms))return;if(quality.tier!==previous){const next=quality.tier;if(this.failedAutoTiers.has(next)){quality.tier=previous;quality.resetSamples();return;}if(this.onAutoTier&&['medium','high'].includes(next)&&['low','medium','high'].indexOf(next)>['low','medium','high'].indexOf(previous)){quality.tier=previous;if(!this.autoPending){this.autoPending={tier:next};this.onAutoTier(next);}return;}if(!this.programs.has(next))quality.tier=previous;}this.resize();}
 async settleRenderTiming(){return {state:this.lastTimingState??'wall',cost:this.lastGPUCost??0};}
 description(){const labels={low:'Rendimiento',medium:'Equilibrada',high:'Calidad',cinematic:'Ultra'};return `${this.backend} · ${labels[this.quality.tier]} · ${this.canvas.width} × ${this.canvas.height}`;}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.lost=true;++this.qualityEpoch;this.photo.reset();this.releaseTargets();this.noise?.destroy();this.uniformBuffer.destroy();this.resolveBuffer.destroy();this.queries?.destroy();this.queryResolve?.destroy();this.queryRead?.destroy();this.context.unconfigure();this.device.removeEventListener('uncapturederror',this.lossHandler);this.device.destroy();this.programs.clear();this.pendingPrograms.clear();}
}
