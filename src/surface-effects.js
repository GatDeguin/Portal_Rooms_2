import {clamp} from './math.js';
import {containsFootprint} from './shapes.js';

export const createSurfaceFx=()=>({particles:[],ripples:[],stretch:{x:0,z:0,strength:0},seed:17,emission:0,rippleClock:0,lastType:0,lastGrounded:true});
const random=fx=>{fx.seed=(Math.imul(fx.seed,1664525)+1013904223)>>>0;return fx.seed/4294967296;};
function drop(fx,c,type,burst=1){
 const angle=random(fx)*Math.PI*2,rad=.22+random(fx)*.08,speed=Math.hypot(c.vx,c.vz);
 const size=type===1?.018+random(fx)*.024:.025+random(fx)*.032;
 const maxLife=type===1?.28+random(fx)*.38:.3+random(fx)*.28;
 fx.particles.push({x:c.x+Math.cos(angle)*rad,y:.035+random(fx)*.06,z:c.z+Math.sin(angle)*rad,
  vx:c.vx*.25+Math.cos(angle)*(.25+speed*.19)*burst,vy:(.7+random(fx)*1.05+speed*.18)*burst,
  vz:c.vz*.25+Math.sin(angle)*(.25+speed*.19)*burst,life:maxLife,maxLife,type,size});
}
export function stepSurfaceFx(room,state,dt){
 const fx=state.surfaceFx,c=state.cube;if(!fx)return;
 for(const p of fx.particles){p.life-=dt;p.vy-=5.2*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
 fx.particles=fx.particles.filter(p=>p.life>0&&p.y>0).slice(-96);
 for(const r of fx.ripples){r.life-=dt;r.r+=dt*(r.type===1?.65:.22);}
 fx.ripples=fx.ripples.filter(r=>r.life>0).slice(-24);
 const zone=c.grounded&&c.y<.08?(room.zones??[]).filter(z=>z.type>=1&&z.type<=3&&containsFootprint(z,c.x,c.z)).at(-1):null;
 const type=zone?.type===1||zone?.type===2?zone.type:0,speed=Math.hypot(c.vx,c.vz),landed=!fx.lastGrounded&&c.grounded;
 if(type){
  if(type!==fx.lastType||landed){for(let i=0;i<(type===1?14:5);i++)drop(fx,c,type,landed?1.35:1);fx.rippleClock=.3;}
  fx.emission+=dt*(type===1?(speed>.1?8+speed*9+(c.slip??0)*40:0):speed*7);
  while(fx.emission>=1){drop(fx,c,type);fx.emission--;}
  fx.rippleClock+=dt*(1+speed*.3);
  if(fx.rippleClock>.18&&(speed>.1||landed)){
   const maxLife=type===1?.75:.5;fx.ripples.push({x:c.x,z:c.z,y:.027,r:.15,life:maxLife,maxLife,type});fx.rippleClock=0;
  }
 }else fx.emission=0;
 fx.particles=fx.particles.slice(-96);fx.ripples=fx.ripples.slice(-24);
 const stretch=c.stickyStretch??{x:0,z:0};
 fx.stretch={x:c.x+stretch.x,z:c.z+stretch.z,strength:clamp(Math.hypot(stretch.x,stretch.z)*3.5,0,1)*(c.slime??0)};
 fx.lastType=type;fx.lastGrounded=c.grounded;
}
