import {clamp} from './math.js';
export const ROOM_LIMIT = 3.2;
export const insideRect = (x,z,o,pad=0) => Math.abs(x-o.x)<=o.w/2+pad+1e-8 && Math.abs(z-o.z)<=o.d/2+pad+1e-8;

export function movingAt(object, time) {
  if (!object.move) return {...object,vx:0,vz:0};
  const m=object.move, speed=m.speed??1, amp=m.amp??0, phase=time*speed+(m.phase??0);
  const delta=Math.sin(phase)*amp, velocity=Math.cos(phase)*amp*speed;
  return {...object,x:object.x+(m.axis==='x'?delta:0),z:object.z+(m.axis==='z'?delta:0),vx:m.axis==='x'?velocity:0,vz:m.axis==='z'?velocity:0};
}
// This projected span and base height are also used verbatim in shaders.js.
export function rampHeight(r,x,z) {
  let dx=r.dx??0,dz=r.dz??-1;
  const length=Math.hypot(dx,dz);
  if (length<1e-8) { dx=0; dz=-1; } else { dx/=length; dz/=length; }
  const span=Math.max(Math.abs(dx)*r.w+Math.abs(dz)*r.d,1e-8);
  const t=clamp(((x-r.x)*dx+(z-r.z)*dz)/span+.5,0,1);
  return (r.base??0)+t*((r.h??.6)-(r.base??0));
}
export function surfaceAt(level,x,z,time=0,ceiling=Infinity) {
  let result={height:0,kind:Math.abs(x)<2.08&&Math.abs(z-.78)<1.27?'carpet':'wood',platform:-1};
  for (const [index,p] of (level.platforms??[]).entries()) {
    const active=movingAt(p,time);
    if (insideRect(x,z,active)&&p.h<=ceiling+1e-8&&p.h>=result.height) result={height:p.h,kind:'platform',platform:index};
  }
  for (const r of level.ramps??[]) {
    const height=rampHeight(r,x,z);
    if (insideRect(x,z,r)&&height<=ceiling+1e-8&&height>result.height+1e-8) result={height,kind:'ramp',platform:-1};
  }
  return result;
}
export function activeTarget(level,seq=0,time=0) {
  const targets=level.sequence?.length?level.sequence:[level.target];
  const target=targets[clamp(Math.trunc(seq),0,targets.length-1)];
  if (!target) return {type:1,pos:[0,0],y:0};
  if (Number.isInteger(target.platform)&&level.platforms?.[target.platform]) {
    const base=level.platforms[target.platform],p=movingAt(base,time);
    return {...target,pos:[target.pos[0]+p.x-base.x,target.pos[1]+p.z-base.z]};
  }
  return target;
}
/** Sweep a point through a box expanded by the cube's collision radius. */
export function sweepBox(origin,delta,box,radius=.24) {
  const minX=box.x-box.w/2-radius,maxX=box.x+box.w/2+radius;
  const minZ=box.z-box.d/2-radius,maxZ=box.z+box.d/2+radius;
  let nearX=-Infinity,farX=Infinity,nearZ=-Infinity,farZ=Infinity;
  if (Math.abs(delta.x)<1e-12) { if(origin.x<minX||origin.x>maxX)return null; }
  else { const a=(minX-origin.x)/delta.x,b=(maxX-origin.x)/delta.x; nearX=Math.min(a,b);farX=Math.max(a,b); }
  if (Math.abs(delta.z)<1e-12) { if(origin.z<minZ||origin.z>maxZ)return null; }
  else { const a=(minZ-origin.z)/delta.z,b=(maxZ-origin.z)/delta.z; nearZ=Math.min(a,b);farZ=Math.max(a,b); }
  const enter=Math.max(nearX,nearZ),leave=Math.min(farX,farZ);
  if (enter< -1e-8||enter>1||leave<Math.max(0,enter)||!Number.isFinite(enter)) return null;
  return {t:Math.max(0,enter),nx:Math.abs(nearX-enter)<1e-8?-Math.sign(delta.x):0,nz:Math.abs(nearZ-enter)<1e-8?-Math.sign(delta.z):0};
}
/** Resolve existing overlap, including a moving gate sweeping onto a resting cube. */
export function penetration(point,box,radius=.24) {
  const minX=box.x-box.w/2-radius,maxX=box.x+box.w/2+radius;
  const minZ=box.z-box.d/2-radius,maxZ=box.z+box.d/2+radius;
  if(point.x<=minX||point.x>=maxX||point.z<=minZ||point.z>=maxZ)return null;
  const depths=[point.x-minX,maxX-point.x,point.z-minZ,maxZ-point.z];
  const i=depths.indexOf(Math.min(...depths));
  return {depth:depths[i],nx:i===0?-1:i===1?1:0,nz:i===2?-1:i===3?1:0};
}
