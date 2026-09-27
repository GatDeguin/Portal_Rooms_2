import {HAND_CONNECTIONS} from './hand-tracking.js';
import {AtelierHandRenderer} from './hand-renderer.js';

const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const length=Math.hypot(...a);return a.map(value=>value/length);};
const fract=x=>x-Math.floor(x);
const hash=(x,y)=>{x=((x%251)+251)%251;y=((y%251)+251)%251;return fract(17*fract(x*.1031+y*.11369)*fract(y*.13787+x*.09987));};

// Inverse of shaders.js cameraRay, including its radial lens. Coordinates stay
// in the same world space as hand-physics; CSS pixels are independent of DPR.
export function cameraForHands(state,settings,{width,height,reduced=false,renderWidth=width,renderHeight=height}){
  const c=state.cube,motion=settings.dynamicCamera&&!reduced?1:0,effects=settings.effects!==false&&!reduced?1:0;
  const [qx,qy,qz,qw]=c.q;
  const extent=.245*(Math.abs(2*(qx*qy+qw*qz))+Math.abs(1-2*(qx*qx+qz*qz))+Math.abs(2*(qy*qz-qw*qx)));
  const cubeY=c.y+extent-.245,gx=state.gravity.x*motion,gz=state.gravity.z*motion,land=renderWidth>=renderHeight;
  const origin=[gx*.50+c.x*.055*motion,1.42+cubeY*.06*motion+Math.abs(gz)*.10,(land?5.08:5.78)+gz*.30];
  const target=[c.x*.05*motion,.82+cubeY*.18*motion,-.56+c.z*.04*motion];
  const forward=normalize(target.map((value,i)=>value-origin[i])),right=normalize(cross(forward,[0,1,0])),up=cross(right,forward);
  const shake=state.shake*motion*effects*.018;
  return {origin,forward,right,up,fov:land?1.34:1.02,width,height,renderWidth,renderHeight,jitter:[(hash(state.time,1.3)-.5)*shake,(hash(2.7,state.time)-.5)*shake]};
}
export function projectPoint(point,camera){
  if(!point)return null;
  const delta=[point.x,point.y,point.z].map((value,i)=>value-camera.origin[i]),depth=dot(delta,camera.forward);
  if(!Number.isFinite(depth)||depth<=.05)return null;
  const dx=dot(delta,camera.right)*camera.fov/depth,dy=dot(delta,camera.up)*camera.fov/depth,distorted=Math.hypot(dx,dy);
  let radius=distorted;
  for(let i=0;i<6;i++)radius-=(radius+.035*radius**3-distorted)/(1+.105*radius**2);
  const scale=distorted>1e-9?radius/distorted:1;
  return {x:((dx*scale-camera.jitter[0])*camera.renderHeight/2+camera.renderWidth/2)*camera.width/camera.renderWidth,y:(camera.renderHeight/2-(dy*scale-camera.jitter[1])*camera.renderHeight/2)*camera.height/camera.renderHeight,depth};
}
export function handInteraction(hands,grab){
  if(hands.some(hand=>hand.id===grab))return {kind:'grab',message:'Cubo agarrado · abrí la pinza para soltar'};
  if(hands.some(hand=>hand.pinch.active))return {kind:'pinch',message:'Pinza cerrada · acercala al cubo para agarrar'};
  if(hands.length)return {kind:'open',message:'Mano abierta · empujá con los dedos o la palma'};
  return {kind:'searching',message:'Mostrá una mano completa frente a la cámara'};
}

