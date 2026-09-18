/** Presentation only. Effects never own timers used by the simulation. */
export class Feedback {
  constructor(root,getSettings,motion){this.root=root;this.getSettings=getSettings;this.motion=motion;this.active=new Set();this.lastContact=0;
    this.pointer=e=>{const b=e.target.closest('button');if(!b||b.disabled||!this.enabled())return;const r=b.getBoundingClientRect(),dot=document.createElement('span');dot.className='press-ripple';dot.setAttribute('aria-hidden','true');dot.style.left=`${e.clientX-r.left}px`;dot.style.top=`${e.clientY-r.top}px`;b.append(dot);const a=dot.animate([{transform:'translate(-50%,-50%) scale(.1)',opacity:.3},{transform:'translate(-50%,-50%) scale(3)',opacity:0}],{duration:420,easing:'ease-out'});this.track(a,()=>dot.remove());};
    root.addEventListener('pointerdown',this.pointer);
  }
  enabled(){return this.getSettings().effects!==false&&!this.motion.matches&&!document.hidden;}
  track(animation,cleanup=()=>{}){this.active.add(animation);animation.finished.catch(()=>{}).finally(()=>{this.active.delete(animation);cleanup();});}
  pulse(node,kind='soft'){if(!node||!this.enabled()||!node.animate)return;const frames=kind==='impact'?[{opacity:.7},{opacity:1}]:[{transform:'scale(.97)'},{transform:'scale(1.025)'},{transform:'scale(1)'}];this.track(node.animate(frames,{duration:kind==='impact'?140:360,easing:'cubic-bezier(.2,.7,.2,1)'}));}
  event(event,ui){
    if(event.type==='goal')this.pulse(ui.el('stepTrack'));
    if(event.type==='jump'||event.type==='bumper')this.pulse(ui.el('surfaceTag'));
    if(event.type==='complete')this.pulse(ui.el('victoryTitle'));
    if(event.type==='impact'&&event.power>.55&&performance.now()-this.lastContact>250){this.lastContact=performance.now();this.pulse(ui.el('gravityCompass'),'impact');}
  }
  clear(){for(const a of this.active)a.cancel();this.active.clear();}
  destroy(){this.clear();this.root.removeEventListener('pointerdown',this.pointer);}
}
