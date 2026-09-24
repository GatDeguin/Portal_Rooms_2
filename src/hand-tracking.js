import {clamp} from './math.js';

export const MEDIAPIPE_VERSION='1.0.1';
export const MEDIAPIPE_MODULE=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`;
export const MEDIAPIPE_WASM=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const HAND_MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const PALM=[0,5,9,13,17],FINGERS=[4,8,12,16,20];
const CONNECTIONS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a,b,t)=>a+(b-a)*t;

export function handMetrics(landmarks){
  if(!Array.isArray(landmarks)||landmarks.length<21)return null;
  const palm=PALM.reduce((p,i)=>({x:p.x+landmarks[i].x/PALM.length,y:p.y+landmarks[i].y/PALM.length,z:p.z+(landmarks[i].z??0)/PALM.length}),{x:0,y:0,z:0});
  const span=distance(landmarks[5],landmarks[17]);
  const length=distance(landmarks[0],landmarks[9]);
  return {x:palm.x,y:palm.y,z:palm.z,scale:(span+length*1.12)*.5};
}
export function pinchRatio(landmarks){
  const metrics=handMetrics(landmarks);if(!metrics||metrics.scale<1e-5)return Infinity;
  return distance(landmarks[4],landmarks[8])/metrics.scale;
}
export function mapLandmarkToWorld(landmark,metrics,calibration){
  const base=calibration??{y:.69,scale:.14};
  const scale=Math.max(base.scale,1e-4),ratio=clamp(metrics.scale/scale,.55,1.85);
  const palmDepth=clamp(Math.log(ratio)*4.8,-2.65,2.65);
  return {
    x:clamp((.5-landmark.x)*6.15,-2.95,2.95),
    y:clamp(.54+(base.y-landmark.y)*4.25,.08,2.35),
    z:clamp(palmDepth+(metrics.z-(landmark.z??metrics.z))*2.7,-2.85,2.85)
  };
}
function limitVelocity(v,max=8){
  const m=Math.hypot(v.x,v.y,v.z);if(m<=max||m<1e-8)return v;
  return {x:v.x*max/m,y:v.y*max/m,z:v.z*max/m};
}
function average(samples,key){return samples.reduce((n,s)=>n+s[key],0)/Math.max(samples.length,1);}

export class HandTracking{
  constructor({video,overlay,panel,status,isActive=()=>true,onStatus=()=>{},win=globalThis}={}){
    Object.assign(this,{video,overlay,panel,status,isActive,onStatus,win});
    this.landmarker=null;this.stream=null;this.enabled=false;this.loading=null;this.latest=[];this.previous=new Map();this.pinchStates=new Map();this.baseline=null;this.baselineSamples=[];this.lastInference=0;this.lastVideoTime=-1;this.raf=0;this.lastSeen=0;
    this.setStatus('off','Manos desactivadas.');
  }
  setStatus(kind,message){if(this.status)this.status.textContent=message;this.onStatus(kind,message);}
  async load(){
    if(this.landmarker)return this.landmarker;
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      const {FilesetResolver,HandLandmarker}=await import(MEDIAPIPE_MODULE);
      const vision=await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      this.landmarker=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:HAND_MODEL},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.58,minHandPresenceConfidence:.55,minTrackingConfidence:.55});
      return this.landmarker;
    })();
    try{return await this.loading;}finally{this.loading=null;}
  }
  async enable(){
    if(this.enabled)return true;
    const nav=this.win.navigator;
    if(!this.win.isSecureContext||!nav?.mediaDevices?.getUserMedia){this.setStatus('error','La cámara necesita HTTPS o localhost y un navegador compatible.');return false;}
    this.setStatus('loading','Cargando MediaPipe…');
    try{
      await this.load();
      this.stream=await nav.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}});
      this.video.srcObject=this.stream;this.video.muted=true;this.video.playsInline=true;await this.video.play();
      this.enabled=true;if(this.panel)this.panel.hidden=false;this.recalibrate();this.loop();return true;
    }catch(error){
      this.stream?.getTracks?.().forEach(track=>track.stop());this.stream=null;this.enabled=false;if(this.panel)this.panel.hidden=true;
      const denied=error?.name==='NotAllowedError'||error?.name==='SecurityError';this.setStatus('error',denied?'Permiso de cámara rechazado. Podés activarlo desde el navegador.':'No se pudo iniciar MediaPipe o la webcam.');return false;
    }
  }
  recalibrate(){
    this.baseline=null;this.baselineSamples=[];this.previous.clear();this.pinchStates.clear();this.latest=[];
    if(this.enabled)this.setStatus('calibrating','Calibrando: mantené una mano abierta y quieta debajo de la webcam.');
  }
  loop(){
    this.win.cancelAnimationFrame?.(this.raf);const tick=()=>{this.raf=this.win.requestAnimationFrame(tick);this.detect();};this.raf=this.win.requestAnimationFrame(tick);
  }
  detect(){
    if(!this.enabled||!this.landmarker||!this.isActive?.()||this.win.document?.hidden||this.video?.readyState<2)return;
    const now=this.win.performance?.now?.()??Date.now();if(now-this.lastInference<38||this.video.currentTime===this.lastVideoTime)return;
    this.lastInference=now;this.lastVideoTime=this.video.currentTime;
    try{this.process(this.landmarker.detectForVideo(this.video,now),now);}catch(error){this.setStatus('error','MediaPipe dejó de responder; desactivá y volvé a activar las manos.');}
  }
  process(result,now){
    const all=result?.landmarks??[];
    if(!all.length){this.latest=[];this.draw([]);if(this.baseline&&now-this.lastSeen>900)this.setStatus('searching','No veo manos. Entrá con la mano desde abajo del monitor.');return;}
    this.lastSeen=now;
    if(!this.baseline){
      const m=handMetrics(all[0]);if(m&&m.scale>.035){this.baselineSamples.push(m);if(this.baselineSamples.length>22)this.baselineSamples.shift();}
      if(this.baselineSamples.length>=16){
        const meanScale=average(this.baselineSamples,'scale'),meanY=average(this.baselineSamples,'y');
        const stable=this.baselineSamples.every(s=>Math.abs(s.scale-meanScale)<meanScale*.22&&Math.abs(s.y-meanY)<.085);
        if(stable){this.baseline={scale:meanScale,y:meanY};this.setStatus('active','Manos activas · pinza pulgar + índice para agarrar.');}
      }
      this.draw(all);return;
    }
    const hands=[];
    for(let i=0;i<all.length;i++){
      const landmarks=all[i],metrics=handMetrics(landmarks);if(!metrics)continue;
      const category=result?.handednesses?.[i]?.[0]??result?.handedness?.[i]?.[0];
      const id=category?.categoryName||category?.displayName||`hand-${i}`;
      const ratio=pinchRatio(landmarks),wasPinching=this.pinchStates.get(id)===true,pinching=wasPinching?ratio<.50:ratio<.34;this.pinchStates.set(id,pinching);
      const mapped=landmarks.map(l=>mapLandmarkToWorld(l,metrics,this.baseline));
      const pinchRaw={x:(mapped[4].x+mapped[8].x)/2,y:(mapped[4].y+mapped[8].y)/2,z:(mapped[4].z+mapped[8].z)/2};
      const palmRaw=mapLandmarkToWorld(metrics,metrics,this.baseline);
      const previous=this.previous.get(id),dt=previous?clamp((now-previous.time)/1000,.012,.12):.04;
      const smoothPoint=(raw,prev)=>prev?{x:mix(prev.x,raw.x,.58),y:mix(prev.y,raw.y,.58),z:mix(prev.z,raw.z,.58)}:raw;
      const velocity=(point,prevPoint,prevVelocity)=>{
        if(!prevPoint)return {x:0,y:0,z:0};
        const raw=limitVelocity({x:(point.x-prevPoint.x)/dt,y:(point.y-prevPoint.y)/dt,z:(point.z-prevPoint.z)/dt});
        return prevVelocity?{x:mix(prevVelocity.x,raw.x,.42),y:mix(prevVelocity.y,raw.y,.42),z:mix(prevVelocity.z,raw.z,.42)}:raw;
      };
      const pinch=smoothPoint(pinchRaw,previous?.pinch),palm=smoothPoint(palmRaw,previous?.palm);
      const pv=velocity(pinch,previous?.pinch,previous?.pinchV),palmV=velocity(palm,previous?.palm,previous?.palmV);
      const points=FINGERS.map((index,j)=>{const pos=smoothPoint(mapped[index],previous?.points?.[j]);const v=velocity(pos,previous?.points?.[j],previous?.pointV?.[j]);return {...pos,...{vx:v.x,vy:v.y,vz:v.z},radius:.105};});
      const hand={id,label:category?.displayName||category?.categoryName||'',score:category?.score??1,pinch:{...pinch,vx:pv.x,vy:pv.y,vz:pv.z,active:pinching,strength:clamp(1-ratio/.5,0,1)},palm:{...palm,vx:palmV.x,vy:palmV.y,vz:palmV.z,radius:.19},points};
      this.previous.set(id,{time:now,pinch,pinchV:pv,palm,palmV,points:points.map(p=>({x:p.x,y:p.y,z:p.z})),pointV:points.map(p=>({x:p.vx,y:p.vy,z:p.vz}))});hands.push(hand);
    }
    this.latest=hands;this.draw(all);if(hands.length)this.setStatus('active',hands.some(h=>h.pinch.active)?'Pinza detectada · objeto listo para agarrar.':'Manos activas · tocá, empujá o hacé pinza para agarrar.');
  }
  sample(){return this.enabled?this.latest:[];}
  draw(all){
    const canvas=this.overlay,video=this.video;if(!canvas||!video?.videoWidth)return;
    if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineWidth=Math.max(2,canvas.width/480);ctx.lineCap='round';ctx.strokeStyle='rgba(140,234,217,.78)';ctx.fillStyle='rgba(255,255,255,.92)';
    for(const landmarks of all){
      ctx.beginPath();for(const [a,b] of CONNECTIONS){ctx.moveTo(landmarks[a].x*canvas.width,landmarks[a].y*canvas.height);ctx.lineTo(landmarks[b].x*canvas.width,landmarks[b].y*canvas.height);}ctx.stroke();
      for(const i of FINGERS){ctx.beginPath();ctx.arc(landmarks[i].x*canvas.width,landmarks[i].y*canvas.height,Math.max(3,canvas.width/180),0,Math.PI*2);ctx.fill();}
    }
  }
  disable(){
    this.win.cancelAnimationFrame?.(this.raf);this.raf=0;this.enabled=false;this.latest=[];this.previous.clear();this.pinchStates.clear();this.video?.pause?.();if(this.video)this.video.srcObject=null;this.stream?.getTracks?.().forEach(track=>track.stop());this.stream=null;if(this.panel)this.panel.hidden=true;this.setStatus('off','Manos desactivadas.');
  }
  destroy(){this.disable();try{this.landmarker?.close?.();}catch{}this.landmarker=null;}
}
