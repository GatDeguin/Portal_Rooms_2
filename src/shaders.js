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
void material(float m,vec3 p,vec3 n,out vec3 albedo,out float rough,out float spec,out vec3 emit){
  rough=.65;spec=.08;emit=vec3(0);albedo=vec3(.65);
  if(m<1.5){
    float row=floor((p.x+3.25)*1.72),board=fract((p.x+3.25)*1.72);
    float offset=hash(vec2(row,2.7)),end=fract((p.z+3.25)*.55+offset);
    float seam=max(aaLine(min(board,1.-board)/1.72,.006),aaLine(min(end,1.-end)/.55,.004));
    float variation=hash(vec2(row,floor((p.z+3.25)*.55+offset)))-.5;
    float warp=filteredNoise(p.xz*2.1,2.1),grain=fbm(vec2(p.x*17.+warp*.6,p.z*2.2),17.);
    float fibers=sin(p.x*155.+warp*4.+p.z*.7)*detailWeight(25.);
    float pore=filteredNoise(p.xz*110.,110.);
    albedo=mix(vec3(.47,.30,.17),vec3(.72,.51,.29),.38+grain*.35);
    albedo*=1.+variation*.10+fibers*.025-seam*.30+(pore-.5)*.025;
    rough=clamp(.49+(grain-.5)*.10+seam*.14+variation*.04,.40,.70);spec=.18;
  }else if(m<2.5){
    float weave=sin(p.x*135.)*sin(p.z*135.)*detailWeight(24.);
    float f=fbm(p.xz*12.,12.),border=smoothstep(1.21,1.27,abs(p.z-.78))+smoothstep(2.,2.08,abs(p.x));
    albedo=vec3(.245,.26,.265)+(f-.5)*.06+weave*.017;albedo*=1.-clamp(border,0.,1.)*.20;rough=.94;spec=.025;
  }else if(m<6.5){
    vec2 uv=m<3.5?p.xy:(m<5.5?p.zy:p.xz);
    float plaster=fbm(uv*4.,4.),porosity=filteredNoise(uv*83.,83.);
    if(m<3.5)albedo=vec3(.67,.45,.22);
    else if(m<4.5)albedo=vec3(.35,.49,.26);
    else if(m<5.5)albedo=vec3(.74,.74,.70);
    else albedo=vec3(.58,.61,.60);
    float panel=aaLine(abs(fract(uv.x*.63)-.5)/.63,.003);
    albedo*=1.+(plaster-.5)*.065+(porosity-.5)*.018-panel*.035;
    rough=.82+(plaster-.5)*.08;spec=.10;
  }else if(m<7.5){
    vec3 local=cubeLocal(p);float edge=cubeEdge(local);
    float micro=fbm(local.xy*25.+local.zy*11.,36.);
    float scratch=aaLine(abs(fract(local.x*64.+local.y*2.7+local.z*3.1)-.5)/64.,.0006)*detailWeight(64.);
    scratch*=smoothstep(.58,.84,filteredNoise(local.yz*37.,37.));
    float wear=edge*smoothstep(.30,.74,filteredNoise(local.xy*34.+local.zy*17.,51.));
    albedo=mix(vec3(.62,.023,.014),vec3(.76,.044,.022),.42+micro*.20);
    albedo+=vec3(.055,.018,.009)*wear+scratch*vec3(.020,.008,.004);
    rough=.29+micro*.055+scratch*.13+wear*.045;spec=.30;
  }else if(m<8.5){
    float brush=sin(p.y*130.+p.x*3.)*detailWeight(24.);
    albedo=vec3(.23,.27,.30)+brush*.012;rough=.48;spec=.26;
  }else if(m<10.5){
    float pattern=aaLine(abs(length(p.xz-uTarget)-.31),.013);
    albedo=vec3(.06,.82,.32);emit=vec3(.035,.95,.25)*(.58+pattern*.45);rough=.34;spec=.22;
  }else if(m<11.5){
    vec2 d=abs(p.xz-uTarget);float mark=aaLine(min(d.x,d.y),.030);
    albedo=vec3(.12,.43,.95);emit=vec3(.045,.28,1.)*(.62+mark*.45);rough=.32;spec=.22;
  }else if(m<12.5){
    float angle=atan(p.z-uTarget.y,p.x-uTarget.x)/6.283185+.5;
    float charged=1.-smoothstep(uHold-.006,uHold+.006,angle);
    albedo=vec3(.92,.65,.11);emit=vec3(1.,.53,.035)*(.52+charged*.82);rough=.34;spec=.22;
  }else if(m<13.5){albedo=vec3(.95,.88,.73);emit=vec3(1.,.84,.63)*3.2;rough=.24;spec=.25;
  }else if(m<14.5){albedo=vec3(.38,.30,.23);rough=.47;spec=.25;
  }else if(m<15.5){albedo=vec3(.07,.32,.19);emit=vec3(.025,.9,.37);rough=.28;spec=.30;
  }else if(m<16.5){
    float facets=sin(p.x*18.+p.z*27.)*detailWeight(6.);
    albedo=vec3(.27,.65,.85)+facets*.025;emit=vec3(.035,.30,.65)*.28;rough=.20;spec=.32;
  }else if(m<17.5){
    vec2 cells=fract(p.xz*12.)-.5;float dots=aaLine(length(cells)/12.,.010)*detailWeight(12.);
    albedo=vec3(.54,.18,.70)*(1.-dots*.16);emit=vec3(.50,.06,.82)*.18;rough=.87;spec=.06;
  }else if(m<18.5){
    vec2 dir=length(uBoost)<.001?vec2(1,0):normalize(uBoost);float side=dot(p.xz,vec2(-dir.y,dir.x));
    float arrow=aaLine(abs(fract(dot(p.xz,dir)*3.-effectTime()*.65+abs(fract(side*2.)-.5))-.5)/3.,.037);
    albedo=vec3(.94,.45,.08);emit=vec3(1.,.25,.02)*(.19+arrow*.44);rough=.44;spec=.20;
  }else if(m<19.5){
    float grain=fbm(p.xz*13.+p.xy*2.,15.);albedo=mix(vec3(.48,.30,.14),vec3(.69,.46,.24),grain);rough=.54;spec=.17;
  }else if(m<20.5){float ring=.5+.5*sin(length(p.xz)*20.-effectTime()*2.);albedo=vec3(.12,.82,.92);emit=vec3(.025,.66,.95)*(.68+ring*.15);rough=.29;spec=.25;
  }else{albedo=vec3(.82,.065,.032);emit=vec3(.95,.035,.012)*.28;rough=.36;spec=.30;}
  // Authored pigment values are sRGB-like; all illumination below is linear HDR.
  albedo=pow(clamp(albedo,vec3(.001),vec3(.95)),vec3(2.2));
}
vec3 detailNormal(float m,vec3 p,vec3 geometric){
#if DETAIL_LEVEL > 0
  vec3 q=p,normal=geometric;bool cube=m>6.5&&m<7.5;
  if(cube){q=cubeLocal(p);normal=qrot(vec4(-uCubeQ.xyz,uCubeQ.w),geometric);}
  float frequency=cube?48.:(m<1.5?30.:(m<2.5?22.:16.));
  float amplitude=cube?.027:(m<1.5?.032:(m<2.5?.018:.011));
  vec3 slope=vec3(noise(q.yz*frequency),noise(q.zx*frequency+3.7),noise(q.xy*frequency+7.1))-.5;
  slope-=normal*dot(normal,slope);normal=normalize(normal+slope*amplitude*detailWeight(frequency));
  return cube?qrot(uCubeQ,normal):normal;
#else
  return geometric;
#endif
}
vec3 fresnelSchlick(vec3 f0,float cosine){float x=clamp(1.-cosine,0.,1.),x2=x*x;return f0+(1.-f0)*x2*x2*x;}
float distributionGGX(float nh,float rough){float a=max(rough*rough,.045),a2=a*a,d=nh*nh*(a2-1.)+1.;return a2/max(PI*d*d,.00005);}
float smithG1(float cosine,float rough){float k=(rough+1.)*(rough+1.)*.125;return cosine/max(cosine*(1.-k)+k,.001);}
float metalness(float m){return m>7.5&&m<8.5?.55:(m>13.5&&m<14.5?.25:0.);}
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
vec3 direct(vec3 p,vec3 n,vec3 v,vec3 lp,vec3 radiance,float power,float rough,vec3 f0,vec3 albedo,float metallic,float visibility,float coat){
  vec3 l=lp-p;float d2=dot(l,l);l*=inversesqrt(max(d2,.001));
  float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001);vec3 h=normalize(l+v);
  float nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
  // Finite emitter width broadens highlights instead of producing subpixel fireflies.
  float r=sqrt(rough*rough+.008/max(d2,.1));
  vec3 f=fresnelSchlick(f0,vh),diffuse=(1.-f)*(1.-metallic)*albedo/PI;
  vec3 specular=distributionGGX(nh,r)*smithG1(nl,r)*smithG1(nv,r)*f/max(4.*nl*nv,.001);
