import {animatedCubeRotation} from './level-transition.js';
import {movingAt} from './geometry.js';

// Geometry mirrors the visible collision envelopes in shaders.js. It writes only
// depth and hand shadows; the game's existing materials remain on the room canvas.
const triangle=(out,a,b,c)=>out.push(...a,...b,...c);
function quad(out,a,b,c,d){triangle(out,a,b,c);triangle(out,a,c,d);}
function rotate(p,q){
 const [x,y,z,w]=q,[a,b,c]=p,tx=2*(y*c-z*b),ty=2*(z*a-x*c),tz=2*(x*b-y*a);
 return [a+w*tx+y*tz-z*ty,b+w*ty+z*tx-x*tz,c+w*tz+x*ty-y*tx];
}
function box(out,center,half,radius=0,q=null,steps=8){
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const u=(axis+1)%3,v=(axis+2)%3;
  const point=(i,j)=>{
   const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=half[u]*(i/steps*2-1);p[v]=half[v]*(j/steps*2-1);
   if(radius){
    const core=p.map((x,k)=>Math.max(-half[k]+radius,Math.min(half[k]-radius,x))),d=p.map((x,k)=>x-core[k]),length=Math.hypot(...d);
    for(let k=0;k<3;k++)p[k]=core[k]+d[k]*radius/length;
   }
   const rotated=q?rotate(p,q):p;return rotated.map((x,k)=>x+center[k]);
  };
  for(let i=0;i<steps;i++)for(let j=0;j<steps;j++)quad(out,point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1));
 }
}
function cylinder(out,x,z,r,y,h){
 for(let i=0;i<48;i++){
  const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
  const p=[x+Math.cos(a)*r,y+h,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y+h,z+Math.sin(b)*r];
  triangle(out,[x,y+h,z],p,q);quad(out,p,q,[q[0],y,q[2]],[p[0],y,p[2]]);
 }
}
function ramp(out,r){
 let dx=r.dx??0,dz=r.dz??-1;const l=Math.hypot(dx,dz);if(l<1e-8){dx=0;dz=-1;}else{dx/=l;dz/=l;}
 const base=r.base??0,span=Math.abs(dx)*r.w+Math.abs(dz)*r.d;
 const point=(i,j)=>{const x=r.x+(i/8-.5)*r.w,z=r.z+(j/8-.5)*r.d;return [x,base+Math.max(0,Math.min(1,((x-r.x)*dx+(z-r.z)*dz)/span+.5))*(r.h-base),z];};
 for(let i=0;i<8;i++)for(let j=0;j<8;j++)quad(out,point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1));
 const edges=[point(0,0),point(8,0),point(8,8),point(0,8)];
 for(let i=0;i<4;i++){const a=edges[i],b=edges[(i+1)%4];quad(out,a,b,[b[0],base-.025,b[2]],[a[0],base-.025,a[2]]);}
}
export function roomReceivers(room,time=0){
 const out=[];
 box(out,[0,-.055,0],[3.25,.055,3.25],0,null,16);
 box(out,[0,.005,.78],[2.08,.005,1.27],.004);
 box(out,[0,1.58,-3.23],[3.25,1.62,.045],0,null,12);
 for(const x of [-3.23,3.23])box(out,[x,1.58,0],[.045,1.62,3.25],0,null,12);
 box(out,[0,3.18,0],[3.25,.045,3.25]);
 box(out,[0,.115,-3.155],[3.18,.105,.045],.02);
 for(const x of [-3.155,3.155])box(out,[x,.115,0],[.045,.105,3.18],.02);
 appendObjects(out,room,time);
 return new Float32Array(out);
}
export function dynamicReceivers(state,target,includeCloth=true,transition=null){
 const out=[],c=state.cube,[x,y,z,w]=c.q;
 const extent=.245*(Math.abs(2*(x*y+w*z))+Math.abs(1-2*(x*x+z*z))+Math.abs(2*(y*z-w*x)));
 const scale=transition?.scale??1;
 if(scale>=.008)box(out,[c.x,c.y+extent+.01+(transition?.lift??0),c.z],[.245*scale,.245*scale,.245*scale],.038*scale,animatedCubeRotation(c,transition),10);
 if(target&&target.type<2.5)cylinder(out,target.pos[0],target.pos[1],.49,.015+(target.y??0),.04);
 if(includeCloth)for(const cloth of state.cloths??[]){
  const p=cloth.positions;for(const index of cloth.indices??[]){const i=index*3;out.push(p[i],p[i+1],p[i+2]);}
 }
 return new Float32Array(out);
}


