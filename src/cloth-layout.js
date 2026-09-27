// Small optional cloth installations. Keep immutable campaign geometry and goals intact.
// A top rail and two slim floor supports are drawn with each hanging panel.
const INSTALLATIONS={
 1:{x:-2.05,z:.42,width:1.05,height:1.04,top:1.17,color:[.12,.57,.60]},
 6:{x:2.15,z:.35,width:.88,height:.96,top:1.10,color:[.72,.36,.14]},
 10:{x:-2.20,z:.40,width:.86,height:1.06,top:1.20,color:[.13,.54,.57]},
 15:{x:1.95,z:1.22,width:.90,height:.99,top:1.13,color:[.68,.32,.16]},
 23:{x:-2.2,z:-.65,width:.85,height:1.02,top:1.16,color:[.16,.53,.58]},
 30:{x:2.2,z:1.05,width:.86,height:1.01,top:1.15,color:[.71,.34,.17]},
 38:{x:-2.2,z:1.05,width:.86,height:1.02,top:1.16,color:[.13,.57,.57]}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,fallback)=>Number.isFinite(n)?n:fallback;

/** Explicit room.cloths is useful for authored scenes and tests; [] disables installation. */
export function clothsForRoom(room){
 const source=Array.isArray(room.cloths)?room.cloths:INSTALLATIONS[room.id]?[INSTALLATIONS[room.id]]:[];
 return source.slice(0,2).map((p,i)=>({
  id:String(p.id??`cloth-${room.id}-${i}`),x:number(p.x,0),z:number(p.z,0),
  top:clamp(number(p.top,1.15),.3,2.8),width:clamp(number(p.width,1),.25,1.5),height:clamp(number(p.height,1),.2,1.8),
  angle:number(p.angle,0),columns:clamp(Math.round(number(p.columns,9)),3,10),rows:clamp(Math.round(number(p.rows,10)),3,10),
  wind:clamp(number(p.wind,1),0,2),color:(p.color??[.13,.55,.59]).slice(0,3)
 }));
}
