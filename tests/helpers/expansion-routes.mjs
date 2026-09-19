// Waypoints are test itineraries, not game rules. Every action uses normal gravity inputs.
export function itinerary(id,p){
  const {go,hold,wait,goal,board,ride,jump,platform,variant}=p;
  switch(id){
    case 23: go(1.75,1.7);go(1.75,.3);goal();break;
    case 24:
      goal();if(variant==='return-ice'){go(-1.85,2.05);go(1.75,2.05);}else{go(-1.8,-2.05);go(1.75,-2.05);}goal();break;
    case 25:
      go(2.35,1.65);if(variant==='bumper'){go(2,.1);go(1.8,.23,{radius:.045,stop:false});}go(2.35,-1.55);goal();break;
    case 26: {const x=variant==='right'?1.4:-1.4;go(x,1.75);go(x,-1.75);goal();break;}
    case 27: goal();go(1.7,2.45);go(-2.15,2.45);go(-2.15,1.55);go(-1.7,.1);goal();go(-1.7,-2.25);go(1.65,-2.25);goal();go(1.15,-2.4);goal();break;
    case 28: go(0,1.8);go(0,.9);wait(s=>Math.sin(s.time)>.65&&Math.cos(s.time)>0);go(0,-.65,{maxSpeed:1.6});go(0,-1.65);goal();break;
    case 29:
      go(0,1.65);wait(s=>Math.sin(s.time*.8)>.68&&Math.cos(s.time*.8)>0);goal();
      go(0,0);wait(s=>Math.sin(s.time*.8+Math.PI)>.68&&Math.cos(s.time*.8+Math.PI)>0);goal();break;
    case 30:
      go(-1.75,1.85);go(-1.75,-.8,{y:.6});wait(()=>platform(1).x<-.5);board(1);ride(1,a=>a.x>.55);go(1.65,-.8,{y:.6});goal();go(1.75,-2.25);goal();break;
    case 31:
      go(-2.1,2.1);go(-2.1,-.4,{y:.58});wait(()=>Math.abs(platform(1).z+.4)<.25);board(1);goal();
      ride(1,()=>Math.abs(platform(1).z-platform(2).z)<.18);board(2);goal();ride(2,a=>Math.abs(a.z+.4)<.3);go(2.1,-.4,{y:.58});go(2.1,-2.25);goal();break;
    case 32:
      go(-.65,2.1);wait(s=>Math.sin(s.time*.8)<-.7);go(1.65,2.1);goal();go(1.85,1.55);go(1.85,-.8,{y:.58});
      wait(()=>platform(1).x>.65&&platform(1).vx>0);board(1);goal();ride(1,a=>a.x<-.65);go(-1.75,-.8,{y:.58});goal();go(-1.65,-2.42);wait(s=>Math.sin(s.time*.85)>.65&&Math.cos(s.time*.85)>0);goal();break;
    case 33:
      go(-1.6,1.85);go(-1.6,-.9,{y:.62});goal();go(-.4,-.95);go(1.5,-.65);goal();go(2.4,.8);go(2.4,-2.42);goal();break;
    case 34: jump(0,0);if(variant==='recovery'){go(2.5,-.75,{y:0});go(2.5,2.5);go(-2.1,2.5);jump(0,0);}goal();break;
    case 35:
      go(-1.7,2.5);go(-1.7,.2,{y:.28});go(.4,.2,{y:.54});go(.4,-2.1,{y:.8});goal();go(.4,.2,{y:.54});goal();go(-1.7,.2,{y:.28});goal();go(-2.7,.2);go(-2.7,-2.42);goal();break;
    case 36:
      go(-1.85,1.1);wait(()=>platform(0).x<.7&&platform(0).vx>0);jump(0,0,{stage:[-1.85,1.1]});goal();go(2.65,-.75);go(2.65,-2.42);goal();break;
    case 37:
      jump(0,0);goal();go(2.4,.5);go(2.4,-.8);go(1.7,-.85);go(.15,-.85);go(-.7,-.2);go(-.7,.7);jump(1,1,{stage:[0,.7]});goal();go(-1.3,-2.65);go(.6,-2.65);goal();break;
    case 38:
      if(variant==='jump'){go(1.15,1.85);jump(0,0);}else{go(-2.75,1.7);go(-2.75,-1.25);go(0,-1.25,{y:.6});}
      goal();go(1.85,-1.25);goal();break;
    case 39:
      go(-.2,2.15);go(1.45,2.15);if(variant==='bumper')go(1.28,1.08,{radius:.035,stop:false});go(1.65,2.5);go(-1.75,2.5);go(-1.75,-.7,{y:.56});
      wait(()=>platform(1).x<-.55);board(1);goal();ride(1,a=>a.x>.65);go(1.75,-.7,{y:.56});goal();go(1.75,-2.42);goal();break;
    case 40:
      go(-1.65,1.85);go(-1.65,-.55,{y:.35});goal();go(-1.65,1.9);go(0,2.45);
      if(variant==='jump'){go(-.55,.8);jump(0,1);}else{go(1.55,1.7);go(1.55,-1.1,{y:.7});}
      goal();go(1.55,1.85);goal();go(-.5,1.65,{radius:.08});go(-.5,-2.42);goal();break;
    case 41:
      go(-.7,2.7);go(1.65,2.7);goal();go(1.7,.95);go(.8,.95);wait(s=>Math.sin(s.time*.8)>.65&&Math.cos(s.time*.8)>0);go(-1.1,.95);go(-1.1,2.15);go(-1.9,2.15);go(-1.9,-.6,{y:.55});
      wait(()=>platform(1).x<-.75);board(1);goal();go(.3,-.15);go(.55,.95);go(1.1,1.15);jump(0,2);goal();go(2.7,-1.65);go(2.7,-2.65);go(0,-2.65);goal();break;
    case 42:
      go(-.65,2.55);wait(s=>Math.sin(s.time*.8)<-.5);go(1.85,2.25);goal();go(1.95,1.55);go(1.95,-.65,{y:.55});
      wait(()=>platform(1).x>.75);board(1);goal();ride(1,a=>a.x<-.55);go(-1.6,-.65,{y:.55});go(-2,-.65);go(-2,.8);go(-1.3,1.45);jump(0,3,{stage:[-1.3,1.45]});if(variant==='recovery'){go(-2.8,-2,{y:0});go(-2.8,.8);go(-1.3,1.45);jump(0,3,{stage:[-1.3,1.45]});}goal();goal();break;
    default:throw Error(`No itinerary for ${id}`);
  }
}
