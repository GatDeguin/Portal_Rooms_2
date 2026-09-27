import {animatedCubeRotation} from './level-transition.js';
// Small raster meshes derived only from the presented physics snapshot. No clock,
// randomness or simulation lives here, so pause and slow workers stay coherent.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(n);
const point=p=>p&&[p.x,p.y,p.z].every(finite);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const vertex=(out,p,n,alpha)=>out.push(...p,...n,alpha,0);
const triangles=[];
for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
 const a=[x,0,0],b=[0,y,0],c=[0,0,z],ab=norm(mix(a,b,.5)),bc=norm(mix(b,c,.5)),ca=norm(mix(c,a,.5));
 triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
}
function ellipsoid(out,center,scale,alpha,axis=[0,1,0]){
 const up=norm(axis),right=norm(cross(up,Math.abs(up[2])<.9?[0,0,1]:[1,0,0])),forward=cross(right,up);
 for(const d of triangles){
  const x=d[0]*scale[0],y=d[1]*scale[1],z=d[2]*scale[2],ix=d[0]/scale[0],iy=d[1]/scale[1],iz=d[2]/scale[2];
  const nx=right[0]*ix+up[0]*iy+forward[0]*iz,ny=right[1]*ix+up[1]*iy+forward[1]*iz,nz=right[2]*ix+up[2]*iy+forward[2]*iz,length=Math.hypot(nx,ny,nz)||1;
  out.push(center[0]+right[0]*x+up[0]*y+forward[0]*z,center[1]+right[1]*x+up[1]*y+forward[1]*z,center[2]+right[2]*x+up[2]*y+forward[2]*z,nx/length,ny/length,nz/length,alpha,0);
 }
}
function tube(out,path,radius,alpha){
 for(let segment=0;segment<path.length-1;segment++){
  const a=path[segment],b=path[segment+1],axis=norm(b.map((v,k)=>v-a[k])),right=norm(cross(axis,Math.abs(axis[1])<.95?[0,1,0]:[1,0,0])),up=cross(right,axis);
  const ring=(p,j,t)=>{const angle=j*Math.PI/3,n=right.map((v,k)=>v*Math.cos(angle)+up[k]*Math.sin(angle)),r=radius*(.6+.4*Math.abs(2*t-1));return {p:p.map((v,k)=>v+n[k]*r),n};};
  for(let j=0;j<6;j++){
   const p=ring(a,j,segment/(path.length-1)),q=ring(a,j+1,segment/(path.length-1)),r=ring(b,j,(segment+1)/(path.length-1)),s=ring(b,j+1,(segment+1)/(path.length-1));
   for(const v of [p,r,q,q,r,s])vertex(out,v.p,v.n,alpha);
  }
 }
}
function rotate(p,q){const [x,y,z,w]=q,[a,b,c]=p,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];}
function fade(item){return Math.pow(clamp(item.life/Math.max(.001,item.maxLife??1),0,1),.65);}
const activeParticle=p=>point(p)&&finite(p.life)&&p.life>0&&finite(p.size)&&p.size>0;
const activeRipple=p=>p&&[p.x,p.z,p.r,p.life].every(finite)&&p.r>0&&p.life>0;

export function hasSurfaceEffects(state){
 const fx=state.surfaceFx;
 return (state.cube?.slime??0)>.035||!!fx?.particles?.some(activeParticle)||!!fx?.ripples?.some(activeRipple);
}

/** Batches: 1 water droplets, 2 viscous gel, 3 water rings, 4 slime rings.
 * Interleaved position/normal/opacity uses the same 8-float vertex layout as cloth.
 */
