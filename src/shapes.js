import {clamp,finite} from './math.js';

/** One footprint contract for simulation, scene geometry and map previews. */
export function footprint(zone){
 const radius=Math.max(.01,finite(zone.r,.5));
 if(zone.shape!=='rect'&&zone.shape!=='capsule')return {halfW:radius,halfD:radius,corner:radius,angle:0};
 const halfW=clamp(finite(zone.w,2*radius)/2,.01,8),halfD=clamp(finite(zone.d,2*radius)/2,.01,8);
 return {halfW,halfD,corner:zone.shape==='capsule'?Math.min(halfW,halfD):clamp(finite(zone.corner,.12),0,Math.min(halfW,halfD)),angle:finite(zone.angle)};
}
export function signedDistance(zone,x,z){
 const f=footprint(zone),cos=Math.cos(f.angle),sin=Math.sin(f.angle),dx=x-finite(zone.x),dz=z-finite(zone.z);
 const qx=Math.abs(dx*cos+dz*sin)-f.halfW+f.corner,qz=Math.abs(-dx*sin+dz*cos)-f.halfD+f.corner;
 return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-f.corner;
}
export const containsFootprint=(zone,x,z,padding=0)=>signedDistance(zone,x,z)<=padding;
