import {Renderer,preparationTimeout} from './renderer.js';

let renderer=null,offscreen=null,view=null,size=null;
function dimensions(next){
  if(size&&next.width===size.width&&next.height===size.height&&next.dpr===size.dpr)return;
  size=next;view.clientWidth=next.width;view.clientHeight=next.height;
  globalThis.innerWidth=next.width;globalThis.innerHeight=next.height;globalThis.devicePixelRatio=next.dpr;
  renderer?.resize();
}
function status(type){return {type,quality:{mode:renderer.quality.mode,tier:renderer.quality.tier,scale:renderer.quality.scale},description:renderer.description(),timing:renderer.lastTimingState??'wall',width:offscreen.width,height:offscreen.height};}
async function render(data,type){
  dimensions(data.size);renderer.motionQuery={matches:data.reduced};
  const started=performance.now();renderer.draw(data.scene,data.settings);
  const bitmap=offscreen.transferToImageBitmap(),renderMs=performance.now()-started;
  try{
    const error=renderer.gl.getError();
    if(error!==renderer.gl.NO_ERROR||!bitmap.width||!bitmap.height)throw new Error(`No se pudo dibujar esta calidad gráfica (WebGL ${error}).`);
    renderer.observeRender(renderMs);
    if(type==='ready')await renderer.settleRenderTiming();
    if(renderer.lost)throw new Error('Se perdió el contexto WebGL.');
    self.postMessage({...status(type),id:data.id,renderMs,bitmap},[bitmap]);
  }catch(error){bitmap.close();throw error;}
}
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      offscreen=new OffscreenCanvas(2,2);
      view={clientWidth:2,clientHeight:2,getContext:(...args)=>offscreen.getContext(...args),
        get width(){return offscreen.width;},set width(n){offscreen.width=n;},get height(){return offscreen.height;},set height(n){offscreen.height=n;},
        addEventListener:(...args)=>offscreen.addEventListener(...args),removeEventListener:(...args)=>offscreen.removeEventListener(...args)};
      globalThis.innerWidth=2;globalThis.innerHeight=2;globalThis.devicePixelRatio=1;
      renderer=new Renderer(view,{quality:data.quality,deferProgram:true,onContextLost:()=>self.postMessage({type:'error',message:'Se perdió el contexto WebGL.'})});
      renderer.externallyTimed=true;renderer.asyncCompile=true;
      if(data.quality==='auto'&&['medium','high'].includes(data.tier))renderer.quality.tier=data.tier;
      renderer.onAutoTier=tier=>self.postMessage({type:'promotion',tier});
      self.postMessage({type:'preparing'});
      // Cache the rescue tier before preparing the requested program.
      const deadline=performance.now()+(data.prepareTimeoutMs??preparationTimeout(renderer.quality.tier));
      const preparation=()=>({timeoutMs:Math.max(0,deadline-performance.now())});
      const tiers=data.quality==='auto'&&renderer.quality.tier==='high'?['low','medium','high']:['low',renderer.quality.tier];
      for(const tier of tiers)await renderer.prepareProgram(tier,preparation());
      self.postMessage({type:'prepared'});
      if(!data.scene)throw new Error('No hay una escena disponible para validar la calidad.');
      // Readiness includes a real image at the requested drawing size, not a 2×2 warmup.
      await render(data,'ready');return;
    }
    if(!renderer)return;
    if(data.type==='promotion-result'){if(renderer.autoPending?.tier===data.tier)renderer.autoPending=null;if(data.failed)renderer.failedAutoTiers.add(data.tier);renderer.quality.resetSamples();return;}
    if(data.type==='reset'){renderer.quality.resetSamples();return;}
    if(data.type==='frame')await render(data,'frame');
  }catch(error){self.postMessage({type:'error',message:error?.message??String(error)});}
};