export function surfaceEffectsGeometry(state,{reduced=false,enabled=true,transition=null}={}){
 if(!enabled)return [];
 const fx=state.surfaceFx??{},groups=[[],[],[],[]],particleLimit=reduced?36:96;
 for(const p of (fx.particles??[]).slice(0,particleLimit)){
  if(!activeParticle(p))continue;
  const slime=p.type===2,kind=slime?1:0,r=clamp(p.size,.006,.12)*(slime?1.15:1),velocity=[p.vx??0,p.vy??0,p.vz??0].map(v=>finite(v)?v:0),speed=Math.hypot(...velocity),stretch=slime?1.05:1+Math.min(.85,speed*.22);
  ellipsoid(groups[kind],[p.x,Math.max(r*stretch+.013,p.y),p.z],[r,r*stretch,r],fade(p)*(slime?.96:.82),speed>.03?velocity:[0,1,0]);
 }
 for(const p of (fx.ripples??[]).slice(0,reduced?8:24)){
  if(!activeRipple(p))continue;
  const out=groups[p.type===2?3:2],alpha=fade(p)*.66,segments=reduced?24:40,r=clamp(p.r,.015,2),width=.004+alpha*.014,y=finite(p.y)?p.y:.025;
  const at=(j,outer)=>{const angle=j*Math.PI*2/segments,rr=r+(outer?width:-Math.min(width,r*.3));return [p.x+Math.cos(angle)*rr,y,p.z+Math.sin(angle)*rr];};
  for(let j=0;j<segments;j++)for(const v of [at(j,0),at(j,1),at(j+1,0),at(j+1,0),at(j,1),at(j+1,1)])vertex(out,v,[0,1,0],alpha);
 }
 const cube=state.cube,slime=clamp(cube?.slime??0,0,1),scale=Math.max(0,transition?.scale??1);
 if(point(cube)&&slime>.035&&scale>=.008){
  const out=groups[1],rawQ=cube.q??[0,0,0,1],q=animatedCubeRotation({...cube,q:rawQ},transition),half=.245*scale;
  const [qx,qy,qz,qw]=rawQ,extent=.245*(Math.abs(2*(qx*qy+qw*qz))+Math.abs(1-2*(qx*qx+qz*qz))+Math.abs(2*(qy*qz-qw*qx))),center=[cube.x,cube.y+extent+.01+(transition?.lift??0),cube.z];
  const ends=[],count=reduced?4:8;
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,local=rotate([Math.cos(a)*half*1.02,-half*.35,Math.sin(a)*half*1.02],q),p=local.map((v,k)=>center[k]+v),r=(.06+.085*slime)*(i%2?.9:1)*scale;
   p[1]=Math.max(.016+r*.85,p[1]);ends.push(p);ellipsoid(out,p,[r,r*.85,r],.98*slime);
  }
  const stretch=fx.stretch,strength=clamp(stretch?.strength??0,0,1);
  if(strength>.025&&finite(stretch.x)&&finite(stretch.z)&&Math.hypot(cube.x-stretch.x,cube.z-stretch.z)<2.8){
   const anchor=[stretch.x,.04,stretch.z],distance=Math.hypot(cube.x-stretch.x,cube.z-stretch.z),count=reduced?2:5;
   for(let j=0;j<count;j++){
    const offset=(j-(count-1)/2)*.045,start=[anchor[0]+offset,anchor[1],anchor[2]-offset*.5],end=ends[j%ends.length],path=[];
    for(let i=0;i<=7;i++){const t=i/7,p=mix(start,end,t);p[1]+=(.10+distance*.10)*Math.sin(t*Math.PI)*strength;path.push(p);}
    tube(out,path,(.025+.020*strength)*slime*scale,.96*strength);ellipsoid(out,[start[0],.052,start[2]],[.105*slime,.038,.105*slime],.9*strength);
   }
  }
 }
 return groups.flatMap((vertices,i)=>vertices.length?[{kind:i+1,vertices:new Float32Array(vertices)}]:[]);
}


export class SurfaceEffectsCache{
 update(state,{reduced=false,enabled=true,transition=null}={}){
  const c=state.cube??{},fx=state.surfaceFx,key=[state,state.time,fx,fx?.particles,fx?.ripples,fx?.particles?.length,fx?.ripples?.length,c.x,c.y,c.z,c.slime,...(c.q??[]),reduced,enabled,transition?.scale,transition?.lift,transition?.spin];
  if(this.key&&key.length===this.key.length&&key.every((v,i)=>v===this.key[i]))return {batches:this.batches,changed:false};
  this.key=key;this.batches=surfaceEffectsGeometry(state,{reduced,enabled,transition});return {batches:this.batches,changed:true};
 }
}
