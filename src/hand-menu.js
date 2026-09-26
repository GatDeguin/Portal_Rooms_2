import {clamp} from './math.js';
import {HAND_CONNECTIONS} from './hand-tracking.js';

/** A pinch is a press edge, never a repeated click or a carried gameplay grab. */
export class MenuPinch{
  constructor(){this.reset();}
  reset(){this.context=null;this.handId=null;this.armed=false;this.pressed=false;}
  update(context,hand){
    if(!hand){this.reset();return false;}
    if(this.context!==context||this.handId!==hand.id){this.reset();this.context=context;this.handId=hand.id;}
    if(!hand.pinch.active){this.armed=true;this.pressed=false;return false;}
    if(this.pressed)return false;
    this.pressed=true;const click=this.armed;this.armed=false;return click;
  }
}
// The central 80% of the camera reaches the entire menu without stretching an arm.
export function menuPoint(screen,width,height){
  return {x:clamp((screen.x-.1)/.8*width,12,width-12),y:clamp((screen.y-.1)/.8*height,12,height-12)};
}
export class HandMenu{
  constructor({layer,canvas,cursor,hint,win=globalThis}){
    Object.assign(this,{layer,canvas,cursor,hint,win});this.doc=layer.ownerDocument;this.ctx=canvas.getContext('2d');this.pinch=new MenuPinch();
    this.dialog=null;this.handId=null;this.target=null;this.drag=null;this.lastTime=0;
  }
  highlight(target){
    if(this.target===target)return;
    this.target?.classList.remove('hand-target');this.target=target;target?.classList.add('hand-target');this.onTarget?.(target);
  }
  finishDrag(){
    const drag=this.drag;this.drag=null;
    if(drag?.isConnected)drag.dispatchEvent(new this.win.Event('change',{bubbles:true}));
  }
  clear(){
    this.finishDrag();this.highlight(null);this.pinch.reset();this.handId=null;this.dialog=null;this.lastTime=0;
    this.cursor.hidden=true;
    if(this.layer.hidePopover&&this.layer.matches(':popover-open'))this.layer.hidePopover();
    this.layer.hidden=true;this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);
  }
  hit(point,dialog){
    const hit=this.doc.elementFromPoint(point.x,point.y);
    let target=hit?.closest('button,input[type="checkbox"],input[type="radio"],input[type="range"],select,summary');
    target??=hit?.closest('label')?.control;
    if(!target||!dialog.contains(target)||target.matches(':disabled')||target.getAttribute('aria-disabled')==='true'||!target.getClientRects().length)return null;
    return target;
  }
  range(target,x){
    const r=target.getBoundingClientRect(),min=Number(target.min||0),max=Number(target.max||100),step=target.step==='any'?0:Number(target.step||1);
    let value=min+clamp((x-r.left)/r.width,0,1)*(max-min);if(step)value=min+Math.round((value-min)/step)*step;
    const previous=target.value;target.value=String(clamp(value,min,max));
    if(target.value!==previous)target.dispatchEvent(new this.win.Event('input',{bubbles:true}));
  }
  activate(target,point){
    target.focus({preventScroll:true});
    if(target.dataset.handPhysical)return;
    if(target.matches('input[type="range"]')){this.drag=target;this.range(target,point.x);return;}
    if(target.matches('select')){
      const options=[...target.options].filter(option=>!option.disabled&&!option.parentElement.disabled);
      if(options.length<2)return;
      const index=options.indexOf(target.selectedOptions[0]);target.value=options[(index+1)%options.length].value;
      target.dispatchEvent(new this.win.Event('input',{bubbles:true}));target.dispatchEvent(new this.win.Event('change',{bubbles:true}));return;
    }
    target.click();
  }
  scroll(dialog,point,dt){
    const r=dialog.getBoundingClientRect(),top=Math.max(0,r.top),bottom=Math.min(this.win.innerHeight,r.bottom);
    if(point.x<r.left||point.x>r.right||dialog.scrollHeight<=dialog.clientHeight)return 0;
    const direction=point.y<top+36?-1:point.y>bottom-36?1:0;
    const before=dialog.scrollTop;dialog.scrollTop+=direction*360*dt;return dialog.scrollTop===before?0:direction;
  }
  update(hands,dialog,now){
    if(!dialog?.open||this.doc.hidden||!this.doc.hasFocus()){this.clear();return;}
    const usable=hands.filter(hand=>Number.isFinite(hand.screen?.x)&&Number.isFinite(hand.screen?.y));
    const hand=usable.find(item=>item.id===this.handId)??usable[0];
    if(!hand){this.clear();return;}
    if(this.dialog!==dialog){
      this.clear();this.dialog=dialog;dialog.append(this.layer);this.layer.hidden=false;
      // A manual popover is above the native modal and cannot intercept input.
      if(this.layer.showPopover)this.layer.showPopover();
    }
    if(this.handId!==hand.id){this.finishDrag();this.handId=hand.id;}
    const dt=this.lastTime?Math.min((now-this.lastTime)/1000,.05):0;this.lastTime=now;
    const point=menuPoint(hand.screen,this.win.innerWidth,this.win.innerHeight),pressed=this.pinch.update(dialog,hand);
    const scroll=!hand.pinch.active?this.scroll(dialog,point,dt):0;
    const target=scroll?null:this.hit(point,dialog);this.highlight(target);
    if(this.drag){
      if(hand.pinch.active&&this.drag.isConnected&&!this.drag.disabled)this.range(this.drag,point.x);else this.finishDrag();
    }
    this.draw(hand,point);
    this.cursor.hidden=false;this.cursor.style.transform=`translate(${point.x}px,${point.y}px)`;
    this.cursor.dataset.pinch=String(hand.pinch.active);this.cursor.dataset.target=String(!!target);
    const label=(target?.getAttribute('aria-label')||target?.labels?.[0]?.textContent||target?.textContent||'').trim().replace(/\s+/g,' ').slice(0,72);
    this.hint.textContent=target?.dataset.handPhysical||(hand.pinch.active?'Abrí la pinza para volver a elegir':scroll?(scroll>0?'↓ Bajando':'↑ Subiendo'):
      target?.matches('select')?`${label} · pinza: siguiente opción`:target?.matches('input[type="range"]')?'Cerrá la pinza y mové la mano para ajustar':
      target?`${label} · juntá índice y pulgar`:'Apuntá y hacé pinza para elegir · bordes: desplazar');
    // Set the latch before dispatch: clicking can synchronously change the dialog.
    if(pressed&&target)this.activate(target,point);
  }
  draw(hand,point){
    if(!this.ctx)return;
    const width=this.win.innerWidth,height=this.win.innerHeight,dpr=Math.min(this.win.devicePixelRatio||1,2),ctx=this.ctx;
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    if(hand.screen.joints?.length!==21)return;
    const offset={x:point.x-(hand.screen.x-.1)/.8*width,y:point.y-(hand.screen.y-.1)/.8*height};
    const joints=hand.screen.joints.map(p=>({x:(p.x-.1)/.8*width+offset.x,y:(p.y-.1)/.8*height+offset.y}));
    ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    for(const [a,b] of HAND_CONNECTIONS){ctx.moveTo(joints[a].x,joints[a].y);ctx.lineTo(joints[b].x,joints[b].y);}
    ctx.strokeStyle='#07101999';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle=hand.pinch.active?'#ffd479a6':'#8cead980';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=hand.pinch.active?'#ffd479':'#8cead9';
    for(const i of [4,8,12,16,20]){ctx.beginPath();ctx.arc(joints[i].x,joints[i].y,3,0,Math.PI*2);ctx.fill();}
  }
}
