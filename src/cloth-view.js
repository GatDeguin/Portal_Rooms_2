import {hasSurfaceEffects} from './surface-effects-geometry.js';
import {cameraForHands} from './hand-view.js';
import {ClothRenderer} from './cloth-renderer.js';

/** Select one coherent camera, room and fabric mesh, even when a worker is late. */
export function clothFrameForPresentation(engine,settings,{presentation=null,reduced=false,width,height}={}){
 const shown=presentation?.state?presentation:{state:engine.state,room:engine.room,target:engine.target,transition:engine.transition??null,settings,reduced,width,height};
 if(shown.room&&shown.room.id!==engine.room.id)return null;
 const scene={state:shown.state,transition:shown.transition??null,room:shown.room??engine.room,target:shown.target??engine.target},applied=shown.settings??settings,isReduced=shown.reduced??reduced;
 return {cloths:shown.state.cloths??[],hasGeometry:!!shown.state.cloths?.length||(applied.effects!==false&&hasSurfaceEffects(shown.state)),scene,settings:applied,reduced:isReduced,camera:cameraForHands(shown.state,applied,{width,height,reduced:isReduced,renderWidth:shown.width??width,renderHeight:shown.height??height})};
}

/** Cloth is independent of hand tracking and has no simulation/render clock. */
export class ClothView{
 constructor(container){
  this.container=container;
  if(!container||!globalThis.document)return;
  this.canvas=document.createElement('canvas');this.canvas.className='cloth-world';this.canvas.dataset.render='cloth';this.canvas.hidden=true;this.canvas.setAttribute('aria-hidden','true');
  Object.assign(this.canvas.style,{position:'absolute',pointerEvents:'none',zIndex:'1'});
  this.roomCanvas=container.querySelector('#gl');if(this.roomCanvas)this.roomCanvas.after(this.canvas);else container.prepend(this.canvas);
 }
 prepare(){
  if(this.renderer||this.error||this.destroyed||!this.canvas)return;
  try{this.renderer=new ClothRenderer(this.canvas);}catch(error){this.error=error;this.canvas.hidden=true;this.canvas.dataset.fallback='unavailable';}
 }
 render(engine,settings,{presentation=null,reduced=false}={}){
  if(this.destroyed||!this.canvas)return;
  const parent=this.container.getBoundingClientRect(),rect=this.roomCanvas?.getBoundingClientRect()??parent,width=rect.width,height=rect.height;
  if(!width||!height){this.clear();return;}
  const frame=clothFrameForPresentation(engine,settings,{presentation,reduced,width,height});
  if(!frame?.hasGeometry){this.clear();return;}
  Object.assign(this.canvas.style,{left:`${rect.left-parent.left}px`,top:`${rect.top-parent.top}px`,width:`${width}px`,height:`${height}px`});
  this.prepare();this.renderer?.render(frame.cloths,frame.camera,frame.scene,frame.settings,frame.reduced);
 }
 clear(){this.renderer?.clear();if(this.canvas)this.canvas.hidden=true;}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.renderer?.destroy();this.canvas?.remove();}
}
