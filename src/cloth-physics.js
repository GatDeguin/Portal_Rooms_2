import {clothsForRoom} from './cloth-layout.js';
import {movingAt,insideRect,rampHeight} from './geometry.js';

const STEP=1/120,THICKNESS=.014,ITERATIONS=7;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const velocity=(p,key)=>clamp(Number.isFinite(p?.[key])?p[key]:0,-8,8);

function makeCloth(def){
 const {columns,rows,width,height,top,x,z,angle}=def,stride=columns+1,count=stride*(rows+1),positions=new Float64Array(count*3),uvs=new Float32Array(count*2),indices=[];
 const along=[Math.cos(angle),0,Math.sin(angle)],normal=[-Math.sin(angle),0,Math.cos(angle)];
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const n=row*stride+col,u=col/columns,v=row/rows,across=(u-.5)*width,fold=Math.sin(u*Math.PI*8)*Math.sin(v*Math.PI*.5)*.018;
  positions.set([x+along[0]*across+normal[0]*fold,top-height*v,z+along[2]*across+normal[2]*fold],n*3);uvs.set([u,v],n*2);
  if(row<rows&&col<columns){const a=n,b=n+1,c=n+stride,d=c+1;indices.push(a,c,b,b,c,d);}
 }
 const constraints=[];
 const link=(a,b,stiffness)=>{const i=a*3,j=b*3;constraints.push([i,j,Math.hypot(positions[i]-positions[j],positions[i+1]-positions[j+1],positions[i+2]-positions[j+2]),stiffness]);};
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const a=row*stride+col;
  if(col<columns)link(a,a+1,1);
  if(row<rows)link(a,a+stride,1);
  if(col<columns&&row<rows){link(a,a+stride+1,.75);link(a+1,a+stride,.75);}
  if(col<columns-1)link(a,a+2,.25);
  if(row<rows-1)link(a,a+stride*2,.25);
 }
 const frame={id:def.id,columns,rows,width,height,color:def.color,positions:new Float32Array(positions),normals:new Float32Array(count*3),uvs,indices:new Uint16Array(indices),rail:[Array.from(positions.slice(0,3)),Array.from(positions.slice(columns*3,columns*3+3))]};
 return {def,positions,previous:positions.slice(),anchors:positions.slice(0,stride*3),constraints,frame,normal,freeStart:stride*3};
}
function normals(frame){
 const p=frame.positions,n=frame.normals,t=frame.indices;n.fill(0);
 for(let k=0;k<t.length;k+=3){
  const a=t[k]*3,b=t[k+1]*3,c=t[k+2]*3,ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  for(const i of [a,b,c]){n[i]+=nx;n[i+1]+=ny;n[i+2]+=nz;}
 }
 for(let i=0;i<n.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2]);if(l<1e-9){n[i]=0;n[i+1]=0;n[i+2]=1;}else{n[i]/=l;n[i+1]/=l;n[i+2]/=l;}}
}
function correction(cloth,i,dx,dy,dz,collider=null,dt=0){
 const p=cloth.positions,old=cloth.previous;p[i]+=dx;p[i+1]+=dy;p[i+2]+=dz;
 // Preserve a small amount of contact momentum without the solver correction
 // becoming an unbounded Verlet impulse when a tracked hand suddenly appears.
 old[i]+=dx*.82-velocity(collider,'vx')*dt*.08;
 old[i+1]+=dy*.82-velocity(collider,'vy')*dt*.08;
 old[i+2]+=dz*.82-velocity(collider,'vz')*dt*.08;
}
function boxContact(cloth,i,box,dt=0){
 const p=cloth.positions,local=[p[i]-box.x,p[i+1]-box.y,p[i+2]-box.z],axes=box.axes;
 if(axes){const v=local.slice();for(let k=0;k<3;k++)local[k]=v[0]*axes[k][0]+v[1]*axes[k][1]+v[2]*axes[k][2];}
 const depth=box.half.map((h,k)=>h+THICKNESS-Math.abs(local[k]));
 if(depth.some(d=>d<=0))return false;
 let axis=0;if(depth[1]<depth[axis])axis=1;if(depth[2]<depth[axis])axis=2;
 const sign=local[axis]<0?-1:1,amount=depth[axis]*sign,d=[0,0,0];
 if(axes)for(let k=0;k<3;k++)d[k]=axes[axis][k]*amount;else d[axis]=amount;
 correction(cloth,i,...d,box,dt);return true;
}
function sphereContact(cloth,i,sphere,dt){
 const p=cloth.positions,dx=p[i]-sphere.x,dy=p[i+1]-sphere.y,dz=p[i+2]-sphere.z,d=Math.hypot(dx,dy,dz),r=clamp(sphere.radius??.085,.025,.3)+THICKNESS;
 if(d>=r)return;
 const n=d>1e-7?[dx/d,dy/d,dz/d]:cloth.normal;
 correction(cloth,i,n[0]*(r-d),n[1]*(r-d),n[2]*(r-d),sphere,dt);
}
function cubeBox(cube){
 if(!finitePoint(cube))return null;
 const half=clamp(cube.size??.48,.05,1)*.5,q=cube.q??[0,0,0,1],length=Math.hypot(...q)||1,[x,y,z,w]=q.map(v=>v/length);
 const axes=[[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y)],[2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x)],[2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)]];
 const extent=half*(Math.abs(axes[0][1])+Math.abs(axes[1][1])+Math.abs(axes[2][1]));
 return {...cube,y:cube.y+extent,half:[half,half,half],axes};
}
function roomBoxes(room,time){
 const boxes=[];
 for(const raw of [...(room.obstacles??[]),...(room.platforms??[])]){
  const o=movingAt(raw,time),h=room.platforms?.includes(raw)?Math.max(.03,o.h):.49;
  boxes.push({...o,y:h/2,half:[o.w/2,h/2,o.d/2]});
 }
 return boxes;
}

