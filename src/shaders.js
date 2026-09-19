import {TIERS} from './quality.js';
export const VERTEX_SHADER='attribute vec2 aPos; varying vec2 vUv; void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
const uniforms=(name,count)=>Array.from({length:count},(_,i)=>`uniform vec4 ${name}${i};`).join('\n');
const objects=(count,call)=>Array.from({length:count},(_,i)=>`r=opU(r,${call(i)});`).join('\n');
/** WebGL 1 / GLSL ES 1.00. Derivatives require an explicitly enabled extension. */
export function fragmentShader(tier='medium',precision='highp',capabilities={}) {
  const q=TIERS[tier]??TIERS.medium,portable=precision==='mediump';
  const derivatives=capabilities?.derivatives===true;
  return `${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}
precision ${portable?'mediump':'highp'} float;
varying vec2 vUv;
uniform vec2 uRes,uCube,uGravity,uTarget,uBoost;
uniform float uTime,uCubeY,uCubeFoot,uShake,uTargetY,uTargetType,uHold,uMotion;
uniform vec4 uCubeQ,uPulse;
// Exposure, temperature offset, air density multiplier, decorative effects enabled.
uniform vec4 uLook;
${uniforms('uObs',6)}
${uniforms('uZone',8)}
${uniforms('uRamp',3)}
${uniforms('uRampMeta',3)}
${uniforms('uPlat',4)}
${uniforms('uPlatMeta',4)}
${uniforms('uBump',3)}
#define MAX_DIST 24.0
#define SURF_DIST 0.0010
#define STEPS ${q.steps}
#define SHADOW_STEPS ${q.shadows}
#define AO_STEPS ${q.ao}
#define REFLECTION_STEPS ${q.reflections}
#define FOG_STEPS ${q.fog}
#define OCTAVES ${q.octaves}
#define DETAIL_LEVEL ${portable?Math.min(q.detail,1):q.detail}
#define GI_STEPS ${portable?0:q.gi}
#define REFLECTION_SAMPLES ${portable?1:q.reflectionSamples}
#define PORTAL_LAYERS ${portable?Math.min(q.portalLayers,3):q.portalLayers}
#define HAS_DERIVATIVES ${derivatives?1:0}
const float PI=3.14159265;
float gFootprint=.002;
float effectTime(){return uTime*uLook.w;}
// Bounded arithmetic also works with mediump: no enormous sine/hash products.
float hash(vec2 p){p=mod(p,251.);return fract(17.*fract(p.x*.1031+p.y*.11369)*fract(p.y*.13787+p.x*.09987));}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float detailWeight(float frequency){return 1.-smoothstep(.16,.65,gFootprint*frequency);}
float filteredNoise(vec2 p,float frequency){return mix(.5,noise(p),detailWeight(frequency));}
float fbm(vec2 p,float frequency){
  float v=0.,a=.5;
  for(int i=0;i<OCTAVES;i++){
    float w=detailWeight(frequency);v+=a*mix(.5,noise(p),w);
    p=mat2(.8,-.6,.6,.8)*p*2.03+vec2(3.7,1.9);frequency*=2.03;a*=.5;
  }
  return v;
}
float aaLine(float distanceToLine,float halfWidth){float w=max(gFootprint,.0005);return 1.-smoothstep(halfWidth-w,halfWidth+w,distanceToLine);}
vec3 qrot(vec4 q,vec3 v){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float sdRoundBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float sdRing(vec3 p){vec2 q=vec2(abs(length(p.xz)-.45)-.065,abs(p.y)-.018);return min(max(q.x,q.y),0.)+length(max(q,0.));}
vec2 opU(vec2 a,vec2 b){return b.x<a.x?b:a;}
vec2 obstacle(vec3 p,vec4 o){if(o.z<=.001)return vec2(100,0);return vec2(sdRoundBox(p-vec3(o.x,.245,o.y),vec3(o.z*.5,.245,o.w*.5),.045),8.);}
vec2 zoneObj(vec3 p,vec4 z){if(z.w<.5)return vec2(100,0);return vec2(sdCyl(p-vec3(z.x,.016,z.y),z.z,.012),15.+z.w);}
vec2 bumperObj(vec3 p,vec4 b){if(b.z<.01)return vec2(100,0);float h=max(b.w,.34);return vec2(sdCyl(p-vec3(b.x,h*.5,b.y),b.z,h*.5),22.);}
float rampHeight(vec2 xz,vec4 r,vec4 meta){
  vec2 dir=length(meta.yz)<.00001?vec2(0,-1):normalize(meta.yz);
  float span=max(abs(dir.x)*r.z+abs(dir.y)*r.w,.00001);
  float along=clamp(dot(xz-r.xy,dir)/span+.5,0.,1.);
  return meta.w+along*(meta.x-meta.w);
}
vec2 rampObj(vec3 p,vec4 r,vec4 meta){
  if(r.z<=.001)return vec2(100,0);
  float h=rampHeight(p.xz,r,meta);vec2 d=abs(p.xz-r.xy)-r.zw*.5;
  vec2 dir=length(meta.yz)<.00001?vec2(0,-1):normalize(meta.yz);
  float slope=(meta.x-meta.w)/max(abs(dir.x)*r.z+abs(dir.y)*r.w,.001);
  return vec2(max(max(max(d.x,d.y),(p.y-h)/sqrt(1.+slope*slope)),meta.w-p.y-.025),19.);
}
vec2 platformObj(vec3 p,vec4 r,vec4 meta){if(r.z<=.001)return vec2(100,0);float h=max(meta.x,.03);return vec2(sdRoundBox(p-vec3(r.x,h*.5,r.y),vec3(r.z*.5,h*.5,r.w*.5),.018),19.);}
vec2 mapScene(vec3 p){
  vec2 r=vec2(100,0);
  r=opU(r,vec2(sdBox(p-vec3(0,-.055,0),vec3(3.25,.055,3.25)),1.));
  r=opU(r,vec2(sdRoundBox(p-vec3(0,.005,.78),vec3(2.08,.005,1.27),.004),2.));
  r=opU(r,vec2(sdBox(p-vec3(0,1.58,-3.23),vec3(3.25,1.62,.045)),3.));
  r=opU(r,vec2(sdBox(p-vec3(-3.23,1.58,0),vec3(.045,1.62,3.25)),4.));
  r=opU(r,vec2(sdBox(p-vec3(3.23,1.58,0),vec3(.045,1.62,3.25)),5.));
  r=opU(r,vec2(sdBox(p-vec3(0,3.18,0),vec3(3.25,.045,3.25)),6.));
  r=opU(r,vec2(sdRoundBox(p-vec3(0,.115,-3.155),vec3(3.18,.105,.045),.020),14.));
  r=opU(r,vec2(sdRoundBox(p-vec3(-3.155,.115,0),vec3(.045,.105,3.18),.020),14.));
  r=opU(r,vec2(sdRoundBox(p-vec3(3.155,.115,0),vec3(.045,.105,3.18),.020),14.));
  r=opU(r,vec2(sdRoundBox(p-vec3(0,3.095,-1.65),vec3(1.95,.025,.032),.012),13.));
  r=opU(r,vec2(sdRoundBox(p-vec3(-1.95,3.095,-.40),vec3(.032,.025,1.30),.012),13.));
  r=opU(r,vec2(sdRoundBox(p-vec3(1.95,3.095,-.40),vec3(.032,.025,1.30),.012),13.));
  ${objects(8,i=>`zoneObj(p,uZone${i})`)}
  ${objects(3,i=>`rampObj(p,uRamp${i},uRampMeta${i})`)}
  ${objects(4,i=>`platformObj(p,uPlat${i},uPlatMeta${i})`)}
  if(uTargetType<3.5){vec3 tp=p-vec3(uTarget.x,.035+uTargetY,uTarget.y);float d=uTargetType<2.5?sdCyl(tp,.49,.020):sdRing(tp);r=opU(r,vec2(d,9.+uTargetType));}
  else{
    r=opU(r,vec2(sdRoundBox(p-vec3(uTarget.x,.74+uTargetY,-3.185),vec3(.58,.70,.030),.045),15.));
    r=opU(r,vec2(sdRing(p-vec3(uTarget.x,.03+uTargetY,uTarget.y)),15.));
  }
  ${objects(6,i=>`obstacle(p,uObs${i})`)}
  ${objects(3,i=>`bumperObj(p,uBump${i})`)}
  vec4 iq=vec4(-uCubeQ.xyz,uCubeQ.w);vec3 cp=qrot(iq,p-vec3(uCube.x,.255+uCubeY,uCube.y));
  return opU(r,vec2(sdRoundBox(cp,vec3(.245),.038),7.));
}
vec3 normalAt(vec3 p){vec2 e=vec2(.0022,0.);return normalize(vec3(mapScene(p+e.xyy).x-mapScene(p-e.xyy).x,mapScene(p+e.yxy).x-mapScene(p-e.yxy).x,mapScene(p+e.yyx).x-mapScene(p-e.yyx).x));}

// Shading never changes mapScene: silhouette, physical size and ramp contracts stay intact.
vec3 cubeLocal(vec3 p){return qrot(vec4(-uCubeQ.xyz,uCubeQ.w),p-vec3(uCube.x,.255+uCubeY,uCube.y));}
float cubeEdge(vec3 local){vec3 a=abs(local);float middle=a.x+a.y+a.z-min(a.x,min(a.y,a.z))-max(a.x,max(a.y,a.z));return smoothstep(.185,.232,middle);}
float softShadow(vec3 ro,vec3 rd,float mint,float maxt){
  float visibility=1.,t=mint,previous=.1;
  for(int i=0;i<SHADOW_STEPS;i++){
    vec2 sample=mapScene(ro+rd*t);float h=sample.x;if(h<.0006)return 0.;
    float y=h*h/max(2.*previous,.001),d=sqrt(max(h*h-y*y,0.));
    // The convex room shell cannot occlude an interior light from an interior point.
    // Keep its distance for safe stepping, but not as a fictitious penumbra occluder.
    // Real intersections (including the shell) still return a hard shadow above.
    // Emissive strip surfaces are the rig emitters, not soft-shadow blockers.
    if(sample.y>6.5&&(sample.y<12.5||sample.y>13.5))visibility=min(visibility,14.*d/max(t-y,.015));previous=h;
    t+=clamp(h*.85,.012,.24);if(visibility<.015||t>maxt)break;
  }
  return clamp(visibility,0.,1.);
}
float ao(vec3 p,vec3 n){
  float occ=0.,weight=1.,total=0.;
  for(int i=0;i<AO_STEPS;i++){
    float h=.018+.052*float(i),d=mapScene(p+n*h).x;
    occ+=clamp((h-d)/h,0.,1.)*weight;total+=weight;weight*=.72;
  }
  return clamp(1.-occ/max(total,.001)*.85,0.,1.);
}
vec3 targetColor(){return uTargetType<1.5?vec3(.045,.92,.30):(uTargetType<2.5?vec3(.055,.32,1.):(uTargetType<3.5?vec3(1.,.56,.055):vec3(.025,1.,.40)));}
// Layered virtual depth/parallax, not physical refraction or new collision geometry.
vec3 portalEnergy(vec3 p,vec3 rd){
  if(p.z> -3.09||p.y<uTargetY+.12){float wave=.5+.5*sin(length(p.xz-uTarget)*24.-effectTime()*1.2);return vec3(.025,1.,.40)*(1.1+.22*wave);}
  vec2 uv=(p.xy-vec2(uTarget.x,.74+uTargetY))/vec2(.54,.66);
  float rim=aaLine(abs(max(abs(uv.x),abs(uv.y))-.90)*.54,.025);
  float energy=0.,transmission=1.;
  for(int i=0;i<PORTAL_LAYERS;i++){
    float depth=(float(i)+.5)/float(PORTAL_LAYERS);
    vec2 q=uv+rd.xy/max(abs(rd.z),.25)*depth*.16;
    q+=vec2(noise(q*2.8+vec2(depth*7.,effectTime()*.09))-.5,noise(q*2.8+vec2(8.,depth*5.))-.5)*.09;
    float radius=length(q),angle=atan(q.y+.0001,q.x+.0001);
    float swirl=pow(.5+.5*sin(radius*18.-angle*2.+depth*2.4-effectTime()*.9),3.);
    float density=(.10+1.8*swirl)*(1.-smoothstep(.35,1.05,radius));
    float extinction=exp(-density*2./float(PORTAL_LAYERS));
    energy+=transmission*(1.-extinction);transmission*=extinction;
  }
  return vec3(.025,.85,.34)*(.10+energy*1.85)+vec3(.08,1.3,.66)*rim*.75;
}
// Authored Materials V2. Microstructure belongs to shading, never to mapScene().
// A compact response vector: metal coverage, coat weight, coat roughness, cloth sheen.
#define MAT_ARGS float m,vec3 p,vec3 n,vec3 extent,float seed,inout vec3 albedo,inout float rough,inout float spec,inout vec3 emit,inout vec4 layers,inout vec3 relief
#define MAT_PASS m,q,ng,extent,seed,albedo,rough,spec,emit,layers,relief

// Box-filter a periodic line analytically. Unresolved lines retain their mean coverage.
float stripeIntegral(float x,float duty){return floor(x)*duty+min(fract(x),duty);}
float filteredStripe(float coordinate,float period,float width){
  float duty=clamp(width/period,0.,1.),span=max(gFootprint/period,.002);
  if(span>=1.)return duty;
  float x=coordinate/period+duty*.5;
  return clamp((stripeIntegral(x+span*.5,duty)-stripeIntegral(x-span*.5,duty))/span,0.,1.);
}
// Value and analytic derivatives from the SAME four lattice samples. No extra SDF calls.
vec3 materialNoise(vec2 p,float frequency){
  vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
  vec2 du=30.*f*f*(f-1.)*(f-1.);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  float w=detailWeight(frequency);
  return vec3(.5+(mix(mix(a,b,u.x),mix(c,d,u.x),u.y)-.5)*w,
    du.x*mix(b-a,d-c,u.y)*w,du.y*mix(c-a,d-b,u.x)*w);
}
vec2 faceUV(vec3 p,vec3 n){
  vec3 a=abs(n);
  return a.y>=max(a.x,a.z)?p.xz:(a.x>=a.z?p.zy:p.xy);
}
// Relief.xy is tangent-space slope; z estimates unresolved normal variance.
vec3 microRelief(vec2 uv,vec2 frequency,float strength){
  vec3 r=vec3(0);
#if DETAIL_LEVEL > 0
  float f=max(frequency.x,frequency.y),w=detailWeight(f);
  r=vec3(materialNoise(uv*frequency,f).yz*strength,strength*strength*(1.-w*w));
#if DETAIL_LEVEL >= 2
  f*=2.07;w=detailWeight(f);
  r+=vec3(materialNoise(uv*frequency*2.07+vec2(4.7,1.3),f).yz*strength*.35,strength*strength*.1225*(1.-w*w));
#endif
#if DETAIL_LEVEL >= 3
  f*=1.83;w=detailWeight(f);
  r+=vec3(materialNoise(uv*frequency*3.79+vec2(9.1,5.2),f).yz*strength*.16,strength*strength*.0256*(1.-w*w));
#endif
#endif
  return r;
}
float edgeMask(vec3 p,vec3 extent){
  vec3 d=abs(p)/max(extent,vec3(.03));
  float second=d.x+d.y+d.z-min(d.x,min(d.y,d.z))-max(d.x,max(d.y,d.z));
  return smoothstep(.78,.98,second);
}
// Select the existing uniform slot only AFTER a hit. Slot seeds do not change as it moves.
void materialCoordinates(float m,vec3 p,out vec3 q,out vec3 extent,out float seed){
  q=p;extent=vec3(1);seed=0.;float best=100.,d;
  if(m>6.5&&m<7.5){q=cubeLocal(p);extent=vec3(.245);return;}
  if(m>7.5&&m<8.5){
    if(uObs0.z>.001){d=abs(obstacle(p,uObs0).x);if(d<best){best=d;q=p-vec3(uObs0.x,.245,uObs0.y);extent=vec3(uObs0.z*.5,.245,uObs0.w*.5);seed=1.;}}
    if(uObs1.z>.001){d=abs(obstacle(p,uObs1).x);if(d<best){best=d;q=p-vec3(uObs1.x,.245,uObs1.y);extent=vec3(uObs1.z*.5,.245,uObs1.w*.5);seed=2.;}}
    if(uObs2.z>.001){d=abs(obstacle(p,uObs2).x);if(d<best){best=d;q=p-vec3(uObs2.x,.245,uObs2.y);extent=vec3(uObs2.z*.5,.245,uObs2.w*.5);seed=3.;}}
    if(uObs3.z>.001){d=abs(obstacle(p,uObs3).x);if(d<best){best=d;q=p-vec3(uObs3.x,.245,uObs3.y);extent=vec3(uObs3.z*.5,.245,uObs3.w*.5);seed=4.;}}
    if(uObs4.z>.001){d=abs(obstacle(p,uObs4).x);if(d<best){best=d;q=p-vec3(uObs4.x,.245,uObs4.y);extent=vec3(uObs4.z*.5,.245,uObs4.w*.5);seed=5.;}}
    if(uObs5.z>.001){d=abs(obstacle(p,uObs5).x);if(d<best){best=d;q=p-vec3(uObs5.x,.245,uObs5.y);extent=vec3(uObs5.z*.5,.245,uObs5.w*.5);seed=6.;}}
  }else if(m>18.5&&m<19.5){
    if(uPlat0.z>.001){d=abs(platformObj(p,uPlat0,uPlatMeta0).x);if(d<best){best=d;q=p-vec3(uPlat0.x,uPlatMeta0.x*.5,uPlat0.y);extent=vec3(uPlat0.z*.5,uPlatMeta0.x*.5,uPlat0.w*.5);seed=11.;}}
    if(uPlat1.z>.001){d=abs(platformObj(p,uPlat1,uPlatMeta1).x);if(d<best){best=d;q=p-vec3(uPlat1.x,uPlatMeta1.x*.5,uPlat1.y);extent=vec3(uPlat1.z*.5,uPlatMeta1.x*.5,uPlat1.w*.5);seed=12.;}}
    if(uPlat2.z>.001){d=abs(platformObj(p,uPlat2,uPlatMeta2).x);if(d<best){best=d;q=p-vec3(uPlat2.x,uPlatMeta2.x*.5,uPlat2.y);extent=vec3(uPlat2.z*.5,uPlatMeta2.x*.5,uPlat2.w*.5);seed=13.;}}
    if(uPlat3.z>.001){d=abs(platformObj(p,uPlat3,uPlatMeta3).x);if(d<best){best=d;q=p-vec3(uPlat3.x,uPlatMeta3.x*.5,uPlat3.y);extent=vec3(uPlat3.z*.5,uPlatMeta3.x*.5,uPlat3.w*.5);seed=14.;}}
    if(uRamp0.z>.001){d=abs(rampObj(p,uRamp0,uRampMeta0).x);if(d<best){best=d;q=p-vec3(uRamp0.x,(uRampMeta0.x+uRampMeta0.w)*.5,uRamp0.y);extent=vec3(uRamp0.z*.5,(uRampMeta0.x-uRampMeta0.w)*.5,uRamp0.w*.5);seed=21.;}}
    if(uRamp1.z>.001){d=abs(rampObj(p,uRamp1,uRampMeta1).x);if(d<best){best=d;q=p-vec3(uRamp1.x,(uRampMeta1.x+uRampMeta1.w)*.5,uRamp1.y);extent=vec3(uRamp1.z*.5,(uRampMeta1.x-uRampMeta1.w)*.5,uRamp1.w*.5);seed=22.;}}
    if(uRamp2.z>.001){d=abs(rampObj(p,uRamp2,uRampMeta2).x);if(d<best){best=d;q=p-vec3(uRamp2.x,(uRampMeta2.x+uRampMeta2.w)*.5,uRamp2.y);extent=vec3(uRamp2.z*.5,(uRampMeta2.x-uRampMeta2.w)*.5,uRamp2.w*.5);seed=23.;}}
  }else if((m>15.5&&m<18.5)||(m>19.5&&m<20.5)){
    if(uZone0.w>.5&&abs(15.+uZone0.w-m)<.25){d=abs(zoneObj(p,uZone0).x);if(d<best){best=d;q=p-vec3(uZone0.x,.016,uZone0.y);extent=vec3(uZone0.z,.012,uZone0.z);seed=31.;}}
    if(uZone1.w>.5&&abs(15.+uZone1.w-m)<.25){d=abs(zoneObj(p,uZone1).x);if(d<best){best=d;q=p-vec3(uZone1.x,.016,uZone1.y);extent=vec3(uZone1.z,.012,uZone1.z);seed=32.;}}
    if(uZone2.w>.5&&abs(15.+uZone2.w-m)<.25){d=abs(zoneObj(p,uZone2).x);if(d<best){best=d;q=p-vec3(uZone2.x,.016,uZone2.y);extent=vec3(uZone2.z,.012,uZone2.z);seed=33.;}}
    if(uZone3.w>.5&&abs(15.+uZone3.w-m)<.25){d=abs(zoneObj(p,uZone3).x);if(d<best){best=d;q=p-vec3(uZone3.x,.016,uZone3.y);extent=vec3(uZone3.z,.012,uZone3.z);seed=34.;}}
    if(uZone4.w>.5&&abs(15.+uZone4.w-m)<.25){d=abs(zoneObj(p,uZone4).x);if(d<best){best=d;q=p-vec3(uZone4.x,.016,uZone4.y);extent=vec3(uZone4.z,.012,uZone4.z);seed=35.;}}
    if(uZone5.w>.5&&abs(15.+uZone5.w-m)<.25){d=abs(zoneObj(p,uZone5).x);if(d<best){best=d;q=p-vec3(uZone5.x,.016,uZone5.y);extent=vec3(uZone5.z,.012,uZone5.z);seed=36.;}}
    if(uZone6.w>.5&&abs(15.+uZone6.w-m)<.25){d=abs(zoneObj(p,uZone6).x);if(d<best){best=d;q=p-vec3(uZone6.x,.016,uZone6.y);extent=vec3(uZone6.z,.012,uZone6.z);seed=37.;}}
    if(uZone7.w>.5&&abs(15.+uZone7.w-m)<.25){d=abs(zoneObj(p,uZone7).x);if(d<best){best=d;q=p-vec3(uZone7.x,.016,uZone7.y);extent=vec3(uZone7.z,.012,uZone7.z);seed=38.;}}
  }else if(m>21.5){
    if(uBump0.z>.01){d=abs(bumperObj(p,uBump0).x);if(d<best){best=d;float h=max(uBump0.w,.34);q=p-vec3(uBump0.x,h*.5,uBump0.y);extent=vec3(uBump0.z,h*.5,uBump0.z);seed=41.;}}
    if(uBump1.z>.01){d=abs(bumperObj(p,uBump1).x);if(d<best){best=d;float h=max(uBump1.w,.34);q=p-vec3(uBump1.x,h*.5,uBump1.y);extent=vec3(uBump1.z,h*.5,uBump1.z);seed=42.;}}
    if(uBump2.z>.01){d=abs(bumperObj(p,uBump2).x);if(d<best){best=d;float h=max(uBump2.w,.34);q=p-vec3(uBump2.x,h*.5,uBump2.y);extent=vec3(uBump2.z,h*.5,uBump2.z);seed=43.;}}
  }else if(m>9.5&&m<12.5){q=p-vec3(uTarget.x,.035+uTargetY,uTarget.y);extent=vec3(.49,.02,.49);}
  else if(m>14.5&&m<15.5){
    if(p.z< -3.09){q=p-vec3(uTarget.x,.74+uTargetY,-3.185);extent=vec3(.58,.70,.03);}
    else{q=p-vec3(uTarget.x,.03+uTargetY,uTarget.y);extent=vec3(.515,.018,.515);}
  }
}

// Wood V3: a lightweight virtual log cut, not a scan or a subsurface-fibre BSDF.
// All coordinates are attached to the timber; frequency is cycles per world unit.
float woodRingFilter(float phase,float frequency,float duty){
  float span=max(gFootprint*frequency,.002);
  if(span>=1.)return duty;
  float x=phase+duty*.5;
  return clamp((stripeIntegral(x+span*.5,duty)-stripeIntegral(x-span*.5,duty))/span,0.,1.);
}
void woodBoardCoordinates(vec2 uv,out vec2 local,out vec2 boardId){
  float row=floor((uv.x+3.25)/.54),offset=hash(vec2(row,2.7));
  float along=(uv.y+3.25)/1.8+offset;
  boardId=vec2(row,floor(along));
  local=vec2(fract((uv.x+3.25)/.54)*.54-.27,(fract(along)-.5)*1.8);
  // End-for-end orientation and a log offset vary at REAL board joints only.
  local.y*=mix(-1.,1.,step(.5,hash(boardId+vec2(7.,3.))));
}
vec4 woodAnatomy(vec2 uv,float identity,out vec2 slope){
  vec2 offset=vec2(identity*13.7,identity*5.3);
  vec3 warp=materialNoise(uv*vec2(2.2,.72)+offset,2.2);
  float crossGrain=uv.x+(warp.x-.5)*.045+(identity-.5)*.36;
  float taper=.085+.16*identity+.13*(uv.y+.55-identity)*(uv.y+.55-identity);
  float radius=sqrt(crossGrain*crossGrain+taper*taper);
  float frequency=24.+identity*12.;
  float phase=radius*frequency+identity*7.+(warp.x-.5)*.35;
  float latewood=woodRingFilter(phase,frequency*1.6,.19);
  // Unequal early/late growth plus a slow cambium field, rather than parallel sine stripes.
  float broad=materialNoise(uv*vec2(3.1,.85)+offset+4.7,3.1).x-.5;
  float fibre=0.,pores=0.;slope=vec2(0);
#if DETAIL_LEVEL > 0
  vec3 fibres=materialNoise(vec2(crossGrain*83.,uv.y*5.5)+offset,88.);
  fibre=fibres.x-.5;slope=fibres.yz*vec2(.013,.004);
#if DETAIL_LEVEL >= 2
  vec3 poreNoise=materialNoise(vec2(crossGrain*137.,uv.y*18.)+offset+2.3,145.);
  // Sparse elongated vessel marks, preferentially near the darker growth bands.
  float resolved=detailWeight(145.);
  pores=smoothstep(.64,.87,poreNoise.x)*(.30+.70*latewood)*resolved;
  slope-=poreNoise.yz*vec2(.010,.003)*pores;
#endif
#endif
  return vec4(latewood,fibre,pores,broad);
}
void woodMaterial(MAT_ARGS){
  vec2 uv=faceUV(p,n),local,id;woodBoardCoordinates(uv,local,id);
  float identity=hash(id+vec2(11.,4.));
  vec2 slope;vec4 tissue=woodAnatomy(local,identity,slope);
  float row=id.x,offset=hash(vec2(row,2.7));
  float joint=max(filteredStripe(uv.x+3.25,.54,.005),filteredStripe(uv.y+3.25+offset*1.8,1.8,.004));
  // Keep a warm, dry satin finish. Per-board hue is restrained, not checkerboard parquet.
  vec3 pigment=mix(vec3(.57,.383,.213),vec3(.66,.456,.267),identity);
  albedo=pigment*(1.-(tissue.x-.19)*.26+tissue.y*.085+tissue.w*.16-tissue.z*.20-joint*.25);
  rough=.545+(identity-.5)*.034+tissue.x*.035-tissue.y*.022+tissue.z*.085+joint*.08;
  spec=.20;
  relief=microRelief(local,vec2(27.,3.2),.017);relief.xy+=slope;
  relief.y*=mix(-1.,1.,step(.5,hash(id+vec2(7.,3.))));
#if DETAIL_LEVEL >= 2
  layers.y=.09*(1.-joint*.8);layers.z=.38+tissue.x*.025;
#endif
}
void carpetMaterial(MAT_ARGS){
  vec2 uv=p.xz;
  float binding=max(smoothstep(2.00,2.075,abs(p.x)),smoothstep(1.19,1.265,abs(p.z-.78)));
  float nap=materialNoise(uv*vec2(5.,8.),8.).x-.5;
  albedo=vec3(.245,.262,.269)*(1.+nap*.055-binding*.16);
#if DETAIL_LEVEL > 0
  float yarn=sin(uv.x*440.)*sin(uv.y*360.)*detailWeight(70.);
  albedo*=1.+yarn*.065;
#endif
#if DETAIL_LEVEL >= 2
  float stitch=max(filteredStripe(p.x,.072,.012)*smoothstep(1.17,1.21,abs(p.z-.78)),filteredStripe(p.z,.072,.012)*smoothstep(1.98,2.02,abs(p.x)));
  albedo*=1.+stitch*binding*.045;
#endif
  rough=.96;spec=.07;layers.w=.10;
  relief=microRelief(uv,vec2(36.,48.),.038);
}
void wallMaterial(MAT_ARGS){
  vec2 uv=faceUV(p,n);
  float mineral=materialNoise(uv*.85,.85).x-.5;
  float panel=filteredStripe(uv.x+.8,1.6,.003);
  if(m<3.5)albedo=vec3(.67,.45,.22);
  else if(m<4.5)albedo=vec3(.35,.49,.26);
  else if(m<5.5)albedo=vec3(.74,.74,.70);
  else albedo=vec3(.58,.61,.60);
  albedo*=1.+mineral*.028-panel*.018;
  rough=.86+mineral*.035;spec=.18;
#if DETAIL_LEVEL >= 2
  float pore=materialNoise(uv*63.,63.).x-.5;
  rough+=pore*.025;albedo*=1.+pore*.011;
#endif
  relief=microRelief(uv,vec2(21.,26.),.016);
}
void cubeMaterial(MAT_ARGS){
  vec2 uv=faceUV(p,n);float edge=cubeEdge(p),paint=materialNoise(uv*17.+vec2(2.1,5.3),17.).x-.5;
  float abrasion=0.,scratches=0.;
#if DETAIL_LEVEL > 0
  abrasion=edge*.025;
#endif
#if DETAIL_LEVEL >= 2
  float islands=materialNoise(uv*31.+vec2(7.4,2.2),31.).x;
  abrasion=edge*smoothstep(.68,.91,islands)*.18*detailWeight(31.);
  scratches=filteredStripe(uv.x+uv.y*.18,.022,.00065)*smoothstep(.52,.80,materialNoise(uv*vec2(12.,37.),37.).x)*detailWeight(45.);
#endif
  albedo=vec3(.665,.029,.018)*(1.+paint*.055);
  albedo=mix(albedo,vec3(.37,.385,.40),abrasion);
  rough=.31+paint*.04+scratches*.13+abrasion*.12;spec=.28;
  layers.x=abrasion*.90;
#if DETAIL_LEVEL > 0
  layers.y=.30*(1.-abrasion);layers.z=.23;
#endif
#if DETAIL_LEVEL >= 2
  layers.y=.42*(1.-abrasion);layers.z=.205+scratches*.14;
#endif
  relief=microRelief(uv,vec2(38.,38.),.026);
  // Sparse grooves break the base coat; they do not draw bright animated white lines.
  relief.x+=scratches*.009;
}
void obstacleMaterial(MAT_ARGS){
  vec2 uv=faceUV(p,n);float edge=edgeMask(p,extent);
  float powder=materialNoise(uv*vec2(12.,19.)+seed,19.).x-.5;
  float wear=0.;
#if DETAIL_LEVEL >= 2
  wear=edge*smoothstep(.48,.83,materialNoise(uv*23.+seed,23.).x)*.40;
#endif
  albedo=mix(vec3(.255,.297,.326)*(1.+powder*.03),vec3(.44,.46,.48),wear);
  rough=.46+powder*.055-wear*.10;spec=.29;layers.x=wear*.88;
  relief=microRelief(uv,vec2(7.,49.),.021);
#if DETAIL_LEVEL >= 2
  layers.y=.12*(1.-wear);layers.z=.32;
#endif
}
void greenGoalMaterial(MAT_ARGS){
  float rim=filteredStripe(length(p.xz)-.425,2.,.035);
  float symbol=filteredStripe(length(p.xz)-.29,2.,.020);
  float top=smoothstep(.25,.75,n.y);
  albedo=mix(vec3(.085,.20,.145),vec3(.06,.75,.29),top);
  emit=vec3(.035,.95,.25)*top*(.42+symbol*.35+rim*.16);rough=.37;spec=.25;
  relief=microRelief(p.xz,vec2(18.,18.),.006);
}
void blueGoalMaterial(MAT_ARGS){
  float crossMark=max(filteredStripe(p.x,2.,.035),filteredStripe(p.z,2.,.035));
  float top=smoothstep(.25,.75,n.y);
  albedo=mix(vec3(.10,.16,.235),vec3(.12,.40,.89),top);
  emit=vec3(.045,.28,1.)*top*(.44+crossMark*.34);rough=.35;spec=.25;
  relief=microRelief(p.xz,vec2(18.,18.),.006);
}
void ringMaterial(MAT_ARGS){
  float angle=atan(p.z+.00001,p.x+.00001)/6.283185+.5;
  float charged=1.-smoothstep(uHold-.006,uHold+.006,angle);
  float ticks=filteredStripe(angle*2.8274,2.8274/24.,.015);
  albedo=vec3(.88,.63,.12);rough=.39;spec=.25;
  emit=vec3(1.,.53,.035)*(.45+charged*.77)*(1.-ticks*.14);
}
void lightMaterial(MAT_ARGS){albedo=vec3(.95,.88,.73);emit=vec3(1.,.84,.63)*3.2;rough=.30;spec=.23;}
void trimMaterial(MAT_ARGS){
  albedo=vec3(.38,.30,.23);rough=.45;spec=.24;layers.x=.75;
  relief=microRelief(faceUV(p,n),vec2(4.,42.),.017);
}
void portalMaterial(MAT_ARGS){
  float frame=abs(n.y)>.5?0.:smoothstep(.83,.94,max(abs(p.x)/.58,abs(p.y)/.70));
  albedo=mix(vec3(.025,.11,.065),vec3(.13,.25,.19),frame);
  rough=mix(.29,.43,frame);spec=.28;layers.x=frame*.65;
  emit=vec3(.025,.9,.37); // Directional energy is evaluated later, at the actual view ray.
}
void iceMaterial(MAT_ARGS){
  vec2 uv=p.xz;float cloud=materialNoise(uv*vec2(2.4,3.1)+seed,3.1).x-.5;
  albedo=vec3(.27,.65,.85)*(1.+cloud*.06);rough=.235+cloud*.025;spec=.21;
#if DETAIL_LEVEL >= 2
  float stress=filteredStripe(uv.x+sin(uv.y*4.1)*.06,.37,.003)*detailWeight(5.);
  albedo=mix(albedo,vec3(.52,.77,.88),stress*.14);rough+=stress*.04;
#endif
  emit=vec3(.025,.22,.52)*.11;
  relief=microRelief(uv,vec2(11.,15.),.007);
}
void brakeMaterial(MAT_ARGS){
  vec2 uv=p.xz;float cell=filteredStripe(uv.x,.095,.014)*filteredStripe(uv.y,.095,.014);
  albedo=vec3(.54,.18,.70)*(1.-cell*.16);rough=.93;spec=.12;
  emit=vec3(.50,.06,.82)*.085;
  relief=microRelief(uv,vec2(26.,26.),.032);
}
void boostMaterial(MAT_ARGS){
  vec2 dir=length(uBoost)<.001?vec2(1,0):normalize(uBoost);
  float side=dot(p.xz,vec2(-dir.y,dir.x)),forward=dot(p.xz,dir);
  float chevron=filteredStripe(forward-effectTime()*.21+abs(fract(side*2.)-.5)/3.,1./3.,.045);
  albedo=vec3(.94,.45,.08);rough=.48;spec=.22;
  emit=vec3(1.,.25,.02)*(.10+chevron*.48);
  relief=microRelief(p.xz,vec2(19.,19.),.012);
}
void platformMaterial(MAT_ARGS){
  // Grain follows the longest timber axis, and remains object-local on transports.
  bool alongZ=extent.z>=extent.x;
  vec2 uv=faceUV(p,n);if(abs(n.y)>.5&&!alongZ)uv=uv.yx;
  float identity=hash(vec2(seed,3.2));vec2 slope;
  vec4 tissue=woodAnatomy(uv+vec2(identity*.21,0.),identity,slope);
  float side=1.-smoothstep(.4,.9,abs(n.y));
  float endGrain=side*(alongZ?abs(n.z):abs(n.x));
  vec2 endUV=alongZ?p.xy:p.zy;
  float cut=woodRingFilter(length(endUV*vec2(1.,1.8))*25.+identity*3.,45.,.24);
  float growth=mix(tissue.x,cut,endGrain);
  float lamination=filteredStripe(p.y+extent.y,.09,.004)*side;
  albedo=mix(vec3(.55,.355,.188),vec3(.63,.418,.236),identity)*
    (1.-(growth-.19)*.23+tissue.y*.07+tissue.w*.12-tissue.z*.16-lamination*.10);
  rough=.585+growth*.025+tissue.z*.055+endGrain*.035;spec=.20;
  relief=microRelief(uv,vec2(25.,4.),.018);relief.xy+=slope*(1.-endGrain);
  if(abs(n.y)>.5&&!alongZ)relief.xy=relief.yx;
}
void jumpMaterial(MAT_ARGS){
  float ring=filteredStripe(length(p.xz)-effectTime()*.065,.145,.013);
  float hub=1.-smoothstep(.04,.17,length(p.xz));
  albedo=vec3(.12,.77,.87);rough=.34;spec=.27;
  emit=vec3(.025,.66,.95)*(.35+ring*.30+hub*.14);
  relief=microRelief(p.xz,vec2(19.,19.),.008);
}
void bumperMaterial(MAT_ARGS){
  float band=1.-smoothstep(.035,.06,abs(p.y-extent.y*.55));
  float collar=smoothstep(extent.y*.67,extent.y*.9,abs(p.y));
  albedo=mix(vec3(.76,.055,.028),vec3(.13,.11,.10),collar*.65);
  rough=mix(.42,.88,collar);spec=.23;
  emit=vec3(.95,.035,.012)*(.06+band*.20);
  relief=microRelief(faceUV(p,n),vec2(29.,38.),.020);
}
void surfaceMaterial(float m,vec3 p,vec3 geometric,out vec3 albedo,out float rough,out float spec,out vec3 emit,out vec4 layers,out vec3 normal){
  vec3 q,extent,relief=vec3(0),ng=geometric;float seed;
  materialCoordinates(m,p,q,extent,seed);
  bool cube=m>6.5&&m<7.5;
  if(cube)ng=qrot(vec4(-uCubeQ.xyz,uCubeQ.w),geometric);
  albedo=vec3(.65);rough=.65;spec=.20;emit=vec3(0);layers=vec4(0,0,.3,0);
  if(m<1.5)woodMaterial(MAT_PASS);
  else if(m<2.5)carpetMaterial(MAT_PASS);
  else if(m<6.5)wallMaterial(MAT_PASS);
  else if(m<7.5)cubeMaterial(MAT_PASS);
  else if(m<8.5)obstacleMaterial(MAT_PASS);
  else if(m<10.5)greenGoalMaterial(MAT_PASS);
  else if(m<11.5)blueGoalMaterial(MAT_PASS);
  else if(m<12.5)ringMaterial(MAT_PASS);
  else if(m<13.5)lightMaterial(MAT_PASS);
  else if(m<14.5)trimMaterial(MAT_PASS);
  else if(m<15.5)portalMaterial(MAT_PASS);
  else if(m<16.5)iceMaterial(MAT_PASS);
  else if(m<17.5)brakeMaterial(MAT_PASS);
  else if(m<18.5)boostMaterial(MAT_PASS);
  else if(m<19.5)platformMaterial(MAT_PASS);
  else if(m<20.5)jumpMaterial(MAT_PASS);
  else bumperMaterial(MAT_PASS);
  vec3 a=abs(ng),t,b;
  if(a.y>=max(a.x,a.z)){t=vec3(1,0,0);b=vec3(0,0,1);}
  else if(a.x>=a.z){t=vec3(0,0,1);b=vec3(0,1,0);}
  else{t=vec3(1,0,0);b=vec3(0,1,0);}
  vec3 slope=t*relief.x+b*relief.y;slope-=ng*dot(ng,slope);
  normal=normalize(ng-slope);if(cube)normal=qrot(uCubeQ,normal);
  // Preserve unresolved normal energy as roughness instead of sparkling detail.
  rough=clamp(sqrt(rough*rough+relief.z*2.),.18,1.);
  albedo=pow(clamp(albedo,vec3(.001),vec3(.95)),vec3(2.2));
}
// Stable compatibility surface for fixture callers and old integrations.
void material(float m,vec3 p,vec3 n,out vec3 albedo,out float rough,out float spec,out vec3 emit){
  vec4 layers;vec3 normal;surfaceMaterial(m,p,n,albedo,rough,spec,emit,layers,normal);
}
vec3 detailNormal(float m,vec3 p,vec3 geometric){
  vec3 albedo,emit,normal;float rough,spec;vec4 layers;
  surfaceMaterial(m,p,geometric,albedo,rough,spec,emit,layers,normal);return normal;
}
#undef MAT_ARGS
#undef MAT_PASS
vec3 fresnelSchlick(vec3 f0,float cosine){float x=clamp(1.-cosine,0.,1.),x2=x*x;return f0+(1.-f0)*x2*x2*x;}
float distributionGGX(float nh,float rough){float a=max(rough*rough,.045),a2=a*a,d=nh*nh*(a2-1.)+1.;return a2/max(PI*d*d,.00005);}
float smithG1(float cosine,float rough){float k=(rough+1.)*(rough+1.)*.125;return cosine/max(cosine*(1.-k)+k,.001);}
vec3 roomBounce(vec3 p,vec3 n){
  vec3 hemi=mix(vec3(.055,.066,.080),vec3(.14,.16,.18),n.y*.5+.5);
  float floorNear=exp(-max(p.y,0.)*.65),side=1.-abs(n.y);
  hemi+=vec3(.095,.063,.032)*floorNear*(max(-n.y,0.)+side*.45);
  hemi+=vec3(.022,.049,.014)*exp(-max(p.x+3.18,0.)*.6)*max(-n.x,0.);
  hemi+=vec3(.075,.073,.063)*exp(-max(3.18-p.x,0.)*.6)*max(n.x,0.);
  hemi+=vec3(.048,.031,.012)*exp(-max(p.z+3.18,0.)*.6)*max(-n.z,0.);
  vec3 cubeDelta=vec3(uCube.x,.26+uCubeY,uCube.y)-p;
  hemi+=vec3(.032,.0015,.0008)*max(dot(n,normalize(cubeDelta+vec3(.0001))),0.)/(1.+12.*dot(cubeDelta,cubeDelta));
  return hemi;
}
vec3 direct(vec3 p,vec3 n,vec3 v,vec3 lp,vec3 radiance,float power,float rough,vec3 f0,vec3 albedo,float metallic,float visibility,float coat,float coatRough,vec3 coatNormal){
  vec3 l=lp-p;float d2=dot(l,l);l*=inversesqrt(max(d2,.001));
  float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001);vec3 h=normalize(l+v);
  float nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
  // Finite emitter width broadens highlights instead of producing subpixel fireflies.
  float r=sqrt(rough*rough+.008/max(d2,.1));
  vec3 f=fresnelSchlick(f0,vh),diffuse=(1.-f)*(1.-metallic)*albedo/PI;
  vec3 specular=distributionGGX(nh,r)*smithG1(nl,r)*smithG1(nv,r)*f/max(4.*nl*nv,.001);
#if DETAIL_LEVEL > 0
  float cnl=max(dot(coatNormal,l),0.),cnv=max(dot(coatNormal,v),.001),cnh=max(dot(coatNormal,h),0.);
  float cf=fresnelSchlick(vec3(.04),vh).x;
  float cr=sqrt(coatRough*coatRough+.008/max(d2,.1));
  float coating=distributionGGX(cnh,cr)*smithG1(cnl,cr)*smithG1(cnv,cr)*cf/max(4.*cnl*cnv,.001);
  float fv=fresnelSchlick(vec3(.04),cnv).x,fl=fresnelSchlick(vec3(.04),cnl).x;
  float transmission=(1.-coat*fv)*(1.-coat*fl);
  diffuse*=transmission;specular=specular*transmission+coat*coating*cnl/max(nl,.001);
#endif
  return (diffuse+specular)*radiance*power*nl*visibility/(1.+.11*d2);
}
vec3 environment(vec3 rd,float rough){
  vec3 c=mix(vec3(.035,.043,.058),vec3(.16,.18,.20),rd.y*.5+.5);
  c+=vec3(.22,.16,.09)*pow(max(dot(rd,normalize(vec3(.1,1.,-.5))),0.),mix(90.,4.,rough));
  return c;
}
// Secondary hits use family mean pigments, not the expensive primary material graph.
vec3 quickMat(float m,vec3 p){
  vec3 a=vec3(.6),e=vec3(0);
  if(m<1.5)a=vec3(.61,.425,.245);
  else if(m<2.5)a=vec3(.245,.262,.269);
  else if(m<3.5)a=vec3(.67,.45,.22);
  else if(m<4.5)a=vec3(.35,.49,.26);
  else if(m<5.5)a=vec3(.74,.74,.70);
  else if(m<6.5)a=vec3(.58,.61,.60);
  else if(m<7.5)a=vec3(.665,.029,.018);
  else if(m<8.5)a=vec3(.255,.297,.326);
  else if(m<10.5){a=vec3(.06,.75,.29);e=vec3(.035,.95,.25)*.50;}
  else if(m<11.5){a=vec3(.12,.40,.89);e=vec3(.045,.28,1.)*.52;}
  else if(m<12.5){a=vec3(.88,.63,.12);e=vec3(1.,.53,.035)*(.45+uHold*.77);}
  else if(m<13.5){a=vec3(.95,.88,.73);e=vec3(1.,.84,.63)*3.2;}
  else if(m<14.5)a=vec3(.38,.30,.23);
  else if(m<15.5){a=vec3(.025,.11,.065);e=vec3(.025,.9,.37)*.8;}
  else if(m<16.5){a=vec3(.27,.65,.85);e=vec3(.025,.22,.52)*.11;}
  else if(m<17.5){a=vec3(.54,.18,.70);e=vec3(.50,.06,.82)*.085;}
  else if(m<18.5){a=vec3(.94,.45,.08);e=vec3(1.,.25,.02)*.17;}
  else if(m<19.5)a=vec3(.57,.372,.197);
  else if(m<20.5){a=vec3(.12,.77,.87);e=vec3(.025,.66,.95)*.41;}
  else{a=vec3(.76,.055,.028);e=vec3(.95,.035,.012)*.09;}
  return pow(a,vec3(2.2))*.55+e;
}
// mediump hit tolerance tracks representable ray distance, preventing stalled steps and holes.
vec2 march(vec3 ro,vec3 rd){float t=0.;for(int i=0;i<STEPS;i++){vec2 h=mapScene(ro+rd*t);if(h.x<${portable?'max(SURF_DIST,t*.0012)':'SURF_DIST'})return vec2(t,h.y);if(t>MAX_DIST)break;t+=h.x*.80;}return vec2(t,0.);}
vec3 reflectionProbe(vec3 ro,vec3 rd,float rough){
  float t=.025;vec3 fallback=environment(rd,rough);
  for(int i=0;i<REFLECTION_STEPS;i++){
    vec3 p=ro+rd*t;vec2 h=mapScene(p);
    if(h.x<.002+t*rough*.0015){
      float saved=gFootprint;gFootprint=max(saved,rough*rough*t*.05);
      vec3 color=quickMat(h.y,p);gFootprint=saved;
      // A thin HDR strip cannot be resolved by one/two rays through a rough cone.
      // Replace that discontinuous hit with the broad analytical environment lobe.
      if(h.y>12.5&&h.y<13.5)color=mix(color,fallback,smoothstep(.16,.40,rough));
      return mix(fallback,color,exp(-t*(.055+rough*rough*.30))*(1.-rough*.40));
    }
    t+=clamp(h.x*.85,.016,.40);if(t>12.)break;
  }
  return fallback;
}
vec3 roughReflection(vec3 p,vec3 geometric,vec3 rd,vec3 n,float rough){
  vec3 r=reflect(rd,n),sum=vec3(0);
  vec3 tangent=normalize(cross(r,abs(r.y)<.95?vec3(0,1,0):vec3(1,0,0)));
  for(int i=0;i<REFLECTION_SAMPLES;i++){
    float offset=REFLECTION_SAMPLES==1?0.:(float(i)*2.-1.);
    vec3 direction=normalize(r+tangent*offset*rough*rough*.065);
    // Never launch below the geometric surface, even after a bump perturbation.
    direction=normalize(direction+geometric*max(.025-dot(direction,geometric),0.));
    sum+=reflectionProbe(p+geometric*.014,direction,rough);
  }
  return sum/float(REFLECTION_SAMPLES);
}
vec3 shortBounce(vec3 p,vec3 n){
  vec3 result=vec3(0);
#if GI_STEPS > 0
  vec3 direction=normalize(n+vec3(.42,.36,-.28));float t=.055;
  for(int i=0;i<GI_STEPS;i++){
    vec3 q=p+n*.015+direction*t;vec2 h=mapScene(q);
    if(h.x<.025){result=quickMat(h.y,q)*.075*exp(-t*2.);break;}
    t+=clamp(h.x,.035,.25);if(t>.8)break;
  }
#endif
  return result;
}
vec3 lightSpill(vec3 p,vec3 n,vec3 source,vec3 color,float power){vec3 d=source-p;float d2=dot(d,d);return color*power*max(dot(n,normalize(d+vec3(.0001))),0.)/(1.+9.*d2);}
vec3 zoneSpill(vec3 p,vec3 n,vec4 z){
  if(z.w<.5)return vec3(0);
  vec3 color=z.w<1.5?vec3(.025,.27,.58):(z.w<2.5?vec3(.42,.045,.64):(z.w<3.5?vec3(.9,.20,.012):vec3(.025,.58,.8)));
  return lightSpill(p,n,vec3(z.x,.12,z.y),color,.25);
}
vec3 shade(vec3 p,vec3 geometric,float m,vec3 rd){
  vec3 n,albedo,emit;float rough,spec;vec4 layers;surfaceMaterial(m,p,geometric,albedo,rough,spec,emit,layers,n);
  vec3 v=-rd;float metallic=layers.x,amb=ao(p,geometric),nv=max(dot(n,v),0.);
  vec3 f0=mix(vec3(clamp(.024+spec*.075,.025,.065)),albedo,metallic),f=fresnelSchlick(f0,nv);
  float coat=layers.y,coatRough=layers.z;
  vec3 key=vec3(1.,.86,.68)+vec3(uLook.y,0.,-uLook.y);
  vec3 lp=vec3(0,3.045,-.70),ld=lp-p;float visibility=softShadow(p+geometric*.009,normalize(ld),.014,length(ld)-.04);
  vec3 col=albedo*(1.-metallic)*(1.-f)*roomBounce(p,geometric)*amb;
  col+=direct(p,n,v,lp,key,5.7,rough,f0,albedo,metallic,visibility,coat,coatRough,geometric);
  col+=direct(p,n,v,vec3(-1.80,2.60,3.0),vec3(.72,.82,1.),2.2,rough,f0,albedo,metallic,.85,coat,coatRough,geometric);
  vec3 rim=vec3(1.92,3.04,-1.15),rl=rim-p;float rimShadow=1.;
#if DETAIL_LEVEL >= 2
  rimShadow=softShadow(p+geometric*.009,normalize(rl),.014,length(rl)-.04);
#endif
  col+=direct(p,n,v,rim,vec3(1.,.86,.69),1.7,rough,f0,albedo,metallic,rimShadow,coat,coatRough,geometric);
  col+=albedo*layers.w*pow(1.-nv,4.)*roomBounce(p,geometric)*amb;
  col*=.88+.12*amb;
  if(rough<.78&&(m<1.5||(m>6.5&&m<8.5)||(m>13.5&&m<16.5)||(m>18.5&&m<19.5))){
    float cf=.04+.96*pow(1.-max(dot(geometric,v),0.),5.);
    // One shared reflection cone is an approximation; direct lobes remain independent.
    vec3 response=f*(1.-coat*cf)*(1.-coat*cf)+vec3(coat*cf);
    col+=roughReflection(p,geometric,rd,n,mix(rough,coatRough,coat*.35))*response*(1.-rough*.55)*(.6+.4*amb);
  }
#if GI_STEPS > 0
  if(m<1.5||(m>6.5&&m<8.5))col+=albedo*shortBounce(p,geometric)*amb;
#endif
  vec3 spill=lightSpill(p,geometric,vec3(uTarget.x,.16+uTargetY,uTarget.y),targetColor(),.9);
  if(uTargetType>3.5)spill+=lightSpill(p,geometric,vec3(uTarget.x,.75+uTargetY,-3.08),targetColor(),1.3);
#if DETAIL_LEVEL > 0
  ${Array.from({length:8},(_,i)=>`spill+=zoneSpill(p,geometric,uZone${i});`).join('\n  ')}
#endif
  col+=albedo*spill*amb;
  if((m<2.5||(m>18.5&&m<19.5))&&geometric.y>.5){vec2 d=(p.xz-uCube)/vec2(.34,.32);float contact=exp(-dot(d,d)*1.6)*exp(-max(0.,uCubeFoot-p.y)*7.);col*=1.-.22*contact;}
  if(m>14.5&&m<15.5){
    float frame=p.z< -3.09?smoothstep(.83,.94,max(abs(p.x-uTarget.x)/.58,abs(p.y-.74-uTargetY)/.70)):0.;
    emit=portalEnergy(p,rd)*mix(1.,.32,frame);
  }
  float pulse=uPulse.z*uLook.w;
  if(pulse>.001){float ring=abs(length(p.xz-uPulse.xy)-mix(.14,2.08,1.-pulse));float glow=exp(-abs(p.y-uTargetY)*25.)*aaLine(ring,.030)*pulse;col+=targetColor()*glow*.75;}
  return max(col+emit,vec3(0));
}
float segDist(vec3 p,vec3 a,vec3 b){vec3 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
float safeRcp(float x){return 1./(abs(x)<.0001?(x<0.?-.0001:.0001):x);}
// Integrate only inside the room and stop at the first surface. No haze outside the stage.
vec2 airInterval(vec3 ro,vec3 rd,float hitDistance){
  vec3 inv=vec3(safeRcp(rd.x),safeRcp(rd.y),safeRcp(rd.z));
  vec3 a=(vec3(-3.18,.02,-3.18)-ro)*inv,b=(vec3(3.18,3.13,3.20)-ro)*inv;
  vec3 lo=min(a,b),hi=max(a,b);
  float begin=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hitDistance,min(hi.x,min(hi.y,hi.z)));
  return vec2(begin,max(begin,end));
}
vec3 atmosphere(vec3 color,vec3 ro,vec3 rd,float hitDistance){
  vec2 interval=airInterval(ro,rd,hitDistance);float ds=(interval.y-interval.x)/float(FOG_STEPS);
  vec3 scatter=vec3(0);float transmission=1.;
  for(int i=0;i<FOG_STEPS;i++){
    float t=interval.x+(float(i)+.5)*ds;vec3 p=ro+rd*t;
    float dust=.82+.18*noise(p.xz*1.3+vec2(effectTime()*.014,p.y*.65));
    float density=.012*uLook.z*(.45+.55*exp(-max(p.y,0.)*.6))*dust;
#if DETAIL_LEVEL == 0
    density*=.42;
#endif
    float extinction=exp(-density*ds);
    float strip=exp(-segDist(p,vec3(-1.95,3.09,-1.65),vec3(1.95,3.09,-1.65))*1.4);
    strip+=exp(-segDist(p,vec3(-1.95,3.09,-1.70),vec3(-1.95,3.09,1.05))*1.6)*.45;
    strip+=exp(-segDist(p,vec3(1.95,3.09,-1.70),vec3(1.95,3.09,1.05))*1.6)*.45;
    vec3 toLight=normalize(vec3(0,3.09,-1.65)-p);float cosine=dot(-rd,toLight),g=.32;
    float phase=(1.-g*g)/pow(max(1.+g*g-2.*g*cosine,.1),1.5);
#if DETAIL_LEVEL >= 2
    strip*=smoothstep(.01,.14,mapScene(p+toLight*.18).x);
#endif
    vec3 source=vec3(.10,.13,.17)+vec3(1.,.82,.59)*strip*phase*.8;
    if(uTargetType>3.5){vec3 delta=p-vec3(uTarget.x,.75+uTargetY,-3.08);source+=vec3(.015,.6,.22)*exp(-dot(delta,delta)*3.);}
    scatter+=transmission*(1.-extinction)*source;transmission*=extinction;
  }
  return color*transmission+scatter;
}
// Original front-perspective camera. No top-down mode is introduced.
vec3 cameraRay(vec2 frag,out vec3 ro){
  vec2 jitter=vec2(hash(vec2(uTime,1.3)),hash(vec2(2.7,uTime)))-.5;
  vec2 uv=(frag*2.-uRes.xy)/uRes.y+jitter*uShake*.018;
  float lens=dot(uv,uv);uv*=1.+.035*lens;float land=step(uRes.y,uRes.x);
  float fov=mix(1.02,1.34,land);
  ro=vec3(uGravity.x*.50+uCube.x*.055*uMotion,1.42+uCubeY*.06*uMotion+abs(uGravity.y)*.10,mix(5.78,5.08,land)+uGravity.y*.30);
  vec3 ta=vec3(uCube.x*.05*uMotion,.82+uCubeY*.18*uMotion,-.56+uCube.y*.04*uMotion);
  vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
  return normalize(uu*uv.x+vv*uv.y+ww*fov);
}
vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
void main(){
  vec3 ro,rd=cameraRay(gl_FragCoord.xy,ro);
  // Derivatives are evaluated in uniform control flow, never in a material branch.
  float rayCone=1.4/max(uRes.y,2.);
#if HAS_DERIVATIVES
  rayCone=max(rayCone,length(fwidth(rd))*.5);
#endif
  vec2 hit=march(ro,rd);vec3 col=vec3(.018,.024,.032);
  if(hit.y>.5&&hit.x<MAX_DIST){
    vec3 p=ro+rd*hit.x,geometric=normalAt(p);
    gFootprint=clamp(hit.x*rayCone/max(abs(dot(geometric,rd)),.22),.0005,.10);
    col=shade(p,geometric,hit.y,rd);
  }
  col=atmosphere(col,ro,rd,min(hit.x,MAX_DIST));
  vec2 q=vUv-.5;col*=1.-smoothstep(.20,.64,dot(q,q))*.12;
  float lum=dot(col,vec3(.2126,.7152,.0722));
  col*=mix(vec3(.97,.99,1.035),vec3(1.025,1.,.975),smoothstep(.10,.80,lum));
  col*=max(uLook.x,.5);
  vec3 outputColor=pow(aces(max(col,vec3(0))),vec3(.454545));
  // Fine, static display-space dither: no time-dependent film-grain crawling.
  outputColor+=(hash(gl_FragCoord.xy)-.5)*${tier==='cinematic'?'.0007':'.0012'};
  gl_FragColor=vec4(clamp(outputColor,0.,1.),1.);
}`;
}
