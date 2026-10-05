import {Renderer,preparationTimeout} from './renderer.js';
import {WebGPURenderer} from './renderer-webgpu.js';

let renderer=null,offscreen=null,view=null,size=null,photoEpoch=0,operations=Promise.resolve();
function dimensions(next){
  if(size&&next.width===size.width&&next.height===size.height&&next.dpr===size.dpr)return;
  size=next;view.clientWidth=next.width;view.clientHeight=next.height;
  globalThis.innerWidth=next.width;globalThis.innerHeight=next.height;globalThis.devicePixelRatio=next.dpr;
  renderer?.resize();
}
function status(type){return {type,quality:{mode:renderer.quality.mode,tier:renderer.quality.tier,scale:renderer.quality.scale},description:renderer.description(),timing:renderer.lastTimingState??'wall',backend:renderer.backend??'WebGL',supportsPhoto:!!renderer.photo,width:offscreen.width,height:offscreen.height};}
async function render(data,type,publish=true){
  dimensions(data.size);renderer.motionQuery={matches:data.reduced};
  const started=performance.now();await renderer.draw(data.scene,data.settings);
  const bitmap=offscreen.transferToImageBitmap(),renderMs=performance.now()-started;
  try{
    const error=renderer.gl?.getError()??0;
    if(error!==(renderer.gl?.NO_ERROR??0)||!bitmap.width||!bitmap.height)throw new Error(`No se pudo dibujar esta calidad gráfica (WebGL ${error}).`);
    if(type!=='photo-frame')renderer.observeRender(renderMs);
    if(type==='ready')await renderer.settleRenderTiming();
    if(renderer.lost)throw new Error('Se perdió el contexto WebGL.');
    // Keep interaction guides aligned with this image while newer physics waits.
    const presentation={state:data.scene.state,transition:data.scene.transition??null,room:data.scene.room,target:data.scene.target,settings:data.settings,reduced:data.reduced,width:bitmap.width,height:bitmap.height};
    const message={...status(type),id:data.id,photoId:data.photoId,photoCount:renderer.photo?.count??0,photoDone:renderer.photo?.count===32,renderMs,bitmap,presentation};
    if(publish)self.postMessage(message,[bitmap]);else return message;
  }catch(error){bitmap.close();throw error;}
}
async function handle(data){
  try{
    if(data.type==='init'){
      let published=false,provisionalError=null;
      const makeSurface=()=>{
        offscreen=new OffscreenCanvas(2,2);size=null;
        view={clientWidth:2,clientHeight:2,getContext:(...args)=>offscreen.getContext(...args),
          get width(){return offscreen.width;},set width(n){offscreen.width=n;},get height(){return offscreen.height;},set height(n){offscreen.height=n;},
          addEventListener:(...args)=>offscreen.addEventListener(...args),removeEventListener:(...args)=>offscreen.removeEventListener(...args)};
        globalThis.innerWidth=2;globalThis.innerHeight=2;globalThis.devicePixelRatio=1;
      };
      const options={quality:data.quality,deferProgram:true,onContextLost:error=>{
        const message=error?.message??'Se perdió el contexto gráfico.';
        provisionalError=new Error(message);if(published)self.postMessage({type:'error',message});
      }};
      const prepare=async()=>{
        renderer.externallyTimed=true;renderer.asyncCompile=true;
        if(data.quality==='auto'&&['medium','high'].includes(data.tier))renderer.quality.tier=data.tier;
        renderer.onAutoTier=tier=>self.postMessage({type:'promotion',tier});self.postMessage({type:'preparing'});
        const deadline=performance.now()+(data.prepareTimeoutMs??preparationTimeout(renderer.quality.tier));
        const tiers=data.quality!=='auto'?[renderer.quality.tier]:renderer.quality.tier==='high'?['low','medium','high']:renderer.quality.tier==='medium'?['low','medium']:['low'];
        for(const tier of tiers){await renderer.prepareProgram(tier,{timeoutMs:Math.max(0,deadline-performance.now())});if(provisionalError)throw provisionalError;}
        self.postMessage({type:'prepared'});if(!data.scene)throw new Error('No hay una escena disponible para validar la calidad.');
        const ready=await render(data,'ready',false);if(provisionalError||renderer.lost){ready.bitmap.close();throw provisionalError??new Error('La primera imagen perdió su dispositivo.');}
        published=true;self.postMessage(ready,[ready.bitmap]);
      };
      makeSurface();
      if(data.backend!=='webgl')try{
        renderer=await WebGPURenderer.create(view,options);if(provisionalError)throw provisionalError;await prepare();return;
      }catch(error){renderer?.destroy();renderer=null;provisionalError=null;self.postMessage({type:'backend-fallback'});makeSurface();}
      renderer=new Renderer(view,options);await prepare();return;
    }
    if(!renderer)return;
    if(data.type==='photo'){
      if(!renderer.photo)throw new Error('La ruta actual no admite fotos HDR.');
      if(data.photoEpoch!==photoEpoch){self.postMessage({type:'photo-cancelled',photoId:data.photoId});return;}
      dimensions(data.size);renderer.startPhoto();const version=renderer.photo.version;
      while(!renderer.lost&&renderer.photo.version===version&&renderer.photo.active){await render(data,'photo-frame');await new Promise(resolve=>setTimeout(resolve,0));}
      if(renderer.photo.version===version&&renderer.photo.count<32)self.postMessage({type:'photo-cancelled',photoId:data.photoId});
      return;
    }
    if(data.type==='promotion-result'){if(renderer.autoPending?.tier===data.tier)renderer.autoPending=null;if(data.failed)renderer.failedAutoTiers.add(data.tier);renderer.quality.resetSamples();return;}
    if(data.type==='reset'){renderer.quality.resetSamples();return;}
    if(data.type==='frame')await render(data,'frame');
  }catch(error){self.postMessage({type:'error',message:error?.message??String(error)});}
}
// GPU resources (notably the timestamp map buffer) have exactly one draw owner.
// Cancel can interrupt an awaited draw; subsequent work waits for its cleanup.
self.onmessage=({data})=>{
  if(data.type==='photo-cancel'){++photoEpoch;renderer?.cancelPhoto();return Promise.resolve();}
  if(data.type==='photo'){data.photoEpoch=++photoEpoch;renderer?.cancelPhoto();}
  if(data.type==='frame'&&renderer?.photo?.active){++photoEpoch;renderer.cancelPhoto();}
  const task=operations.then(()=>handle(data));operations=task.catch(()=>{});return task;
};
