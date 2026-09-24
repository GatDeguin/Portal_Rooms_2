import {GameEngine,MAX_SPEED} from './physics.js';
import {ROOM_LIMIT,movingAt,penetration,surfaceAt} from './geometry.js';
import {clamp} from './math.js';

const RADIUS=.24,HAND_SPEED=7.5;
const clampVelocity=(value,limit=HAND_SPEED)=>clamp(value,-limit,limit);

export class HandGameEngine extends GameEngine{
  reset(index=0){super.reset(index);this.handFrame=[];this.handGrab=null;this.lastGrabVelocity={x:0,y:0,z:0};}
  advance(seconds,input={x:0,z:0}){this.handFrame=Array.isArray(input?.hands)?input.hands:[];super.advance(seconds,input);}
  step(dt,input){super.step(dt,input);if(!this.state.solved)this.applyHands(dt);}
  applyHands(dt){
    const s=this.state,c=s.cube,hands=this.handFrame;
    if(!hands.length){if(this.handGrab)this.releaseGrab();return;}
    let grabbed=this.handGrab?hands.find(hand=>hand.id===this.handGrab):null;
    if(grabbed&&!grabbed.pinch?.active){this.releaseGrab(grabbed);grabbed=null;}
    if(!grabbed){
      const centerY=c.y+RADIUS;
      let best=null,bestDistance=.72;
      for(const hand of hands){
        if(!hand.pinch?.active)continue;
        const p=hand.pinch,d=Math.hypot(p.x-c.x,p.y-centerY,p.z-c.z);
        if(d<bestDistance){best=hand;bestDistance=d;}
      }
      if(best){this.handGrab=best.id;grabbed=best;}
    }
    if(grabbed){this.pullGrabbedCube(grabbed,dt);return;}
    this.pushCube(hands,dt);
  }
  pullGrabbedCube(hand,dt){
    const c=this.state.cube,p=hand.pinch,floor=surfaceAt(this.room,p.x,p.z,this.state.time);
    const target={x:clamp(p.x,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS),z:clamp(p.z,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS),y:clamp(p.y-RADIUS,floor.height,2.2)};
    const alpha=1-Math.exp(-18*dt),before={x:c.x,y:c.y,z:c.z};
    c.x+=clamp((target.x-c.x)*alpha,-.12,.12);c.z+=clamp((target.z-c.z)*alpha,-.12,.12);c.y+=clamp((target.y-c.y)*alpha,-.10,.10);
    this.resolveGrabSolids();
    c.vx=clampVelocity((c.x-before.x)/dt*.78+(p.vx??0)*.22);c.vz=clampVelocity((c.z-before.z)/dt*.78+(p.vz??0)*.22);c.vy=clampVelocity((c.y-before.y)/dt*.72+(p.vy??0)*.28,5.5);
    this.lastGrabVelocity={x:clampVelocity(p.vx??c.vx,MAX_SPEED),y:clampVelocity(p.vy??c.vy,5.5),z:clampVelocity(p.vz??c.vz,MAX_SPEED)};
    c.grounded=false;c.support=-1;c.hold=0;this.state.surface='air';
  }
  releaseGrab(hand=null){
    const c=this.state.cube,v=hand?.pinch??this.lastGrabVelocity;
    c.vx=clampVelocity(c.vx*.35+(v.vx??v.x??0)*.65,MAX_SPEED);c.vz=clampVelocity(c.vz*.35+(v.vz??v.z??0)*.65,MAX_SPEED);c.vy=clampVelocity(c.vy*.3+(v.vy??v.y??0)*.7,5.5);
    this.handGrab=null;
  }
  resolveGrabSolids(){
    const c=this.state.cube,solids=(this.room.obstacles??[]).map(o=>movingAt(o,this.state.time)).filter(o=>c.y<(o.h??.49)-.02);
    for(const p of this.room.platforms??[])if(p.h>c.y+.09)solids.push(movingAt(p,this.state.time));
    for(let pass=0;pass<4;pass++){
      let corrected=false;
      for(const box of solids){const overlap=penetration(c,box,RADIUS);if(overlap){c.x+=overlap.nx*(overlap.depth+1e-5);c.z+=overlap.nz*(overlap.depth+1e-5);corrected=true;}}
      if(!corrected)break;
    }
    c.x=clamp(c.x,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);c.z=clamp(c.z,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);
    const floor=surfaceAt(this.room,c.x,c.z,this.state.time);c.y=Math.max(c.y,floor.height);
  }
  pushCube(hands,dt){
    const c=this.state.cube,centerY=c.y+RADIUS;
    for(const hand of hands){
      const contacts=[...(hand.points??[]),hand.palm].filter(Boolean);
      for(const point of contacts){
        const radius=point.radius??.105,dy=Math.abs(point.y-centerY);if(dy>RADIUS+radius)continue;
        let dx=c.x-point.x,dz=c.z-point.z,d=Math.hypot(dx,dz),limit=RADIUS+radius;if(d>=limit)continue;
        let nx,nz;if(d<1e-5){const speed=Math.hypot(point.vx??0,point.vz??0);nx=speed>.05?(point.vx??0)/speed:1;nz=speed>.05?(point.vz??0)/speed:0;}else{nx=dx/d;nz=dz/d;}
        const penetrationDepth=limit-d;
        c.x+=nx*Math.min(penetrationDepth*.62,.055);c.z+=nz*Math.min(penetrationDepth*.62,.055);
        const handNormal=(point.vx??0)*nx+(point.vz??0)*nz,cubeNormal=c.vx*nx+c.vz*nz;
        if(handNormal>cubeNormal){const impulse=(handNormal-cubeNormal)*Math.min(1,dt*30)*.9;c.vx+=nx*impulse;c.vz+=nz*impulse;}
      }
    }
    c.x=clamp(c.x,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);c.z=clamp(c.z,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);this.limitSpeed();
  }
}
