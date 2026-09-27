// Rig adapted from the user-supplied Mano Atelier v03. See assets/hands/README.md.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const REST=new Float32Array([
0,0,0, -2.05,1.35,.35,-4.35,3.55,.68,-5.8,5.25,.86,-6.75,6.65,1.0,
-2.55,6.85,0,-2.93,10.05,.02,-3.06,12.22,.01,-3.1,13.9,0,
-.7,7.3,-.1,-.68,10.96,-.04,-.65,13.36,0,-.63,15.23,0,
1.3,7.05,-.04,1.61,10.45,.02,1.82,12.65,.06,1.98,14.35,.07,
3.02,6.25,.1,3.52,8.91,.1,3.85,10.64,.1,4.08,12.03,.07]);
const CHAINS=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
const SEGMENTS=CHAINS.flatMap(c=>[[c[0],c[1]],[c[1],c[2]],[c[2],c[3]]]);
const distance=(p,a,b)=>Math.hypot(p[a*3]-p[b*3],p[a*3+1]-p[b*3+1],p[a*3+2]-p[b*3+2]);
function sub(out,p,a,b){for(let k=0;k<3;k++)out[k]=p[a*3+k]-p[b*3+k];return out;}
function norm(a,fallback=[0,1,0]){const l=Math.hypot(a[0],a[1],a[2]);if(l<1e-7||!Number.isFinite(l)){a.set(fallback);return a;}for(let k=0;k<3;k++)a[k]/=l;return a;}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(o,a,b){o[0]=a[1]*b[2]-a[2]*b[1];o[1]=a[2]*b[0]-a[0]*b[2];o[2]=a[0]*b[1]-a[1]*b[0];return o;}
function frame(out,y,x,sign=1){norm(y);const d=dot(x,y);for(let k=0;k<3;k++)x[k]-=d*y[k];if(Math.hypot(x[0],x[1],x[2])<.05){x[0]=y[1];x[1]=-y[0];x[2]=0;if(Math.hypot(x[0],x[1],x[2])<.05)x.set([1,0,0]);}norm(x,[1,0,0]);out.set(x,0);out.set(y,3);out[6]=(x[1]*y[2]-x[2]*y[1])*sign;out[7]=(x[2]*y[0]-x[0]*y[2])*sign;out[8]=(x[0]*y[1]-x[1]*y[0])*sign;return out;}
function palm(p,out,x,y,sign=1){sub(y,p,9,0);sub(x,p,17,5);return frame(out,y,x,sign);}
function affine(out,o,B,A,sx,sy,sz,from,to){
 for(let col=0;col<3;col++)for(let row=0;row<3;row++)out[o+col*4+row]=B[row]*sx*A[col]+B[3+row]*sy*A[3+col]+B[6+row]*sz*A[6+col];
 out[o+3]=out[o+7]=out[o+11]=0;out[o+15]=1;
 for(let row=0;row<3;row++)out[o+12+row]=to[row]-out[o+row]*from[0]-out[o+4+row]*from[1]-out[o+8+row]*from[2];
}
const BONE_COUNT=20;
const PALM_RAYS=[5,9,13,17];
// Transform a direction by an orthonormal (possibly reflected) anatomical frame.
function reframe(out,v,B,A,o=0){
 const u=v[o]*A[0]+v[o+1]*A[1]+v[o+2]*A[2];
 const w=v[o]*A[3]+v[o+1]*A[4]+v[o+2]*A[5];
 const t=v[o]*A[6]+v[o+1]*A[7]+v[o+2]*A[8];
 for(let k=0;k<3;k++)out[k]=B[k]*u+B[k+3]*w+B[k+6]*t;
 return out;
}
/** Minimal-swing transport. Unlike projecting palm X onto the thumb, it has no
 * 180-degree jump when the thumb crosses the palm's transverse direction.
 * Axial roll cannot be fully observed from landmarks: opposition uses a bounded
 * anatomical estimate; it is not advertised as measured thumb rotation.
 */
