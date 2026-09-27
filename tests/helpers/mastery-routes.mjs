// Authored waypoint routes; every command is integrated as bounded gravity input.
export function itinerary(id,p){
 const {go,goal,jump,leap,bumper,wait,board,ride,platform,variant}=p;
 switch(id){
 case 5: go(-1.75,-1.85);go(1.7,-1.85);go(1.7,1.28);goal();go(1.7,-1.85);go(-1.72,-1.85);goal();go(-1.72,-2.42);goal();break;
 case 16: leap(0,.6,-1.1,{stage:[-1.6,1.65]});goal();break;
 case 17: go(1.45,.9);go(0,.9);go(0,-.95);go(-2.45,-.95,{y:.72});goal();break;
 case 19: leap(0,-1,-.4,{stage:[-1.25,2.05]});leap(1,1.8,-2,{stage:[0,-.28],approachSpeed:.65,entry:[1.1,-.28]});goal();break;
 case 31:
  go(-2.1,2.1);go(-2.1,-.4,{y:.58});
  if(variant==='rear-recovery'){go(-2.1,-1.85,{y:0});go(-1,-2.8);go(2.75,-2.8);jump(1,3,{stage:[2.85,-2.85]});wait(()=>Math.abs(platform(2).z+.4)<.2);board(2);ride(2,()=>Math.abs(platform(1).z-platform(2).z)<.18);board(1);goal();}
  else{wait(()=>Math.abs(platform(1).z+.4)<.25);board(1);goal();}
  ride(1,()=>Math.abs(platform(1).z-platform(2).z)<.18);board(2);goal();ride(2,a=>Math.abs(a.z+.4)<.3);go(2.1,-.4,{y:.58});
  go(2.8,.5,{y:0});go(2.8,2.25);jump(0,3,{stage:[2.15,2.25]});go(2.1,-2.25);goal();break;
 case 43: go(-1.65,.2);goal();break;
 case 44: go(1.95,1.9);go(1.95,0);goal();break;
 case 45: goal();break;
 case 46: go(2.12,1.8);go(2.12,-.05);go(-2.14,-.05);go(-2.14,-2.2);goal();break;
 case 47: goal();go(0,-1.9);goal();go(1.85,1.8);goal();go(1.85,-2.42);goal();break;
 case 48: goal();goal();break;
 case 49: go(1.4,1.55);bumper(0);go(2.3,1.25);go(2.3,-1.85);goal();break;
 case 50: jump(0,0);goal();go(2.45,-.9,{y:0});go(2.45,-2.42);goal();break;
 case 51: goal();go(-1.8,-2);go(1.8,-2);goal();go(1.8,-2.42);goal();break;
 case 52: go(-1.5,1.4);bumper(0);go(-2.4,.8);go(-2.4,-1);goal();go(-2.4,2.15);go(1.05,2.15);jump(0,0,{stage:[1,1.4]});goal();go(2.65,-1.4,{y:0});go(2.65,-2.8);go(0,-2.8);goal();break;
 case 53: jump(0,0);if(variant==='recovery'){go(2.5,-.75,{y:0});go(2.5,2.6);go(-2.1,2.6);jump(0,0);}goal();break;
 case 54: jump(0,0);goal();go(-2.65,.45,{y:0});go(-2.65,-.9);goal();go(-2.65,-.9);go(-2.65,1.8);go(.15,1.8);jump(1,1,{stage:[.15,.65],approachSpeed:.85});goal();go(1.4,-2.75);go(-.6,-2.75);goal();break;
 case 55: leap(0,0,-1.6,{stage:[0,2.1]});goal();break;
 case 56: go(-1.7,1.8);go(-1.7,-.7,{y:.5});goal();jump(0,1,{stage:[-1.85,-.7]});if(variant==='recovery'){go(2.55,-.7,{y:0});go(2.6,2.2);jump(1,1,{stage:[1.85,1.95]});}goal();go(2.55,-.7,{y:0});go(2.55,-2.42);goal();break;
 case 57: go(-1.85,1.1);wait(()=>platform(0).x<.7&&platform(0).vx>0);jump(0,0,{stage:[-1.85,1.1]});goal();go(2.7,-.75,{y:0});go(2.7,-2.42);goal();break;
 case 58: go(2,1.9);go(2,.1);goal();go(2,-2.5);go(-1.8,-2.5);goal();go(-1.8,-2.42);goal();break;
 case 59: goal();goal();goal();break;
 case 60: go(-1.7,1.8);go(-1.7,-.9,{y:.6});goal();go(-2.75,-.9,{y:0});go(-2.75,2.25);go(1.6,2.25);goal();jump(0,1,{stage:[1.5,.95]});goal();go(2.75,-1.6,{y:0});go(2.75,-2.8);go(0,-2.8);goal();break;
 case 61: leap(0,-.8,-.3,{stage:[-1.5,2.2]});go(.2,-.3);leap(1,1.7,-2.2,{stage:[.2,-.3],approachSpeed:.65,entry:[1.2,-.3]});goal();break;
 case 62:
  go(1.9,2.1);goal();go(1.9,2.75);go(-1.85,2.75);go(-1.85,-.65,{y:.55});wait(()=>platform(1).x<-.6&&platform(1).vx<0);board(1);goal();ride(1,a=>a.x>.6);go(1.85,-.65,{y:.55});
  go(2.7,.25,{y:0});go(2.7,2.2);go(1.5,2.2);wait(s=>Math.sin(s.time*.8)>.9);go(1.5,1.15,{maxSpeed:1.5});jump(0,3,{stage:[1.5,1.15]});goal();goal();break;
 default:throw Error('No itinerary '+id);
 }
}