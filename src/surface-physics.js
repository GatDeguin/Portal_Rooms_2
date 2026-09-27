import {clamp,finite} from './math.js';
import {containsFootprint} from './shapes.js';

/** Legacy zone IDs are kept so saved campaigns and controls retain their meaning. */
export function surfaceResponse(room,state,floor,dt,ax,az){
 const c=state.cube,speed=Math.hypot(c.vx,c.vz);
 let friction=c.grounded?(floor.kind==='carpet'?1.28:.92):.08,adhesion=0,zone=null,index=-1;
 state.surface=c.grounded?floor.kind:'air';
 // Zones are shallow layers on the room floor, not columns through upper levels.
 if(c.grounded&&floor.height<.08&&Math.abs(c.y-floor.height)<.08){
  for(const [i,z] of (room.zones??[]).entries())if(z.type>=1&&z.type<=3&&containsFootprint(z,c.x,c.z)){zone=z;index=i;}
 }
 const wet=zone?.type===1,sticky=zone?.type===2;
 const previousZone=state.surfaceZone;
 c.slip=0;
 c.stickyStretch??={x:0,z:0};
 c.wetness=clamp((c.wetness??0)+dt*(wet?3.5:-.85),0,1);
 c.slime=clamp((c.slime??0)+dt*(sticky?4:-1.8),0,1);
 state.surfaceZone=index;
 if(wet){
  // A thin water film keeps longitudinal momentum and loses lateral traction at speed.
  // Opposing tilt still brakes: grip never reaches zero, even at the speed cap.
  const ux=speed>1e-6?c.vx/speed:0,uz=speed>1e-6?c.vz/speed:0,along=ax*ux+az*uz;
  const lateralX=ax-along*ux,lateralZ=az-along*uz;
  const hydroplane=clamp((speed-.35)/2.1,0,1),sideGrip=1-.58*hydroplane;
  const longitudinal=along<0?1-.24*hydroplane:1;
  c.slip=hydroplane*clamp(Math.hypot(lateralX,lateralZ)/3.9+Math.max(0,-along)/7,0,1);
  ax=ux*along*longitudinal+lateralX*sideGrip;az=uz*along*longitudinal+lateralZ*sideGrip;
  friction=.075+speed*.055;state.surface='ice';
 }else if(sticky){
  // The contact patch lags behind the cube, stretches, then yields rather than trapping it.
  if(previousZone!==index||!c.slimeAnchor)c.slimeAnchor={x:c.x,z:c.z};
  const relax=1-Math.exp(-dt/ .34);
  c.slimeAnchor.x+=(c.x-c.slimeAnchor.x)*relax;c.slimeAnchor.z+=(c.z-c.slimeAnchor.z)*relax;
  let sx=c.slimeAnchor.x-c.x,sz=c.slimeAnchor.z-c.z,length=Math.hypot(sx,sz);
  if(length>.38){sx*=.38/length;sz*=.38/length;c.slimeAnchor.x=c.x+sx;c.slimeAnchor.z=c.z+sz;}
  c.stickyStretch={x:sx,z:sz};
  ax+=sx*3.1;az+=sz*3.1;
  friction=3.7+2.2/(1+speed*1.8);adhesion=1.02*c.slime;state.surface='brake';
 }else if(zone?.type===3){
  const rawX=finite(zone.dx,1),rawZ=finite(zone.dz),length=Math.hypot(rawX,rawZ);
  const dx=length>1e-8?rawX/length:1,dz=length>1e-8?rawZ/length:0;
  const flow=clamp(finite(zone.flowSpeed,2.4),0,4),along=c.vx*dx+c.vz*dz;
  // Bound current force below the weakest full tilt so every flow remains escapable.
  const traction=Math.min(1.45,3.35/Math.max(flow,.01)),lateral=2.5;
  ax+=dx*(flow-along)*traction-(c.vx-along*dx)*lateral;
  az+=dz*(flow-along)*traction-(c.vz-along*dz)*lateral;
  friction=.12;state.surface='boost';
 }else if(c.grounded){
  // Thin coatings briefly carry the contact history onto the next surface.
  friction=friction*(1-c.wetness*.16)+c.slime*.85;adhesion=c.slime*.16;
 }
 if(!sticky){
  const decay=Math.exp(-dt*8);c.stickyStretch.x*=decay;c.stickyStretch.z*=decay;c.slimeAnchor=null;
 }
 return {ax,az,friction,adhesion};
}

/** Coulomb-like yield stress cannot reverse velocity or add energy at rest. */
export function applyAdhesion(c,amount){
 const speed=Math.hypot(c.vx,c.vz);
 if(speed>0&&amount>0){const scale=Math.max(0,speed-amount)/speed;c.vx*=scale;c.vz*=scale;}
}

export const createBumperJelly=room=>(room.bumpers??[]).map(()=>({compression:0,velocity:0,axisX:1,axisZ:0}));
export function stepBumperJelly(jellies,dt){
 for(const j of jellies){
  j.velocity+=(-160*j.compression-16*j.velocity)*dt;
  j.compression=clamp(j.compression+j.velocity*dt,-.045,.26);
  if(Math.abs(j.compression)<.00001&&Math.abs(j.velocity)<.0001)j.compression=j.velocity=0;
 }
}
export function impactBumperJelly(j,nx,nz,speed){
 if(!j)return;j.axisX=nx;j.axisZ=nz;
 j.compression=clamp(.065+Math.abs(speed)*.026,.065,.22);
 j.velocity=Math.min(1.6,.35+Math.abs(speed)*.16);
}

/** Low rubber caps store the impulse and visibly ring down after launch. */
export const createJumpJelly=room=>(room.jumpPads??[]).map(()=>({compression:0,velocity:0}));
export function impactJumpJelly(j,power=3){
 if(!j)return;j.compression=clamp(.38+Math.abs(power)*.035,.38,.62);j.velocity=1.4;
}
export function stepJumpJelly(jellies,dt){
 for(const j of jellies){
  j.velocity+=(-360*j.compression-5.8*j.velocity)*dt;
  j.compression=clamp(j.compression+j.velocity*dt,-.16,.72);
  if(Math.abs(j.compression)<.00001&&Math.abs(j.velocity)<.0001)j.compression=j.velocity=0;
 }
}