/** Articulated skin and room shadows, with the original guide as a loading/failure fallback. */
export class HandView{
  constructor(canvas,feedback){this.canvas=canvas;this.feedback=feedback;this.ctx=canvas.getContext('2d');}
  prepare(){
    if(this.loading||this.meshView||this.meshError||this.destroyed||!globalThis.document)return;
    this.meshCanvas=document.createElement('canvas');this.meshCanvas.className='hand-world';this.meshCanvas.hidden=true;
    this.meshCanvas.setAttribute('aria-hidden','true');this.meshCanvas.dataset.render='atelier-v03';
    this.canvas.before(this.meshCanvas);this.abort=new AbortController();
    this.loading=AtelierHandRenderer.create(this.meshCanvas,{signal:this.abort.signal}).then(view=>{
      if(this.destroyed){view.destroy();return;}this.meshView=view;
    }).catch(error=>{if(!this.destroyed){this.meshError=error;this.meshCanvas.remove();}}).finally(()=>{this.loading=null;});
  }
  destroy(){this.destroyed=true;this.abort?.abort();this.meshView?.destroy();this.meshCanvas?.remove();this.clear();}
  clear(){
    this.meshView?.clear();if(this.meshCanvas)this.meshCanvas.hidden=true;
    this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);this.canvas.hidden=true;this.feedback.hidden=true;
  }
  render(hands,engine,settings,{enabled=false,reduced=false,message='',presentation=null}={}){
    if(!enabled||!this.ctx){this.clear();return;}
    this.prepare();
    const width=this.canvas.clientWidth||this.canvas.parentElement.clientWidth,height=this.canvas.clientHeight||this.canvas.parentElement.clientHeight;
    if(!width||!height){this.clear();return;}
    const dpr=Math.min(globalThis.devicePixelRatio||1,2),ctx=this.ctx;
    if(this.canvas.width!==Math.round(width*dpr)||this.canvas.height!==Math.round(height*dpr)){this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const shown=presentation?.state?presentation:{state:engine.state,settings,reduced,width,height};
    const camera=cameraForHands(shown.state,shown.settings,{width,height,reduced:shown.reduced,renderWidth:shown.width,renderHeight:shown.height});
    this.canvas.hidden=false;
    const scene={state:shown.state,room:presentation?.room??engine.room,target:presentation?.target??engine.target};
    const volume=this.meshView?.render(hands,camera,scene,settings,engine.handGrab)===true;
    // A lightweight guide remains available while local assets load or GL is unavailable.
    const ordered=[...hands].sort((a,b)=>(projectPoint(b.palm,camera)?.depth??0)-(projectPoint(a.palm,camera)?.depth??0));
    for(const hand of ordered){if(!volume)this.drawHand(hand,camera,{state:shown.state,handGrab:engine.handGrab});else this.drawInteraction(hand,camera,engine.handGrab);}
    const interaction=handInteraction(hands,engine.handGrab);
    this.feedback.dataset.state=interaction.kind;const text=(this.meshError||this.meshView?.error?'Vista simplificada · ':'')+(hands.length?interaction.message:message||interaction.message);
    if(this.feedback.textContent!==text)this.feedback.textContent=text;
    this.feedback.hidden=false;
  }
  drawInteraction(hand,camera,grab){
    if(!hand.pinch.active)return;
    const p=projectPoint(hand.pinch,camera);if(!p)return;
    const ctx=this.ctx;ctx.save();ctx.strokeStyle=hand.id===grab?'#77efb6':'#ffd479';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(p.x,p.y,hand.id===grab?14:9,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  drawHand(hand,camera,engine){
    if(hand.joints?.length!==21)return;
    const ctx=this.ctx,joints=hand.joints.map(point=>projectPoint(point,camera));
    const grabbed=hand.id===engine.handGrab,color=grabbed?'#77efb6':hand.pinch.active?'#ffd479':'#8cead9';
    const line=(a,b)=>{if(a&&b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}};
    const circle=(p,r,fill=false)=>{if(!p)return;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);if(fill)ctx.fill();else ctx.stroke();};
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    const palm=projectPoint(hand.palm,camera),floor=projectPoint({...hand.palm,y:.02},camera);
    ctx.strokeStyle=color;ctx.globalAlpha=.3;ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();line(palm,floor);ctx.stroke();ctx.setLineDash([]);
    if(floor){ctx.beginPath();ctx.ellipse(floor.x,floor.y,13,4,0,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=.14;ctx.fillStyle=color;ctx.beginPath();
    const polygon=[0,5,9,13,17].map(i=>joints[i]);
    if(polygon.every(Boolean)){ctx.moveTo(polygon[0].x,polygon[0].y);for(const point of polygon.slice(1))ctx.lineTo(point.x,point.y);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=.9;ctx.beginPath();for(const [a,b] of HAND_CONNECTIONS)line(joints[a],joints[b]);
    ctx.strokeStyle='#071019';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=color;for(const point of joints)circle(point,2.5,true);
    ctx.lineWidth=1.5;for(const i of [4,8,12,16,20])circle(joints[i],5);
    circle(palm,8);
    const pinch=projectPoint(hand.pinch,camera);
    if(hand.pinch.active){ctx.lineWidth=2;circle(pinch,12);circle(pinch,4,true);}
    if(grabbed){
      const c=engine.state.cube,cube=projectPoint({x:c.x,y:c.y+.24,z:c.z},camera);
      ctx.beginPath();line(pinch,cube);ctx.lineWidth=2;ctx.stroke();circle(cube,18);
    }
    ctx.restore();
  }
}
