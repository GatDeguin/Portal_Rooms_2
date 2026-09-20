import {Renderer,RENDER_TIMEOUTS,preparationTimeout} from './renderer.js';

const abortError=()=>new DOMException('Cambio de calidad cancelado.','AbortError');
const snapshot=engine=>engine?{state:engine.state,room:engine.room,target:engine.target}:null;
const defaultWorker=()=>new Worker(new URL('./renderer-worker.js',import.meta.url),{type:'module'});
const RECOVERING_WARNING='El render dejó de responder. Se está recuperando en Baja; la partida queda en pausa y tu progreso se conserva.';
const RECOVERY_WARNING='El render no pudo continuar con la calidad solicitada. Se recuperó en Baja; la preferencia guardada y tu progreso se conservan.';

/** The watchdog belongs to work in flight, independently of RAF/visibility. */
class WorkerSession {
  constructor(factory,{timeoutMs,prepareTimeoutMs,onFrame,onFailure,onPromotion}){
    try{this.worker=factory();}catch(error){error.workerUnavailable=true;throw error;}this.timeoutMs=timeoutMs;this.prepareTimeoutMs=prepareTimeoutMs;this.onFrame=onFrame;this.onFailure=onFailure;this.onPromotion=onPromotion;
    this.disposed=false;this.ready=false;this.busy=false;this.serial=0;
    this.worker.onmessage=({data})=>{
      if(this.disposed){data.bitmap?.close();return;}
      if(data.type==='promotion'){this.proposedTier=data.tier;if(this.ready)this.onPromotion?.(this,data.tier);return;}
      if(data.type==='preparing'){this.preparing=true;return;}
      if(data.type==='prepared'){
        if(!this.ready&&!this.prepared){this.prepared=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.fail(new Error('La primera imagen tardó demasiado. Se conserva la calidad anterior.')),this.timeoutMs);}
        return;
      }
      if(data.type==='error'){this.fail(new Error(data.message));return;}
      if(data.type==='ready'){
        if(this.ready){data.bitmap?.close();return;}
        if(!data.bitmap||data.bitmap.width<2||data.bitmap.height<2||!Number.isFinite(data.renderMs)){
          data.bitmap?.close();this.fail(new Error('La calidad no produjo una imagen utilizable.'));return;
        }
        this.ready=true;this.status=data;clearTimeout(this.timer);this.removeAbort?.();this.resolve(this);return;
      }
      if(data.type==='frame'){
        if(!this.busy||data.id!==this.inFlight){data.bitmap?.close();return;}
        clearTimeout(this.frameTimer);this.frameTimer=null;this.busy=false;this.status=data;try{this.onFrame(this,data);}catch(error){this.fail(error);}
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
      this.timer=setTimeout(()=>this.fail(new Error('La preparación o primera imagen tardó demasiado. Se conserva la calidad anterior.')),this.prepareTimeoutMs);
      try{this.worker.postMessage({type:'init',...packet,prepareTimeoutMs:this.prepareTimeoutMs});}catch(error){this.fail(error);}
    });
  }
  watch(){
    if(!this.frameTimer)this.frameTimer=setTimeout(()=>this.fail(new Error('El render dejó de responder. Reintentá en calidad baja; tu progreso no se borra.')),this.timeoutMs);
  }
  frame(packet){
    if(this.disposed||this.busy)return false;
    this.busy=true;this.inFlight=++this.serial;this.watch();
    try{this.worker.postMessage({type:'frame',...packet,id:this.inFlight});}catch(error){this.fail(error);}
    return true;
  }
  fail(error){error.preparing=this.preparing===true;const wasReady=this.ready;this.dispose(error);if(wasReady)this.onFailure(this,error);}
  dispose(reason=abortError()){
    if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);clearTimeout(this.frameTimer);this.removeAbort?.();
    this.status?.bitmap?.close();if(this.status)this.status.bitmap=null;
    this.worker.terminate();if(!this.ready)this.reject?.(reason);
  }
}

