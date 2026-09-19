import {Renderer} from './renderer.js';

const abortError=()=>new DOMException('Cambio de calidad cancelado.','AbortError');
const snapshot=engine=>engine?{state:engine.state,room:engine.room,target:engine.target}:null;
const defaultWorker=()=>new Worker(new URL('./renderer-worker.js',import.meta.url),{type:'module'});

/** One rendering context per session; a candidate is never the visible renderer. */
class WorkerSession {
  constructor(factory,{timeoutMs,onFrame,onFailure}){
    this.worker=factory();this.timeoutMs=timeoutMs;this.onFrame=onFrame;this.onFailure=onFailure;
    this.disposed=false;this.ready=false;this.busy=false;
    this.worker.onmessage=({data})=>{
      if(this.disposed){data.bitmap?.close();return;}
      if(data.type==='preparing'){this.preparing=true;return;}
      if(data.type==='error'){this.fail(new Error(data.message));return;}
      if(data.type==='ready'){
        this.ready=true;this.status=data;clearTimeout(this.timer);this.removeAbort?.();this.resolve(this);return;
      }
      if(data.type==='frame'){
        clearTimeout(this.frameTimer);this.frameTimer=null;this.busy=false;this.status=data;this.onFrame(this,data);
      }
    };
    this.worker.onerror=event=>{event.preventDefault?.();this.fail(new Error(event.message||'El proceso gráfico se interrumpió.'));};
    this.worker.onmessageerror=()=>this.fail(new Error('No se pudo recibir la imagen del proceso gráfico.'));
  }
  start(packet,signal){
    return new Promise((resolve,reject)=>{
      this.resolve=resolve;this.reject=reject;
      const abort=()=>this.dispose(abortError());
      this.removeAbort=()=>signal?.removeEventListener('abort',abort);
      if(signal?.aborted){abort();return;}
      signal?.addEventListener('abort',abort,{once:true});
      this.timer=setTimeout(()=>this.fail(new Error('La preparación gráfica tardó demasiado. Se conserva la calidad anterior.')),this.timeoutMs);
      try{this.worker.postMessage({type:'init',...packet});}catch(error){this.fail(error);}
    });
  }
  watch(){
    if(!this.frameTimer)this.frameTimer=setTimeout(()=>this.fail(new Error('El render dejó de responder. Reintentá en calidad baja; tu progreso no se borra.')),this.timeoutMs);
  }
  frame(packet){
    if(this.disposed||this.busy)return false;
    this.busy=true;
    this.watch();
    try{this.worker.postMessage({type:'frame',...packet});}catch(error){this.fail(error);}
    return true;
  }
  fail(error){error.preparing=this.preparing===true;const wasReady=this.ready;this.dispose(error);if(wasReady)this.onFailure(this,error);}
  dispose(reason=abortError()){
    if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);clearTimeout(this.frameTimer);this.removeAbort?.();
    this.worker.terminate();if(!this.ready)this.reject?.(reason);
  }
}