/** Small deterministic Verlet cloth, advanced only by the game's fixed step.
 * snapshot() owns render arrays, never solver positions/previous. Arrays are
 * reused until the next snapshot; structuredClone at worker dispatch is safe.
 */
export class ClothSystem{
 constructor(room){this.room=room;this.cloths=clothsForRoom(room).map(makeCloth);this.frames=this.cloths.map(c=>c.frame);this.dirty=true;}
 step(dt,{cube=null,time=0,hands=[]}={}){
  if(!Number.isFinite(dt)||dt<=0||!this.cloths.length)return;
  const elapsed=Math.min(dt,1/30),steps=Math.ceil(elapsed/STEP),h=elapsed/steps;
  for(let sub=0;sub<steps;sub++)this.advance(h,{cube,time:(Number.isFinite(time)?time:0)-(steps-sub-1)*h,hands});
  this.dirty=true;
 }
 advance(dt,{cube,time,hands}){
  const box=cubeBox(cube),solids=roomBoxes(this.room,time),spheres=[];
  for(const hand of hands.slice(0,2)){if(finitePoint(hand.palm))spheres.push({...hand.palm,radius:hand.palm.radius??.17});for(const p of (hand.points??[]).slice(0,21))if(finitePoint(p))spheres.push(p);}
  let touchedCube=false;
  for(const cloth of this.cloths){
   const p=cloth.positions,previous=cloth.previous,wind=cloth.def.wind;
   for(let i=cloth.freeStart;i<p.length;i+=3){
    const old=[p[i],p[i+1],p[i+2]],speed=Math.hypot(p[i]-previous[i],p[i+1]-previous[i+1],p[i+2]-previous[i+2]),scale=Math.min(1,.045/Math.max(speed,1e-9))*Math.exp(-2.2*dt);
    const gust=(.9+.75*Math.sin(time*1.9+p[i]*2.2)+.30*Math.sin(time*3.1+p[i+1]*4))*wind;
    p[i]+=(p[i]-previous[i])*scale+(cloth.normal[0]*gust+.16*Math.sin(time*1.3+p[i+1]*3)*wind)*dt*dt;
    p[i+1]+=(p[i+1]-previous[i+1])*scale-7*dt*dt;
    p[i+2]+=(p[i+2]-previous[i+2])*scale+cloth.normal[2]*gust*dt*dt;
    previous.set(old,i);
   }
   for(let pass=0;pass<ITERATIONS;pass++){
    for(const [a,b,rest,stiffness] of cloth.constraints){
     const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],length=Math.hypot(dx,dy,dz),wa=a>=cloth.freeStart?1:0,wb=b>=cloth.freeStart?1:0;
     if(length<1e-9||wa+wb===0)continue;
     const weight=(length-rest)/length*stiffness/(wa+wb);
     for(let k=0;k<3;k++){const d=(k===0?dx:k===1?dy:dz)*weight;p[a+k]+=d*wa;p[b+k]-=d*wb;}
    }
    const contactDt=pass===ITERATIONS-1?dt:0;
    for(let i=cloth.freeStart;i<p.length;i+=3){
     for(const sphere of spheres)sphereContact(cloth,i,sphere,contactDt);
     if(box&&boxContact(cloth,i,box,contactDt))touchedCube=true;
     // Solid room geometry wins over a tracked hand that can penetrate walls.
     for(const solid of solids)boxContact(cloth,i,solid,contactDt);
     for(const ramp of this.room.ramps??[])if(insideRect(p[i],p[i+2],ramp)){
      const y=rampHeight(ramp,p[i],p[i+2])+THICKNESS;
      if(p[i+1]<y)correction(cloth,i,0,y-p[i+1],0);
     }
     for(const b of this.room.bumpers??[]){
      const dx=p[i]-b.x,dz=p[i+2]-b.z,d=Math.hypot(dx,dz),r=b.r+THICKNESS,h=Math.max(b.h??.34,.34)+THICKNESS;
      if(d<r&&p[i+1]<h){if(h-p[i+1]<r-d)correction(cloth,i,0,h-p[i+1],0);else correction(cloth,i,(d>1e-8?dx/d:1)*(r-d),0,(d>1e-8?dz/d:0)*(r-d));}
     }
     const x=clamp(p[i],-3.15,3.15),y=clamp(p[i+1],THICKNESS,3.12),z=clamp(p[i+2],-3.15,3.15);
     if(x!==p[i]||y!==p[i+1]||z!==p[i+2])correction(cloth,i,x-p[i],y-p[i+1],z-p[i+2]);
    }
    p.set(cloth.anchors,0);previous.set(cloth.anchors,0);
   }
  }
  // A contact only adds light drag. It cannot block a route or displace a goal cube.
  if(touchedCube&&cube){const drag=Math.exp(-.42*dt);for(const key of ['vx','vy','vz'])if(Number.isFinite(cube[key]))cube[key]*=drag;}
 }
 snapshot(){
  if(this.dirty){for(const cloth of this.cloths){cloth.frame.positions.set(cloth.positions);normals(cloth.frame);}this.dirty=false;}
  return this.frames;
 }
}