/** Images cross back; physics and input remain on the main thread. */
export class WorkerRenderer {
  static async create(canvas,options={}){
    const renderer=new WorkerRenderer(canvas,options);
    try{
      let session;
      try{session=await renderer.makeSession(options.quality??'auto',options.signal);}
      catch(error){
        if(error.name==='AbortError'||options.quality==='low'||error.workerUnavailable)throw error;
        renderer.pending=null;session=await renderer.makeSession('low',options.signal);renderer.recoveries=1;renderer.warning=`${error.message} ${RECOVERY_WARNING}`;
      }
      renderer.context=canvas.getContext('bitmaprenderer');
      if(!renderer.context){session.dispose();throw new Error('Presentación de imágenes no disponible.');}
      renderer.current=session;renderer.pending=null;renderer.present(session,session.status);return renderer;
    }catch(error){renderer.destroy();throw error;}
  }
  constructor(canvas,{workerFactory=defaultWorker,timeoutMs,prepareTimeoutMs,onContextLost=()=>{},onWarning=()=>{},engine=null,settings={}}={}){
    Object.assign(this,{canvas,workerFactory,timeoutMs:timeoutMs??RENDER_TIMEOUTS.frame,prepareTimeoutMs:prepareTimeoutMs??timeoutMs,onContextLost,onWarning});
    this.lastScene=snapshot(engine);this.lastSettings=settings;this.pending=null;this.current=null;this.epoch=0;this.lost=false;this.queued=null;this.recoveries=0;this.failedAutoTiers=new Set();
    this.resize();
  }
  resize(){this.size={width:this.canvas.clientWidth||globalThis.innerWidth||2,height:this.canvas.clientHeight||globalThis.innerHeight||2,dpr:globalThis.devicePixelRatio||1};}
  packet(){return {size:this.size,scene:this.lastScene,settings:this.lastSettings,reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true};}
  async makeSession(quality,signal,tier){
    const session=new WorkerSession(this.workerFactory,{timeoutMs:this.timeoutMs,prepareTimeoutMs:this.prepareTimeoutMs??preparationTimeout(tier??quality),onFrame:(s,data)=>this.present(s,data),onFailure:(s,error)=>this.failed(s,error),onPromotion:(s,tier)=>this.promote(s,tier)});
    this.pending=session;return session.start({quality,tier,...this.packet()},signal);
  }
  async promote(session,tier){
    if(session!==this.current||this.quality.mode!=='auto'||!['medium','high'].includes(tier))return;
    session.proposedTier=null;
    const notify=failed=>{if(!session.disposed)session.worker.postMessage({type:'promotion-result',tier,failed});};
    if(this.autoPromotion?.session===session&&this.autoPromotion.tier===tier)return;
    if(this.pending||this.failedAutoTiers.has(tier)){notify(this.failedAutoTiers.has(tier));return;}
    const controller=new AbortController(),attempt={controller,tier,session,previous:this.quality.tier,scale:this.quality.scale};this.autoPromotion=attempt;
    try{await this.requestQuality('auto',{signal:controller.signal,tier,automatic:true});}
    catch(error){const failed=attempt.pressureCancelled===true||error.name!=='AbortError';if(failed)this.failedAutoTiers.add(tier);notify(failed);}
    finally{if(this.autoPromotion===attempt)this.autoPromotion=null;}
  }
  async failed(session,error){
    if(session!==this.current||this.lost)return;
    this.queued=null;
    if(this.quality.mode==='auto'&&this.recoveries<1){
      this.recoveries++;this.recovering=true;const epoch=++this.epoch;
      this.pending?.dispose();this.pending=null;
      try{
        this.warning=RECOVERING_WARNING;this.onWarning(this.warning);
        const candidate=await this.makeSession('auto');
        if(this.destroyed||epoch!==this.epoch){candidate.dispose();return;}
        this.current=candidate;this.pending=null;this.recovering=false;
        this.warning=RECOVERY_WARNING;this.present(candidate,candidate.status);this.onWarning(this.warning);return;
      }catch(recoveryError){error=recoveryError;}
    }
    if(this.destroyed)return;
    this.lost=true;this.recovering=false;this.pending?.dispose();this.pending=null;this.onContextLost(error);
  }
  readStatus(data){
    this.quality={...data.quality,resetSamples:()=>{if(!this.lost&&!this.recovering)this.current?.worker.postMessage({type:'reset'});}};
    this.descriptionValue=data.description;
  }
  async requestQuality(mode,{signal,tier,automatic=false}={}){
    if(this.lost||this.recovering)throw new Error('El render no está disponible.');
    if(!automatic){this.autoPromotion?.controller.abort();this.autoPromotion=null;}
    const epoch=++this.epoch;this.pending?.dispose();this.pending=null;
    if(signal?.aborted)throw abortError();
    if(this.quality.mode===mode&&!tier)return;
    try{
      const candidate=await this.makeSession(mode,signal,tier);
      if(this.lost||signal?.aborted||epoch!==this.epoch){candidate.dispose();throw abortError();}
      const previous=this.current,previousSize={width:this.canvas.width,height:this.canvas.height};
      // Present the real validated candidate before retiring the previous session.
      this.current=candidate;this.pending=null;this.queued=null;
      try{this.present(candidate,candidate.status);}catch(error){this.current=previous;candidate.dispose();this.canvas.width=previousSize.width;this.canvas.height=previousSize.height;this.readStatus(previous.status);if(!previous.busy)previous.frame(this.packet());throw error;}
      previous?.dispose();this.warning=null;if(!automatic)this.failedAutoTiers.delete(this.quality.tier);
    }catch(error){if(epoch===this.epoch)this.pending=null;throw error;}
  }
  // RAF cadence is simulation cadence, not worker rendering duration.
  sample(){}
  draw(engine,settings){
    if(this.lost)return;this.lastScene=snapshot(engine);this.lastSettings=settings;this.resize();
    if(this.recovering)return;
    const packet=this.packet();
    if(this.current.busy){this.queued=packet;return;}
    this.current.frame(packet);
  }
  present(session,data){
    if(this.lost||session!==this.current){data.bitmap?.close();return;}
    const promotion=this.autoPromotion;
    if(promotion&&session===promotion.session&&(data.quality.tier!==promotion.previous||data.quality.scale<promotion.scale)){promotion.pressureCancelled=true;promotion.controller.abort();}
    this.readStatus(data);
    if(data.bitmap){
      const bitmap=data.bitmap;data.bitmap=null;
      try{
        if(this.canvas.width!==bitmap.width)this.canvas.width=bitmap.width;
        if(this.canvas.height!==bitmap.height)this.canvas.height=bitmap.height;
        this.context.transferFromImageBitmap(bitmap);
      }finally{bitmap.close();}
    }
    const queued=this.queued;this.queued=null;
    if(queued)session.frame(queued);
    // Initial measured pressure can propose a tier before ready. Deliver it only
    // after this session is current and its first bitmap has been presented.
    if(session.proposedTier)queueMicrotask(()=>{if(session.proposedTier&&!session.disposed)this.promote(session,session.proposedTier);});
  }
  pause(){this.queued=null;}
  description(){return this.descriptionValue??'Preparando';}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.lost=true;++this.epoch;this.queued=null;this.pending?.dispose();this.current?.dispose();}
}

/** Detect worker presentation before claiming the visible canvas. */
export async function createRenderer(canvas,options={}){
  if(options.signal?.aborted)throw abortError();
  const requested=options.quality??'auto',bootstrap={...options,quality:requested==='auto'?'auto':'low'};
  if(typeof Worker==='function'&&typeof OffscreenCanvas==='function'&&
      typeof OffscreenCanvas.prototype.transferToImageBitmap==='function'&&
      document.createElement('canvas').getContext('bitmaprenderer')){
    // Worker failure is already retried once in Low. Never repeat costly work on UI.
    try{const renderer=await WorkerRenderer.create(canvas,bootstrap);renderer.startupQuality=['low','auto'].includes(requested)?null:requested;return renderer;}catch(error){if(!error.workerUnavailable)throw error;}
  }
  const renderer=new Renderer(canvas,{...options,quality:'low',deferProgram:true});
  renderer.asyncCompile=true;renderer.lastScene=snapshot(options.engine);renderer.lastSettings=options.settings??{};
  try{
    await renderer.requestQuality(bootstrap.quality,{signal:options.signal});
    renderer.startupQuality=['low','auto'].includes(requested)?null:requested;return renderer;
  }catch(error){renderer.destroy();throw error;}
}