#if DETAIL_LEVEL >= 2
  float cf=.04+.96*pow(1.-vh,5.);
  float coating=distributionGGX(nh,.24)*smithG1(nl,.24)*smithG1(nv,.24)*cf/max(4.*nl*nv,.001);
  diffuse*=1.-coat*cf;specular=specular*(1.-coat*cf)+coat*coating;
#endif
  return (diffuse+specular)*radiance*power*nl*visibility/(1.+.11*d2);
}
vec3 environment(vec3 rd,float rough){
  vec3 c=mix(vec3(.035,.043,.058),vec3(.16,.18,.20),rd.y*.5+.5);
  c+=vec3(.22,.16,.09)*pow(max(dot(rd,normalize(vec3(.1,1.,-.5))),0.),mix(90.,4.,rough));
  return c;
}
vec3 quickMat(float m,vec3 p){vec3 a,e;float r,s;material(m,p,vec3(0,1,0),a,r,s,e);return a*.55+e;}
vec2 march(vec3 ro,vec3 rd){float t=0.;for(int i=0;i<STEPS;i++){vec2 h=mapScene(ro+rd*t);if(h.x<SURF_DIST)return vec2(t,h.y);if(t>MAX_DIST)break;t+=h.x*.80;}return vec2(t,0.);}
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
  vec3 n=detailNormal(m,p,geometric),albedo,emit;float rough,spec;material(m,p,n,albedo,rough,spec,emit);
  vec3 v=-rd;float metallic=metalness(m),amb=ao(p,geometric),nv=max(dot(n,v),0.);
  vec3 f0=mix(vec3(clamp(.024+spec*.075,.025,.065)),albedo,metallic),f=fresnelSchlick(f0,nv);
  float coat=m>6.5&&m<7.5?.28:0.;
  vec3 key=vec3(1.,.86,.68)+vec3(uLook.y,0.,-uLook.y);
  vec3 lp=vec3(0,3.045,-.70),ld=lp-p;float visibility=softShadow(p+geometric*.009,normalize(ld),.014,length(ld)-.04);
  vec3 col=albedo*(1.-metallic)*(1.-f)*roomBounce(p,geometric)*amb;
  col+=direct(p,n,v,lp,key,5.7,rough,f0,albedo,metallic,visibility,coat);
  col+=direct(p,n,v,vec3(-1.80,2.60,3.0),vec3(.72,.82,1.),2.2,rough,f0,albedo,metallic,.85,coat);
  vec3 rim=vec3(1.92,3.04,-1.15),rl=rim-p;float rimShadow=1.;
#if DETAIL_LEVEL >= 2
  rimShadow=softShadow(p+geometric*.009,normalize(rl),.014,length(rl)-.04);
#endif
  col+=direct(p,n,v,rim,vec3(1.,.86,.69),1.7,rough,f0,albedo,metallic,rimShadow,coat);
  col*=.88+.12*amb;
  if(rough<.78&&(m<1.5||(m>6.5&&m<8.5)||(m>13.5&&m<16.5)))col+=roughReflection(p,geometric,rd,n,rough)*f*(1.-rough*.55)*(.6+.4*amb);
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
  if(m>14.5&&m<15.5)emit=portalEnergy(p,rd);
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
