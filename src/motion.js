/** Presentation only. Base DOM/CSS always describes the final, usable state. */
export class UIMotion {
  constructor(root){
    this.root=root;this.active=new Map();this.enabled=true;this.reduced=false;
    const style=getComputedStyle(root),read=name=>style.getPropertyValue('--motion-'+name).trim();
    this.tokens={response:parseFloat(read('response')),replace:parseFloat(read('replace')),context:parseFloat(read('context')),continuity:parseFloat(read('continuity')),confirm:parseFloat(read('confirm')),arrival:read('arrival'),distance:parseFloat(read('distance')),travelLimit:parseFloat(read('travel-limit')),legible:parseFloat(read('legible'))};
  }
  configure({enabled=true,reduced=false}={}){
    this.enabled=enabled;this.reduced=reduced;if(!this.allowed)this.cancelAll();
  }
  get allowed(){return this.enabled&&!this.reduced&&!document.hidden;}
  cancel(element){const animation=this.active.get(element);this.active.delete(element);animation?.cancel();}
  cancelWithin(container){for(const element of this.active.keys())if(element===container||container.contains(element))this.cancel(element);}
  cancelAll(){for(const element of [...this.active.keys()])this.cancel(element);}
  animate(element,keyframes,intent){
    this.cancel(element);
    if(!this.allowed||!element?.isConnected||element.closest('[hidden]')||typeof element.animate!=='function')return;
    const duration=this.tokens[intent];if(!Number.isFinite(duration)||duration<=0)return;
    const animation=element.animate(keyframes,{duration,easing:this.tokens.arrival,fill:'none'});
    this.active.set(element,animation);
    // A superseded finished promise cannot clean up the replacement animation.
    const release=()=>{if(this.active.get(element)===animation){this.active.delete(element);animation.cancel();}};
    animation.finished.then(release,error=>{release();if(error.name!=='AbortError')console.error('UI motion:',error);});
  }
  enter(element){
    this.animate(element,[{opacity:this.tokens.legible,transform:`translateY(${this.tokens.distance}px)`},{opacity:1,transform:'none'}],'context');
  }
  reveal(element){
    const opacity=this.active.has(element)?getComputedStyle(element).opacity:this.tokens.legible;
    this.animate(element,[{opacity},{opacity:1}],'replace');
  }
  confirm(path){this.animate(path,[{strokeDashoffset:1},{strokeDashoffset:0}],'confirm');}
  capture(elements){
    if(!this.allowed)return new Map();
    return new Map([...elements].filter(el=>el.isConnected&&el.getClientRects().length).map(el=>[el,el.getBoundingClientRect()]));
  }
  layout(before,elements){
    if(!before.size||!this.allowed)return;
    // All layout reads precede animation writes. Translate only; never scale text.
    const after=this.capture(elements);
    // Growing a collection introduces controls into the old positions. Settle
    // directly rather than fly retained cards over these immediately usable targets.
    if([...after.keys()].some(element=>!before.has(element)))return;
    const dialog=this.root.querySelector('dialog[open]'),bounds=dialog?.getBoundingClientRect()??{top:0,left:0,right:innerWidth,bottom:innerHeight};
    const visible=r=>r.bottom>Math.max(0,bounds.top)&&r.top<Math.min(innerHeight,bounds.bottom)&&r.right>Math.max(0,bounds.left)&&r.left<Math.min(innerWidth,bounds.right);
    for(const [element,to] of after){
      const from=before.get(element);if(!from||!visible(from)||!visible(to)||Math.abs(from.width-to.width)>1||Math.abs(from.height-to.height)>1)continue;
      const x=from.left-to.left,y=from.top-to.top,distance=Math.hypot(x,y);
      if(distance<1||distance>this.tokens.travelLimit)continue;
      this.animate(element,[{transform:`translate(${x}px,${y}px)`},{transform:'none'}],'continuity');
    }
  }
}