function transportedFrame(out,target,B,A,rest,sign,work){
 const [x,y,v,q,q2]=work;
 reframe(x,rest,B,A);reframe(y,rest,B,A,3);
 norm(target,y);norm(y);const c=clamp(dot(y,target),-1,1);
 if(c>-.9999){cross(v,y,target);cross(q,v,x);cross(q2,v,q);
  for(let k=0;k<3;k++)x[k]+=q[k]+q2[k]/(1+c);
 }
 return frame(out,target,x,sign);
}
function rollFrame(B,a){
 const c=Math.cos(a),s=Math.sin(a);
 for(let k=0;k<3;k++){const x=B[k],z=B[k+6];B[k]=c*x-s*z;B[k+6]=s*x+c*z;}
}
export class HandRig{
 constructor(){
  this.matrices=new Float32Array(BONE_COUNT*16);this.x=new Float32Array(3);this.y=new Float32Array(3);
  this.palm=new Float32Array(9);this.tmp=new Float32Array(9);this.restPalm=new Float32Array(9);
  this.frames=[];this.rayFrames=[];this.from=[];this.to=new Float32Array(3);this.axis=new Float32Array(3);
  this.thumbFrames=Array.from({length:3},()=>new Float32Array(9));
  this.work=Array.from({length:5},()=>new Float32Array(3));this.opposition=0;
  palm(REST,this.restPalm,this.x,this.y);
  for(const [a,b] of SEGMENTS){sub(this.y,REST,b,a);this.x.set(this.restPalm.subarray(0,3));
   this.frames.push(frame(new Float32Array(9),this.y,this.x));this.from.push(REST.slice(a*3,a*3+3));}
  for(const b of PALM_RAYS){sub(this.y,REST,b,0);this.x.set(this.restPalm.subarray(0,3));this.rayFrames.push(frame(new Float32Array(9),this.y,this.x));}
  this.restThumbU=dot(this.frames[0].subarray(3,6),this.restPalm.subarray(0,3));
  this.restThumbZ=dot(this.frames[0].subarray(3,6),this.restPalm.subarray(6,9));
  this.update(REST,1);
 }
 update(p,sign=1){
  palm(p,this.palm,this.x,this.y,sign);
  const sy=clamp(distance(p,0,9)/distance(REST,0,9),.01,8);
  const sx=clamp(distance(p,5,17)/distance(REST,5,17),sy*.65,sy*1.45),s=Math.sqrt(sx*sy);
  affine(this.matrices,0,this.palm,this.restPalm,sx,sy,s,REST.subarray(0,3),p.subarray(0,3));
  for(let i=0;i<15;i++){
   const[a,b]=SEGMENTS[i];sub(this.y,p,b,a);
   if(i<3){
    const parent=i?this.thumbFrames[i-1]:this.palm,restParent=i?this.frames[i-1]:this.restPalm;
    transportedFrame(this.tmp,this.y,parent,restParent,this.frames[i],sign,this.work);
    if(i===0){
     const u=dot(this.tmp.subarray(3,6),this.palm.subarray(0,3));
     const z=dot(this.tmp.subarray(3,6),this.palm.subarray(6,9));
     this.opposition=clamp((u-this.restThumbU)/.95,0,1)*clamp((z-this.restThumbZ+.05)/.6,0,1);
     rollFrame(this.tmp,.55*this.opposition);
    }
    this.thumbFrames[i].set(this.tmp);
   }else{this.x.set(this.palm.subarray(0,3));frame(this.tmp,this.y,this.x,sign);}
   const len=clamp(distance(p,a,b)/distance(REST,a,b),s*.35,s*1.9);
   this.to.set(p.subarray(a*3,a*3+3));
   affine(this.matrices,(i+1)*16,this.tmp,this.frames[i],s,len,s,this.from[i],this.to);
  }
  for(let i=0;i<4;i++){
   const b=PALM_RAYS[i];sub(this.y,p,b,0);
   transportedFrame(this.tmp,this.y,this.palm,this.restPalm,this.rayFrames[i],sign,this.work);
   const len=clamp(distance(p,0,b)/distance(REST,0,b),s*.35,s*1.9);
   affine(this.matrices,(16+i)*16,this.tmp,this.rayFrames[i],s,len,s,REST.subarray(0,3),p.subarray(0,3));
  }
  return this.matrices;
 }
}
