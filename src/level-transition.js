import {clamp,Q} from './math.js';
const ease=p=>p*p*(3-2*p);
const windowEase=(a,b,p)=>ease(clamp((p-a)/(b-a),0,1));

/** Presentation clock only: never advances physics, attempts or level time. */
export class LevelTransition{
 constructor(){this.clear();}
 clear(){this.kind=null;this.elapsed=0;this.duration=0;}
 start(kind,{reduced=false,enabled=true}={}){
  this.clear();if(reduced||!enabled)return;
  this.kind=kind;this.duration=kind==='enter'?900:1050;
 }
 get done(){return this.elapsed>=this.duration;}
 advance(ms){if(Number.isFinite(ms)&&ms>0)this.elapsed=Math.min(this.duration,this.elapsed+Math.min(ms,80));return this.done;}
 sample(){
  if(!this.kind)return null;
  const p=clamp(this.elapsed/this.duration,0,1),e=ease(p),energy=p===0||p===1?0:Math.sin(Math.PI*p);
  if(this.kind==='enter')return {scale:windowEase(0,.7,p),lift:.72*(1-e),spin:p===1?0:-1.35*(1-e),energy,clock:p*2.4};
  return {scale:1-windowEase(.24,.94,p),lift:p===1?0:.46*Math.sin(Math.PI*p),spin:e*2.8,energy,clock:p*3.2};
 }
}
export function animatedCubeRotation(cube,transition){
 return transition?Q.normalize(Q.multiply(Q.axis(.28,1,.18,transition.spin),cube.q)):cube.q;
}
