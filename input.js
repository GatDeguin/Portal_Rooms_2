import {clamp,angleDelta,unit2,deadZone,smooth} from './math.js';
const DIRECTION_CODES=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
export function keyboardVector(keys){
  return unit2(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),
    Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')));
}
export function tiltVector(reading,base,angle=0,settings={}){
  if(!base||![reading?.beta,reading?.gamma,base.beta,base.gamma].every(Number.isFinite))return {x:0,z:0};
  const rad=angle*Math.PI/180,x=angleDelta(reading.gamma,base.gamma)/28,z=angleDelta(reading.beta,base.beta)/28;
  const sensitivity=settings.sensitivity??1;
  const v=deadZone((x*Math.cos(rad)+z*Math.sin(rad))*sensitivity,(-x*Math.sin(rad)+z*Math.cos(rad))*sensitivity,settings.deadZone??.055);
  return {x:v.x*(settings.invertX?-1:1),z:v.z*(settings.invertZ?-1:1)};
}
export function joystickVector(x,y,radius){
  if(!Number.isFinite(radius)||radius<=0)return {x:0,z:0};
  const v=deadZone(x/radius,y/radius,.025),m=Math.hypot(v.x,v.z);
  return m>0?{x:v.x*Math.pow(m,.35),z:v.z*Math.pow(m,.35)}:v;
}
export class PointerStick {
  constructor(){this.owner=null;this.vector={x:0,z:0};}
  begin(id){if(this.owner!==null)return false;this.owner=id;return true;}
  move(id,x,y,radius){if(id!==this.owner)return false;this.vector=joystickVector(x,y,radius);return true;}
  end(id){if(id!==this.owner)return false;this.owner=null;this.vector={x:0,z:0};return true;}
  clear(){this.owner=null;this.vector={x:0,z:0};}
}
/** Sensor calibration averages stable samples and never accepts null/non-finite readings. */
export class TiltCalibration {
  constructor(count=12){this.count=count;this.samples=[];this.base=null;}
  reset(){this.samples=[];this.base=null;}
  add(reading){
    if(!Number.isFinite(reading?.beta)||!Number.isFinite(reading?.gamma))return false;
    this.samples.push({beta:reading.beta,gamma:reading.gamma});if(this.samples.length>this.count)this.samples.shift();
    if(this.samples.length<this.count)return false;
    const origin=this.samples[0],average={beta:0,gamma:0};
    for(const sample of this.samples){average.beta+=angleDelta(sample.beta,origin.beta)/this.count;average.gamma+=angleDelta(sample.gamma,origin.gamma)/this.count;}
    const drift=this.samples.some(sample=>Math.abs(angleDelta(sample.beta,origin.beta)-average.beta)>2.5||Math.abs(angleDelta(sample.gamma,origin.gamma)-average.gamma)>2.5);
    if(drift)return false;
    this.base={beta:origin.beta+average.beta,gamma:origin.gamma+average.gamma};return true;
  }
}
export class InputController {
  constructor({canvas,stick,thumb,getSettings,isPlaying,onAction,onSensor,win=window}){
    Object.assign(this,{canvas,stick,thumb,getSettings,isPlaying,onAction,onSensor,win});
    this.keys=new Set();this.joy=new PointerStick();this.pointer={owner:null,x:0,z:0};this.reading=null;this.sensorEnabled=false;this.sensorWaiting=false;this.requestId=0;this.calibration=new TiltCalibration();this.filtered={x:0,z:0};this.listeners=[];
    this.listen(win,'keydown',e=>{
      const editing=e.target?.matches?.('input,select,textarea,[contenteditable="true"]');
      if(editing)return;
      if(DIRECTION_CODES.has(e.code)&&this.isPlaying()){e.preventDefault();this.keys.add(e.code);return;}
      if(e.repeat)return;
      if(e.code==='Escape'){e.preventDefault();this.onAction('pause');return;}
      if(this.isPlaying()&&e.code==='KeyR')this.onAction('restart');
      if(this.isPlaying()&&e.code==='KeyH')this.onAction('hint');
    });
    this.listen(win,'keyup',e=>this.keys.delete(e.code));
    this.listen(win,'blur',()=>this.clear());
    this.listen(stick,'pointerdown',e=>{
      if(!this.isPlaying()||!this.joy.begin(e.pointerId))return;
      e.preventDefault();this.pointer={owner:null,x:0,z:0};stick.setPointerCapture(e.pointerId);this.updateJoy(e);
    });
    this.listen(stick,'pointermove',e=>this.updateJoy(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.listen(stick,type,e=>{
      if(this.joy.end(e.pointerId)){this.drawJoy();this.release(stick,e.pointerId);}
    });
    this.listen(canvas,'pointerdown',e=>{
      if(!this.isPlaying()||this.pointer.owner!==null||e.button>0)return;
      this.pointer={owner:e.pointerId,x:0,z:0};this.origin={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
    });
    this.listen(canvas,'pointermove',e=>{
      if(this.pointer.owner!==e.pointerId)return;
      const radius=Math.min(canvas.clientWidth,canvas.clientHeight)*.24;
      const v=joystickVector(e.clientX-this.origin.x,e.clientY-this.origin.y,radius);this.pointer.x=v.x;this.pointer.z=v.z;
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])this.listen(canvas,type,e=>{if(e.pointerId===this.pointer.owner){this.pointer={owner:null,x:0,z:0};this.release(canvas,e.pointerId);}});
    this.listen(win,'deviceorientation',e=>this.orientation(e),true);
    this.listen(win.screen?.orientation??win,'change',()=>{if(this.sensorEnabled||this.sensorWaiting)this.recalibrate();});
    this.listen(win,'orientationchange',()=>{if(this.sensorEnabled||this.sensorWaiting)this.recalibrate();});
  }
  listen(target,type,handler,options){if(!target?.addEventListener)return;target.addEventListener(type,handler,options);this.listeners.push(()=>target.removeEventListener(type,handler,options));}
  release(element,id){try{if(id!==null&&element.hasPointerCapture(id))element.releasePointerCapture(id);}catch{/* Capture may have been cancelled by the browser. */}}
  updateJoy(e){const r=this.stick.getBoundingClientRect();if(this.joy.move(e.pointerId,e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.32))this.drawJoy();}
  drawJoy(){this.stick.classList?.toggle('engaged',this.joy.owner!==null);const radius=this.stick.clientWidth*.32;this.thumb.style.transform=`translate(${this.joy.vector.x*radius}px,${this.joy.vector.z*radius}px)`;}
  clear(){this.keys.clear();const owner=this.joy.owner;this.joy.clear();this.release(this.stick,owner);this.drawJoy();const p=this.pointer.owner;this.pointer={owner:null,x:0,z:0};this.release(this.canvas,p);this.filtered={x:0,z:0};}
  sample(dt){
    if(!this.isPlaying())return {x:0,z:0};
    if(this.keys.size)return keyboardVector(this.keys);
    if(this.joy.owner!==null)return this.joy.vector;
    if(this.pointer.owner!==null)return {x:this.pointer.x,z:this.pointer.z};
    if(!this.sensorEnabled)return {x:0,z:0};
    const settings=this.getSettings(),angle=this.win.screen?.orientation?.angle??this.win.orientation??0;
    const v=tiltVector(this.reading,this.calibration.base,angle,settings);
    this.filtered={x:smooth(this.filtered.x,v.x,settings.smoothing,dt),z:smooth(this.filtered.z,v.z,settings.smoothing,dt)};
    return this.filtered;
  }
  orientation(e){
    if(!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
    this.reading={beta:e.beta,gamma:e.gamma};
    if(this.sensorWaiting&&this.calibration.add(this.reading)){
      this.sensorEnabled=true;this.sensorWaiting=false;clearTimeout(this.sensorTimer);this.filtered={x:0,z:0};this.onSensor('active');
    }
  }
  async enableSensors(){
    const id=++this.requestId,API=this.win.DeviceOrientationEvent;
    if(!this.win.isSecureContext||!API){this.disableSensors('unavailable');return false;}
    try{
      if(typeof API.requestPermission==='function'){
        const permission=await API.requestPermission();
        if(id!==this.requestId)return false;
        if(permission!=='granted'){this.disableSensors('denied');return false;}
      }
      if(id!==this.requestId)return false;
      this.recalibrate();return true;
    }catch{if(id===this.requestId)this.disableSensors('denied');return false;}
  }
  recalibrate(){
    clearTimeout(this.sensorTimer);this.calibration.reset();this.sensorEnabled=false;this.sensorWaiting=true;this.filtered={x:0,z:0};this.onSensor('calibrating');
    this.sensorTimer=setTimeout(()=>{if(this.sensorWaiting)this.disableSensors('timeout');},4500);
  }
  disableSensors(reason='manual'){++this.requestId;clearTimeout(this.sensorTimer);this.sensorEnabled=false;this.sensorWaiting=false;this.calibration.reset();this.filtered={x:0,z:0};this.onSensor(reason);}
  destroy(){this.disableSensors();this.clear();this.listeners.forEach(remove=>remove());}
}
