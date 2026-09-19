import {Renderer} from './renderer.js';

let renderer=null,offscreen=null,view=null,size=null;
function dimensions(next){
  if(size&&next.width===size.width&&next.height===size.height&&next.dpr===size.dpr)return;
  size=next;view.clientWidth=next.width;view.clientHeight=next.height;
  globalThis.innerWidth=next.width;globalThis.innerHeight=next.height;globalThis.devicePixelRatio=next.dpr;
  renderer?.resize();
}
function status(type){return {type,quality:{mode:renderer.quality.mode,tier:renderer.quality.tier,scale:renderer.quality.scale},description:renderer.description(),width:offscreen.width,height:offscreen.height};}
self.onmessage=({data})=>{
  try{
    if(data.type==='init'){
      offscreen=new OffscreenCanvas(2,2);
      view={clientWidth:2,clientHeight:2,getContext:(...args)=>offscreen.getContext(...args),
        get width(){return offscreen.width;},set width(n){offscreen.width=n;},get height(){return offscreen.height;},set height(n){offscreen.height=n;},
        addEventListener:(...args)=>offscreen.addEventListener(...args),removeEventListener:(...args)=>offscreen.removeEventListener(...args)};
      globalThis.innerWidth=2;globalThis.innerHeight=2;globalThis.devicePixelRatio=1;
      renderer=new Renderer(view,{quality:data.quality,deferProgram:true,onContextLost:()=>self.postMessage({type:'error',message:'Se perdió el contexto WebGL.'})});
      self.postMessage({type:'preparing'});renderer.program();
      renderer.motionQuery={matches:data.reduced};
      // Some drivers defer compilation until the first draw. Warm only 2×2 pixels,
      // in this candidate worker, before reporting that a quality is usable.
      if(data.scene){renderer.draw(data.scene,data.settings);offscreen.transferToImageBitmap().close();}
      const error=renderer.gl.getError();
      if(error!==renderer.gl.NO_ERROR)throw new Error(`No se pudo preparar esta calidad gráfica (WebGL ${error}).`);
      dimensions(data.size);self.postMessage(status('ready'));return;
    }
    if(!renderer)return;
    if(data.type==='reset'){renderer.quality.resetSamples();return;}
    if(data.type==='frame'){
      dimensions(data.size);renderer.motionQuery={matches:data.reduced};
      if(data.elapsed>0)renderer.sample(data.elapsed);
      renderer.draw(data.scene,data.settings);
      const bitmap=offscreen.transferToImageBitmap();
      try{self.postMessage({...status('frame'),bitmap},[bitmap]);}catch(error){bitmap.close();throw error;}
    }
  }catch(error){self.postMessage({type:'error',message:error?.message??String(error)});}
};
