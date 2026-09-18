import {TIERS} from './quality.js';
export const VERTEX_SHADER='attribute vec2 aPos; varying vec2 vUv; void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}';
const uniforms=(name,count)=>Array.from({length:count},(_,i)=>`uniform vec4 ${name}${i};`).join('\n');
const objects=(count,call)=>Array.from({length:count},(_,i)=>`r=opU(r,${call(i)});`).join('\n');
export function fragmentShader(tier='medium',precision='highp') {
  const q=TIERS[tier]??TIERS.medium;
  return `
precision ${precision==='mediump'?'mediump':'highp'} float;
varying vec2 vUv;
uniform vec2 uRes,uCube,uGravity,uTarget,uBoost;
uniform float uTime,uCubeY,uCubeFoot,uShake,uTargetY,uTargetType,uHold,uMotion;
uniform vec4 uCubeQ,uPulse;
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
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<OCTAVES;i++){v+=a*noise(p);p*=2.04;a*=.5;}return v;}
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
float softShadow(vec3 ro,vec3 rd,float mint,float maxt){float res=1.,t=mint;for(int i=0;i<SHADOW_STEPS;i++){float h=mapScene(ro+rd*t).x;res=min(res,10.5*h/t);t+=clamp(h,.018,.15);if(res<.018||t>maxt)break;}return clamp(res,0.,1.);}
float ao(vec3 p,vec3 n){float occ=0.,sca=1.;for(int i=0;i<AO_STEPS;i++){float h=.025+.070*float(i),d=mapScene(p+n*h).x;occ+=(h-d)*sca;sca*=.72;}return clamp(1.-occ*1.36,0.,1.);}
void material(float m,vec3 p,vec3 n,out vec3 albedo,out float rough,out float spec,out vec3 emit){
  rough=.65;spec=.08;emit=vec3(0);albedo=vec3(.7);
  if(m<1.5){
    float board=fract((p.x+3.25)*1.72),seam=1.-smoothstep(.020,.055,min(board,1.-board));
    float grain=fbm(vec2(p.x*7.5+fbm(p.xz*2.)*.8,p.z*44.)),pore=fbm(p.xz*95.);
    albedo=mix(vec3(.50,.32,.16),vec3(.86,.67,.42),.35+.35*grain);albedo*=1.-seam*.12+pore*.025;rough=.34;spec=.20;
  }else if(m<2.5){
    float f1=fbm(p.xz*24.),f2=fbm(p.xz*96.),warp=fbm(p.xz*6.);
    float fibers=pow(abs(sin((p.x*1.4+p.z*2.9+warp*.18)*115.)),8.);
    float border=smoothstep(1.22,1.29,abs(p.z-.78))+smoothstep(2.,2.09,abs(p.x));
    albedo=vec3(.205,.218,.224)+vec3(f1*.12+f2*.04)+fibers*.070;albedo=mix(albedo,vec3(.135,.145,.148),clamp(border,0.,1.)*.55);rough=.97;spec=.020;
  }else if(m<3.5){albedo=vec3(1.,.49,.050)*(.86+.12*fbm(p.xy*5.));rough=.62;spec=.065;
  }else if(m<4.5){albedo=vec3(.18,.68,.09)*(.86+.13*fbm(p.zy*5.2));rough=.66;spec=.055;
  }else if(m<5.5){albedo=vec3(.91,.885,.835)*(.89+.08*fbm(p.zy*6.));rough=.54;spec=.115;
  }else if(m<6.5){albedo=vec3(.75,.67,.55)*(.88+.08*fbm(p.xz*8.));rough=.58;spec=.10;
  }else if(m<7.5){
    float micro=fbm(p.xz*18.+p.xy*4.),scratches=smoothstep(.86,1.,fbm(p.xy*76.+p.zx*13.));
    vec3 local=qrot(vec4(-uCubeQ.xyz,uCubeQ.w),p-vec3(uCube.x,.255+uCubeY,uCube.y));
    float edge=pow(clamp(1.-abs(max(max(abs(local.x),abs(local.y)),abs(local.z))-.245)/.245,0.,1.),4.);
    albedo=mix(vec3(.66,.010,.006),vec3(1.,.070,.040),.45+.22*micro);albedo+=vec3(.090,.010,.006)*scratches+vec3(.145,.020,.012)*edge;albedo=clamp(albedo,0.,1.);rough=.30+scratches*.10;spec=.24;
  }else if(m<8.5){albedo=vec3(.19,.225,.26);rough=.46;spec=.18;
  }else if(m<10.5){
    float pattern=1.-smoothstep(.018,.045,abs(length(p.xz-uTarget)-.31));albedo=vec3(.07,.92,.38);emit=vec3(.06,.92,.38)*(.8+pattern*.65);rough=.30;spec=.30;
  }else if(m<11.5){
    vec2 d=abs(p.xz-uTarget);float crossMark=1.-smoothstep(.028,.06,min(d.x,d.y));albedo=vec3(.16,.54,1);emit=vec3(.10,.46,1)*(.9+crossMark*.7);rough=.30;spec=.30;
  }else if(m<12.5){
    float angle=atan(p.z-uTarget.y,p.x-uTarget.x)/6.283185+.5;float charged=step(angle,uHold);albedo=vec3(1.,.72,.12);emit=vec3(1.,.68,.18)*(.75+charged*1.6);rough=.34;spec=.28;
  }else if(m<13.5){albedo=vec3(1.,.88,.62);emit=vec3(1.,.75,.40)*4.6;rough=.15;spec=.48;
  }else if(m<14.5){albedo=vec3(.62,.46,.30);rough=.35;spec=.16;
  }else if(m<15.5){
    float bands=.5+.5*sin((p.x+p.y)*18.-uTime*2.);albedo=vec3(.12,.95,.56);emit=vec3(.10,1.,.62)*(1.3+bands*.5);rough=.22;spec=.42;
  }else if(m<16.5){
    float facets=smoothstep(.88,.98,abs(sin(p.x*18.+p.z*27.)));albedo=vec3(.35,.82,1)+facets*.14;emit=vec3(.10,.62,1)*.34;rough=.09;spec=.45;
  }else if(m<17.5){
    vec2 cells=fract(p.xz*12.)-.5;float dots=1.-smoothstep(.1,.22,length(cells));albedo=vec3(.62,.20,.82)*(1.-dots*.25);emit=vec3(.70,.18,1)*.25;rough=.86;spec=.05;
  }else if(m<18.5){
    vec2 dir=length(uBoost)<.001?vec2(1,0):normalize(uBoost);float side=dot(p.xz,vec2(-dir.y,dir.x));float arrow=1.-smoothstep(.06,.16,abs(fract(dot(p.xz,dir)*3.-uTime*.8+abs(fract(side*2.)-.5))-.5));
    albedo=vec3(1.,.50,.12);emit=vec3(1.,.36,.08)*(.35+arrow*.65);rough=.36;spec=.26;
  }else if(m<19.5){float grain=fbm(p.xz*18.+p.xy*3.);albedo=mix(vec3(.62,.38,.18),vec3(.88,.58,.28),grain);rough=.46;spec=.18;
  }else if(m<20.5){float ring=.5+.5*sin(length(p.xz)*20.-uTime*4.);albedo=vec3(.20,.95,1);emit=vec3(.10,.75,1)*(1.+ring*.35);rough=.22;spec=.42;
  }else{albedo=vec3(1.,.10,.06);emit=vec3(1.,.08,.04)*.55;rough=.20;spec=.55;}
}
vec3 quickMat(float m,vec3 p){vec3 a,e;float r,s;material(m,p,vec3(0,1,0),a,r,s,e);return a+e;}
vec2 march(vec3 ro,vec3 rd){float t=0.,m=0.;for(int i=0;i<STEPS;i++){vec2 h=mapScene(ro+rd*t);if(h.x<SURF_DIST||t>MAX_DIST){m=h.y;break;}t+=h.x*.80;}return vec2(t,m);}
vec3 reflectionProbe(vec3 ro,vec3 rd){float t=.04;for(int i=0;i<REFLECTION_STEPS;i++){vec3 p=ro+rd*t;vec2 h=mapScene(p);if(h.x<SURF_DIST*2.)return quickMat(h.y,p)*exp(-t*.07);t+=clamp(h.x*.90,.025,.25);if(t>15.)break;}return vec3(.050,.062,.078);}
vec3 direct(vec3 p,vec3 n,vec3 v,vec3 lp,vec3 color,float power,float rough,float spec,vec3 albedo){
  vec3 l=lp-p;float d=length(l);l/=d;float sh=softShadow(p+n*.018,l,.035,d-.08),diff=max(dot(n,l),0.);
  vec3 h=normalize(l+v);float sp=pow(max(dot(n,h),0.),mix(115.,10.,rough))*spec;
  return (albedo*diff*power+color*sp*power*.85)*sh/(1.+.055*d*d);
}
vec3 shade(vec3 p,vec3 n,float m,vec3 rd){
  if(m<6.5){float b0=fbm(p.xz*34.+vec2(2.1,.7)),b1=fbm(p.xz*34.+vec2(.2,5.3));n=normalize(n+vec3(b0-.5,0.,b1-.5)*.040);}
  if(m>6.5&&m<7.5){float b=fbm(p.xy*28.+p.zx*9.);n=normalize(n+vec3(b-.5,b*.18,.5-b)*.026);}
  vec3 albedo,emit;float rough,spec;material(m,p,n,albedo,rough,spec,emit);vec3 v=normalize(-rd);float amb=ao(p,n);
  vec3 floorBounce=vec3(.105,.078,.052)*max(n.y,0.),screenBounce=vec3(.038,.052,.074)*max(-n.z,0.);
  vec3 greenBleed=vec3(.018,.055,.014)*max(-n.x,0.),whiteBleed=vec3(.045,.043,.038)*max(n.x,0.);
  vec3 col=albedo*(vec3(.155,.172,.198)+floorBounce+screenBounce+greenBleed+whiteBleed)*amb;
  col+=direct(p,n,v,vec3(0,3.05,-.70),vec3(1,.84,.58),1.78,rough,spec,albedo);
  col+=direct(p,n,v,vec3(-1.95,3.,.62),vec3(.70,.82,1),.76,rough,spec*.75,albedo);
  col+=direct(p,n,v,vec3(1.95,2.90,.20),vec3(1,.80,.55),.58,rough,spec*.6,albedo);
  float fres=pow(1.-max(dot(n,v),0.),5.);
  if(m<1.5||(m>6.5&&m<7.5)||(m>13.5&&m<18.5)){
    vec3 refl=reflectionProbe(p+n*.025,reflect(rd,n));float amt=m<1.5?.12:(m<7.5?.10:.15);if(m>6.5&&m<7.5)refl*=vec3(.95,.10,.07);col=mix(col,refl,amt*(.22+fres));
  }
  if((m<2.5||(m>18.5&&m<19.5))&&n.y>.5){vec2 d=(p.xz-uCube)/vec2(.42,.34);float contact=exp(-dot(d,d)*1.8)*exp(-max(0.,uCubeFoot-p.y)*3.5);col*=1.-.28*contact;}
  float pulse=uPulse.z;
  if(pulse>.001){float ring=abs(length(p.xz-uPulse.xy)-mix(.14,2.08,1.-pulse));float pg=exp(-abs(p.y-uTargetY)*25.)*(1.-smoothstep(0.,.095,ring))*pulse;vec3 pc=uPulse.w<1.5?vec3(.2,1,.55):(uPulse.w<2.5?vec3(.22,.62,1):(uPulse.w<3.5?vec3(1,.72,.15):vec3(.12,1,.62)));col+=pc*pg*2.35;}
  col-=exp(-abs(p.y)*13.)*.045;return col+emit;
}
float segDist(vec3 p,vec3 a,vec3 b){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
vec3 atmosphere(vec3 ro,vec3 rd,float maxT){
  vec3 acc=vec3(0);float tMax=clamp(maxT,2.,12.);
  for(int i=0;i<FOG_STEPS;i++){
    float t=tMax*(float(i)+.5)/float(FOG_STEPS);vec3 p=ro+rd*t;float strip=0.;
    strip+=exp(-segDist(p,vec3(-1.95,3.09,-1.65),vec3(1.95,3.09,-1.65))*4.3);
    strip+=exp(-segDist(p,vec3(-1.95,3.09,-1.70),vec3(-1.95,3.09,1.05))*4.)*.55;
    strip+=exp(-segDist(p,vec3(1.95,3.09,-1.70),vec3(1.95,3.09,1.05))*4.)*.55;
    float dust=fbm(p.xz*1.35+vec2(uTime*.025,.17))*.55+.45;float heightFade=smoothstep(.15,2.8,p.y)*(1.-smoothstep(2.25,3.25,p.y));
    acc+=vec3(1.,.78,.46)*strip*dust*heightFade*.0125*8./float(FOG_STEPS)*exp(-t*.035);
  }return acc;
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
  vec3 ro,rd=cameraRay(gl_FragCoord.xy,ro);vec2 hit=march(ro,rd);vec3 col;float depth=1.;
  if(hit.x>MAX_DIST-.01||hit.y<.5){col=vec3(.025,.032,.042)+vec3(.018,.022,.030)*(1.-vUv.y);}
  else{vec3 p=ro+rd*hit.x;col=shade(p,normalAt(p),hit.y,rd);depth=clamp(hit.x/13.,0.,1.);col=mix(col,vec3(.043,.052,.066),depth*.115);}
  col+=atmosphere(ro,rd,hit.x);vec2 q=vUv-.5;float vig=1.-smoothstep(.17,.90,dot(q,q));col*=.72+.28*vig;
  float lum=dot(col,vec3(.2126,.7152,.0722));col=mix(col*vec3(.92,.97,1.06),col*vec3(1.08,1.,.90),smoothstep(.18,.95,lum));
  float smudge=fbm(vUv*vec2(9.,5.)+vec2(.8,.25)),glass=smoothstep(.70,1.,smudge)*.018*smoothstep(.08,.8,depth);
  col+=vec3(glass);col+=(hash(gl_FragCoord.xy+uTime*17.)-.5)*.006;
  gl_FragColor=vec4(pow(aces(max(col,vec3(0))),vec3(.4545)),1.);
}`;
}
