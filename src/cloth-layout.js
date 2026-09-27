// Grounded curtains stand in front of real interactive elements. The cube can
// push the hems aside; posts do not change the campaign collision geometry.
const INSTALLATIONS={
 1:[{x:1.36,z:-.70,width:1.25,top:1.06,reveal:{kind:'goal'},color:[.12,.57,.60]}],
 6:[
  {x:1.455,z:-1.02,width:.76,top:1.02,supports:[true,false],reveal:{kind:'goal'},color:[.72,.36,.14]},
  {x:2.195,z:-1.02,width:.76,top:1.02,supports:[false,true],reveal:{kind:'goal'},color:[.72,.36,.14]}
 ],
 12:[{x:.52,z:1.15,width:1.12,top:1.12,reveal:{kind:'bumper',index:0},color:[.13,.54,.57]}],
 16:[{x:-.9,z:1.32,width:1.2,top:1.02,reveal:{kind:'jump',index:0},color:[.68,.32,.16]}],
 30:[{x:0,z:-1.73,width:1.48,top:1.70,reveal:{kind:'portal',index:1},color:[.16,.53,.58]}],
 38:[{x:1.72,z:-1.78,width:1.42,top:1.65,reveal:{kind:'portal',index:1},color:[.71,.34,.17]}]
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,fallback)=>Number.isFinite(n)?n:fallback;

/** Explicit room.cloths is useful for authored scenes and tests; [] disables installation. */
export function clothsForRoom(room){
 const source=Array.isArray(room.cloths)?room.cloths:INSTALLATIONS[room.id]??[];
 return source.slice(0,2).map((p,i)=>{
  const top=clamp(number(p.top,1.15),.3,2.8),baseY=clamp(number(p.baseY,0),0,2.4);
  return {
   id:String(p.id??`cloth-${room.id}-${i}`),x:number(p.x,0),z:number(p.z,0),top,
   width:clamp(number(p.width,1),.25,1.8),height:clamp(number(p.height,top-baseY-.014),.2,2.7),baseY,
   angle:number(p.angle,0),columns:clamp(Math.round(number(p.columns,9)),3,10),rows:clamp(Math.round(number(p.rows,10)),3,10),
   wind:clamp(number(p.wind,.22),0,2),color:(p.color??[.13,.55,.59]).slice(0,3),
   supports:[p.supports?.[0]!==false,p.supports?.[1]!==false],reveal:p.reveal?{...p.reveal}:null
  };
 });
}
