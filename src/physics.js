import {clamp,finite,smooth,unit2,Q} from './math.js';
import {LEVELS} from './levels.js';
import {ROOM_LIMIT,insideRect,movingAt,rampHeight,surfaceAt,activeTarget,sweepBox,penetration} from './geometry.js';

export const FIXED_STEP=1/120;
export const MAX_SPEED=6;
const GRAVITY_Y=6.8,MAX_STEP=.09,RADIUS=.24;
const WALLS=[{x:-3.5,z:0,w:.6,d:8},{x:3.5,z:0,w:.6,d:8},{x:0,z:-3.5,w:8,d:.6},{x:0,z:3.5,w:8,d:.6}];
export const restitution = speed => .16+.30*clamp(Math.abs(speed)/6,0,1);

export class GameEngine {
  constructor(levels=LEVELS,settings={}) {
    if (!Array.isArray(levels)||!levels.length) throw new TypeError('At least one room is required');
    this.levels=levels; this.settings={strongGravity:true,...settings};this.active=false;this.accumulator=0;
    this.reset(0);
  }
  get room() { return this.levels[this.state.level]; }
  get target() { return activeTarget(this.room,this.state.seq,this.state.time); }
  reset(index=0) {
    index=clamp(Math.trunc(finite(index)),0,this.levels.length-1);
    const room=this.levels[index],floor=surfaceAt(room,...room.start,0);
    this.active=false;this.accumulator=0;
    this.state={level:index,seq:0,time:0,elapsed:0,solved:false,surface:floor.kind,steps:0,
      cube:{x:room.start[0],z:room.start[1],y:floor.height,vx:0,vz:0,vy:0,q:Q.identity(),size:RADIUS*2,grounded:true,support:floor.platform,hold:0,jumpCooldown:0},
      gravity:{x:0,z:0},events:[],fx:{x:0,z:0,type:1,life:0},shake:0,bumperCooldowns:{},impactCooldown:0};
  }
  start() { if(!this.state.solved)this.active=true; this.accumulator=0; }
  pause() { this.active=false;this.accumulator=0; }
  advance(seconds,input={x:0,z:0}) {
    if(!this.active||this.state.solved||!Number.isFinite(seconds)||seconds<=0)return;
    this.state.events=[];
    // Bound tab stalls; normal 10–240 Hz frame schedules integrate the same fixed steps.
    this.accumulator+=Math.min(seconds,.1);
    const direction=unit2(clamp(finite(input.x),-1,1),clamp(finite(input.z),-1,1));
    for(let i=0;this.active&&this.accumulator+1e-10>=FIXED_STEP&&i<12;i++){
      this.step(FIXED_STEP,direction);this.accumulator=Math.max(0,this.accumulator-FIXED_STEP);
    }
  }
  emit(type,x=this.state.cube.x,z=this.state.cube.z,power=.5) {
    const s=this.state;
    s.events.push({type,x,z,power});
    if(type!=='impact')s.fx={x,z,type:type==='jump'?5:type==='bumper'?4:this.target.type,life:1};
    s.shake=Math.max(s.shake,power*.45);
  }
  impact(speed) {
    if(speed>.3&&this.state.impactCooldown<=0){this.emit('impact',undefined,undefined,clamp(speed/5,0,1));this.state.impactCooldown=.07;}
  }
  step(dt,input) {
    const s=this.state,c=s.cube,room=this.room,previousTime=s.time,previousY=c.y,wasGrounded=c.grounded;
    s.time+=dt;s.elapsed+=dt;s.steps++;
    s.fx.life=Math.max(0,s.fx.life-dt*.9);s.shake=Math.max(0,s.shake-dt*2.5);s.impactCooldown=Math.max(0,s.impactCooldown-dt);
    c.jumpCooldown=Math.max(0,c.jumpCooldown-dt);
    // Carry the supported cube by the platform's actual displacement, not by frame rate.
    if(c.grounded&&c.support>=0&&room.platforms?.[c.support]){
      const p=room.platforms[c.support],before=movingAt(p,previousTime),after=movingAt(p,s.time);
      if(insideRect(c.x,c.z,before)&&Math.abs(c.y-p.h)<.04){c.x+=after.x-before.x;c.z+=after.z-before.z;}
    }
    s.gravity.x=smooth(s.gravity.x,input.x,.045,dt);s.gravity.z=smooth(s.gravity.z,input.z,.045,dt);
    const control=c.grounded?1:.38,g=this.settings.strongGravity?5.7:3.9;
    let ax=s.gravity.x*g*control,az=s.gravity.z*g*control;
    const floor=surfaceAt(room,c.x,c.z,s.time,c.y+MAX_STEP);
    s.surface=c.grounded?floor.kind:'air';
    let friction=c.grounded?(floor.kind==='carpet'?1.28:.92):.08;
    if(c.grounded&&c.y<.12){
      for(const zone of room.zones??[]){
        if(Math.hypot(c.x-zone.x,c.z-zone.z)>zone.r)continue;
        if(zone.type===1){friction=.13;s.surface='ice';}
        if(zone.type===2){friction=3.4;s.surface='brake';}
        if(zone.type===3){const n=Math.hypot(zone.dx??1,zone.dz??0)||1;ax+=(zone.dx??1)/n*4.4;az+=(zone.dz??0)/n*4.4;s.surface='boost';}
      }
    }
    if(c.grounded&&c.jumpCooldown<=0){
      for(const pad of room.jumpPads??[]){
        if(Math.hypot(c.x-pad.x,c.z-pad.z)<=pad.r&&Math.abs(c.y-(pad.y??0))<.12){
          c.vy=pad.power??3;c.vx+=(pad.dx??0)*.62;c.vz+=(pad.dz??0)*.62;c.grounded=false;c.support=-1;c.jumpCooldown=.55;
          this.emit('jump',pad.x,pad.z,.65);break;
        }
      }
    }
    c.vx=(c.vx+ax*dt)*Math.exp(-(friction+Math.hypot(c.vx,c.vz)*.04)*dt);
    c.vz=(c.vz+az*dt)*Math.exp(-(friction+Math.hypot(c.vx,c.vz)*.04)*dt);
    this.limitSpeed();
    if(!c.grounded||c.vy>0){c.vy-=GRAVITY_Y*dt;c.y+=c.vy*dt;}
    const solids=[...WALLS,...(room.obstacles??[]).map(o=>movingAt(o,s.time)).filter(o=>c.y<(o.h??.49)-.02)];
    for(const p of room.platforms??[])if(p.h>c.y+MAX_STEP)solids.push(movingAt(p,s.time));
    for(const r of room.ramps??[]){
      const nx=c.x+c.vx*dt,nz=c.z+c.vz*dt;
      if(insideRect(nx,nz,r,RADIUS)&&rampHeight(r,nx,nz)>c.y+MAX_STEP)solids.push(r);
    }
    this.move(dt,solids);
    this.bumpers();
    const ground=surfaceAt(room,c.x,c.z,s.time,Math.max(previousY,c.y)+MAX_STEP);
    const canFollow=wasGrounded&&c.vy<=0&&ground.height>=previousY-MAX_STEP&&ground.height<=previousY+MAX_STEP;
    if(c.vy<=0&&(c.y<=ground.height+1e-6||canFollow)){
      if(!c.grounded&&c.vy< -1.1)this.impact(Math.abs(c.vy));
      c.y=ground.height;c.vy=0;c.grounded=true;c.support=ground.platform;
    }else{c.grounded=false;c.support=-1;}
    // A footprint cannot escape the room even after a bumper or gate depenetration.
    c.x=clamp(c.x,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);c.z=clamp(c.z,-ROOM_LIMIT+RADIUS,ROOM_LIMIT-RADIUS);
    const speed=Math.hypot(c.vx,c.vz);
    if(speed>.001)c.q=Q.normalize(Q.multiply(Q.axis(c.vz,0,-c.vx,speed*dt/(c.size*.52)),c.q));
    this.checkTarget(dt);
  }
  limitSpeed() {
    const c=this.state.cube,speed=Math.hypot(c.vx,c.vz);
    if(speed>MAX_SPEED){c.vx*=MAX_SPEED/speed;c.vz*=MAX_SPEED/speed;}
  }
  collide(normal,box) {
    const c=this.state.cube,bx=box.vx??0,bz=box.vz??0;
    if(normal.nx){const relative=c.vx-bx;if(relative*normal.nx<0){this.impact(Math.abs(relative));c.vx=bx-relative*restitution(relative);c.vz*=.94;}}
    if(normal.nz){const relative=c.vz-bz;if(relative*normal.nz<0){this.impact(Math.abs(relative));c.vz=bz-relative*restitution(relative);c.vx*=.94;}}
  }
  move(dt,solids) {
    const c=this.state.cube;
    for(let pass=0;pass<4;pass++){
      let corrected=false;
      for(const o of solids){const overlap=penetration(c,o,RADIUS);if(overlap){c.x+=overlap.nx*(overlap.depth+1e-6);c.z+=overlap.nz*(overlap.depth+1e-6);this.collide(overlap,o);corrected=true;}}
      if(!corrected)break;
    }
    let remaining=dt;
    for(let pass=0;pass<5&&remaining>1e-7;pass++){
      const delta={x:c.vx*remaining,z:c.vz*remaining};let first=null,solid=null;
      for(const o of solids){const hit=sweepBox(c,delta,o,RADIUS);if(hit&&(!first||hit.t<first.t)){first=hit;solid=o;}}
      if(!first){c.x+=delta.x;c.z+=delta.z;break;}
      c.x+=delta.x*first.t+first.nx*1e-6;c.z+=delta.z*first.t+first.nz*1e-6;
      this.collide(first,solid);remaining*=1-first.t;
    }
  }
  bumpers() {
    const s=this.state,c=s.cube;
    for(const [i,b] of (this.room.bumpers??[]).entries()){
      if(c.y>(b.h??.34)+.02)continue;
      const radius=RADIUS+b.r,dx=c.x-b.x,dz=c.z-b.z,d=Math.hypot(dx,dz);
      if(d>=radius)continue;
      let nx,nz;
      if(d>1e-7){nx=dx/d;nz=dz/d;}else{const speed=Math.hypot(c.vx,c.vz);nx=speed>1e-7?-c.vx/speed:1;nz=speed>1e-7?-c.vz/speed:0;}
      c.x=b.x+nx*(radius+1e-5);c.z=b.z+nz*(radius+1e-5);
      if((s.bumperCooldowns[i]??-1)>s.time)continue;
      const normalSpeed=c.vx*nx+c.vz*nz,outgoing=clamp(b.strength??4.2,1,5.4);
      c.vx+=nx*(outgoing-normalSpeed);c.vz+=nz*(outgoing-normalSpeed);this.limitSpeed();
      s.bumperCooldowns[i]=s.time+.15;this.emit('bumper',b.x,b.z,.75);
    }
  }
  checkTarget(dt) {
    const s=this.state,c=s.cube,t=this.target;
    const dx=c.x-t.pos[0],dz=c.z-t.pos[1],distance=Math.hypot(dx,dz),height=Math.abs(c.y-(t.y??0));
    const stable=distance<.42&&height<.12&&c.grounded&&Math.hypot(c.vx,c.vz)<.48;
    c.hold=t.type===3&&stable?c.hold+dt:0;
    const hit=t.type===4?Math.abs(dx)<.4&&Math.abs(dz)<.4&&height<.2:
      t.type===3?stable&&c.hold>=.55:distance<.45&&height<.12&&c.grounded;
    if(!hit)return;
    this.emit('goal',t.pos[0],t.pos[1],.85);
    const length=this.room.sequence?.length??1;
    if(s.seq+1<length){s.seq++;c.hold=0;}
    else{s.solved=true;this.active=false;s.events.push({type:'complete',time:s.elapsed});}
  }
}