/** Same SDF Renderer in a worker. Only images cross back; physics stays on the main thread. */
export class WorkerRenderer {
  static async create(canvas,options={}){
    const renderer=new WorkerRenderer(canvas,options);
    try{
      const session=await renderer.makeSession(options.quality??'auto');
      renderer.context=canvas.getContext('bitmaprenderer');
      if(!renderer.context){session.dispose();throw new Error('Presentación de imágenes no disponible.');}
      renderer.current=session;renderer.pending=null;renderer.readStatus(session.status);return renderer;
    }catch(error){renderer.destroy();throw error;}
  }
  constructor(canvas,{workerFactory=defaultWorker,timeoutMs=12000,onContextLost=()=>{},engine=null,settings={}}={}){
    Object.assign(this,{canvas,workerFactory,timeoutMs,onContextLost});
    this.lastScene=snapshot(engine);this.lastSettings=settings;this.elapsed=0;this.pending=null;this.current=null;this.epoch=0;this.lost=false;this.queued=null;
    this.resize();
  }
  resize(){this.size={width:this.canvas.clientWidth||globalThis.innerWidth||2,height:this.canvas.clientHeight||globalThis.innerHeight||2,dpr:globalThis.devicePixelRatio||1};}
  packet(){return {size:this.size,scene:this.lastScene,settings:this.lastSettings,reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true};}
  async makeSession(quality,signal){
    const session=new WorkerSession(this.workerFactory,{timeoutMs:this.timeoutMs,onFrame:(s,data)=>this.present(s,data),onFailure:(s,error)=>{
      if(s===this.current&&!this.lost){this.lost=true;this.onContextLost(error);}
    }});
    this.pending=session;
    return session.start({quality,...this.packet()},signal);
  }
  readStatus(data){
    this.quality={...data.quality,resetSamples:()=>{
      this.elapsed=0;if(!this.lost)this.current?.worker.postMessage({type:'reset'});
    }};
    this.descriptionValue=data.description;
  }
  async requestQuality(mode,{signal}={}){
    if(this.lost)throw new Error('El render no está disponible.');
    const epoch=++this.epoch;this.pending?.dispose();this.pending=null;
    if(signal?.aborted)throw abortError();
    if(this.quality.mode===mode)return;
    let candidate;
    try{
      candidate=await this.makeSession(mode,signal);
      if(this.lost||signal?.aborted||epoch!==this.epoch){candidate.dispose();throw abortError();}
      const previous=this.current;this.current=candidate;this.pending=null;this.queued=null;this.elapsed=0;
      this.readStatus(candidate.status);previous?.dispose();
      // Keep the last image. A menu quality change must not trigger a full-resolution draw.
    }catch(error){if(epoch===this.epoch)this.pending=null;throw error;}
  }
  sample(ms){if(Number.isFinite(ms)&&ms>0&&ms<=250)this.elapsed+=ms;}
  draw(engine,settings){
    if(this.lost)return;this.lastScene=snapshot(engine);this.lastSettings=settings;this.resize();
    const packet={...this.packet(),elapsed:Math.min(this.elapsed,250)};
    if(this.current.busy){this.queued=packet;this.current.watch();return;}
    this.elapsed=0;this.current.frame(packet);
  }
  present(session,data){
    if(this.lost||session!==this.current){data.bitmap?.close();return;}
    this.readStatus(data);
    if(data.bitmap){
      if(this.canvas.width!==data.bitmap.width)this.canvas.width=data.bitmap.width;
      if(this.canvas.height!==data.bitmap.height)this.canvas.height=data.bitmap.height;
      this.context.transferFromImageBitmap(data.bitmap);
    }
    const queued=this.queued;this.queued=null;
    if(queued){this.elapsed=0;session.frame(queued);}
  }
  pause(){this.queued=null;this.elapsed=0;if(this.current){clearTimeout(this.current.frameTimer);this.current.frameTimer=null;}}
  description(){return this.descriptionValue??'Preparando';}
  destroy(){if(this.lost&&this.destroyed)return;this.destroyed=true;this.lost=true;++this.epoch;this.queued=null;this.pending?.dispose();this.current?.dispose();}
}

/** Feature detection happens before claiming the DOM canvas, so fallback remains possible. */
export async function createRenderer(canvas,options={}){
  let quality=options.quality??'auto',workerFailed=false;
  if(typeof Worker==='function'&&typeof OffscreenCanvas==='function'&&
      typeof OffscreenCanvas.prototype.transferToImageBitmap==='function'&&
      document.createElement('canvas').getContext('bitmaprenderer')){
    try{return await WorkerRenderer.create(canvas,options);}catch(error){
      // Never retry an expensive, stalled worker compilation on the UI thread.
      if(error.preparing){quality='low';workerFailed=true;}
    }
  }
  const renderer=new Renderer(canvas,{...options,quality,deferProgram:true});
  renderer.asyncCompile=true;
  try{
    await renderer.requestQuality(quality);
    if(workerFailed)renderer.warning='La calidad guardada no pudo prepararse. Se inició en calidad baja; tu progreso se conserva. Podés elegir otra calidad en Ajustes.';
    return renderer;
  }
  catch(error){renderer.destroy();throw error;}
}
