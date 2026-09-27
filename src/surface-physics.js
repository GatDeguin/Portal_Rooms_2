import {clamp,finite} from './math.js';

/** Legacy zone IDs are kept so saved campaigns and controls retain their meaning. */
export function surfaceResponse(room,state,floor,dt,ax,az){
 const c=state.cube,speed=Math.hypot(c.vx,c.vz);
 let friction=c.grounded?(floor.kind==='carpet'?1.28:.92):.08,adhesion=0,zone=null,index=-1;
 state.surface=c.grounded?floor.kind:'air';
 // Zones are shallow layers on the room floor, not columns through upper levels.
 if(c.grounded&&floor.height<.08&&Math.abs(c.y-floor.height)<.08){
  for(const [i,z] of (room.zones??[]).entries())if(z.type>=1&&z.type<=3&&Math.hypot(c.x-z.x,c.z-z.z)<=z.r){zone=z;index=i;}
 }
 const wet=zone?.type===1,sticky=zone?.type===2;
 c.wetness=clamp((c.wetness??0)+dt*(wet?3.5:-.85),0,1);
 c.slime=clamp((c.slime??0)+dt*(sticky?4:-1.8),0,1);
 state.surfaceZone=index;
 if(wet){
  // Small sliding friction plus speed-dependent hydrodynamic resistance.
  friction=.095+speed*.065;state.surface='ice';
 }else if(sticky){
  // Shear-thinning gel: high resistance at low speed, yielding under deliberate input.
  friction=2.9+1.2/(1+speed*.7);adhesion=.62*c.slime;state.surface='brake';
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