function appendObjects(out,room,time){
 for(const raw of (room.obstacles??[]).slice(0,6)){const o=movingAt(raw,time);box(out,[o.x,.245,o.z],[o.w/2,.245,o.d/2],.045);}
 for(const raw of (room.platforms??[]).slice(0,4)){const p=movingAt(raw,time),h=Math.max(.03,p.h);box(out,[p.x,h/2,p.z],[p.w/2,h/2,p.d/2],.018);}
 for(const r of (room.ramps??[]).slice(0,3))ramp(out,r);
 for(const b of (room.bumpers??[]).slice(0,3))cylinder(out,b.x,b.z,b.r,0,Math.max(b.h??.34,.34));
}

// Match renderer.uBumpFx and shaders.jellyDistance: squash along the normalized
// impact axis, expand perpendicularly, and scale world Y about the floor.
function bumperPose(jelly){
 const value=Number.isFinite(jelly?.compression)?jelly.compression:0,compression=Math.max(-.045,Math.min(.26,value));
 if(Math.abs(compression)<.00001)return [0,1,0];
 const x=Number.isFinite(jelly?.axisX)?jelly.axisX:1,z=Number.isFinite(jelly?.axisZ)?jelly.axisZ:0,length=Math.hypot(x,z);
 return [compression,length>.00001?x/length:1,length>.00001?z/length:0];
}
function appendBumpers(out,bumpers,poses){
 bumpers.forEach((b,i)=>{
  const start=out.length,[compression,ax,az]=poses[i];
  cylinder(out,b.x,b.z,b.r,0,Math.max(b.h??.34,.34));
  if(!compression)return; // Preserve the neutral cylinder byte for byte.
  const sx=1-compression*.8,sy=1+compression*.5,sz=1+compression*.4;
  for(let k=start;k<out.length;k+=3){
   const x=(out[k]-b.x)*sx,z=(out[k+2]-b.z)*sz;
   out[k]=b.x+ax*x-az*z;out[k+1]*=sy;out[k+2]=b.z+az*x+ax*z;
  }
 });
}

/** Content key survives structured cloning from the render worker. */
export class RoomReceiverCache{
 update(room,time=0,bumperJelly=[]){
  const geometry={obstacles:(room.obstacles??[]).slice(0,6),platforms:(room.platforms??[]).slice(0,4),ramps:(room.ramps??[]).slice(0,3),bumpers:(room.bumpers??[]).slice(0,3)};
  const key=JSON.stringify(geometry),staticChanged=key!==this.key;
  if(staticChanged){
   this.key=key;
   this.staticVertices=roomReceivers({...geometry,bumpers:[],obstacles:geometry.obstacles.filter(o=>!o.move),platforms:geometry.platforms.filter(o=>!o.move)});
   this.moving={obstacles:geometry.obstacles.filter(o=>o.move),platforms:geometry.platforms.filter(o=>o.move)};
   this.hasMovement=this.moving.obstacles.length+this.moving.platforms.length>0;
  }
  const poses=geometry.bumpers.map((_,i)=>bumperPose(bumperJelly?.[i])),jellyKey=JSON.stringify(poses);
  const movingChanged=staticChanged||(this.hasMovement&&time!==this.time)||jellyKey!==this.jellyKey;
  if(movingChanged){const out=[];appendObjects(out,this.moving,time);appendBumpers(out,geometry.bumpers,poses);this.movingVertices=new Float32Array(out);this.time=time;this.jellyKey=jellyKey;}
  return {staticVertices:this.staticVertices,movingVertices:this.movingVertices,staticChanged,movingChanged};
 }
}
