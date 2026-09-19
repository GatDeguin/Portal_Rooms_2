// Test-only entrypoints. No benchmark room, debug uniform or diagnostic branch is shipped.
import {execFileSync} from 'node:child_process';
import {fragmentShader} from '../src/shaders.js';
const packet=JSON.parse(execFileSync(process.execPath,['tests/export-render-fixtures.mjs'],{encoding:'utf8',maxBuffer:8e6}));
const fixtures=[];
const template=packet.fixtures.find(f=>f.name==='cinematic-materials');
const probeMain=`
void main(){
  float column=floor(vUv.x*20.);float row=floor(vUv.y*4.);
  float m=column+1.;if(column>=8.)m=column+2.;if(column>=19.)m=22.;
  vec3 p=vec3((fract(vUv.x*20.)-.5)*.30,.245,.1),g=vec3(0,1,0);
  if(m<1.5)p=vec3(p.x+2.5,0.,-.8);
  else if(m<2.5)p=vec3(p.x,.01,.78);
  else if(m<6.5){p=vec3(p.x,1.,-3.185);g=vec3(0,0,1);}
  else if(m<7.5)p=vec3(uCube.x+p.x,.255+uCubeY+.245,uCube.y+.1);
  else if(m<8.5)p=vec3(uObs0.x+p.x,.49,uObs0.y+.1);
  else if(m<12.5)p=vec3(uTarget.x+p.x,.055+uTargetY,uTarget.y+.1);
  else if(m>18.5&&m<19.5)p=vec3(uPlat0.x+p.x,uPlatMeta0.x,uPlat0.y+.1);
  else p=vec3(p.x,.03,.1);
  gFootprint=.0015;
  vec3 a,e,n;float r,s;vec4 layers;
  surfaceMaterial(m,p,g,a,r,s,e,layers,n);
  bool valid=all(greaterThanEqual(a,vec3(0)))&&all(lessThanEqual(a,vec3(1)))&&r>=.18&&r<=1.&&s>=0.&&s<=1.&&
    all(greaterThanEqual(layers,vec4(0)))&&all(lessThanEqual(layers,vec4(1)))&&dot(n,n)>.99&&dot(n,n)<1.01&&dot(n,g)>.8;
  vec3 color=row<1.?pow(a,vec3(.454545)):(row<2.?vec3(r,s,layers.x):(row<3.?layers.yzw:n*.5+.5));
  gl_FragColor=vec4(color,valid?1.:0.);
}`;
function replaceMain(source,main){return source.slice(0,source.lastIndexOf('void main(){'))+main;}
const fragments={};
for(const tier of ['low','medium','high','cinematic']){
  const name=`properties-${tier}`;fragments[name]=replaceMain(fragmentShader(tier),probeMain);
  const f=structuredClone(template);Object.assign(f,{name,tier:name,width:640,height:128});
  f.uniforms.uRes.args=[640,128];f.uniforms.uObs0.args=[0,0,1,1];f.uniforms.uPlat0.args=[0,0,1,1];f.uniforms.uPlatMeta0.args=[.6,0,0,0];
  fixtures.push(f);
}


// Local-material invariance: translations and quaternion rotations, not camera screenshots.
for(const [label,m] of [['cube',7],['obstacle',8],['platform',19],['jump',20],['bumper',22]]){
  const main=`
void main(){
  float m=${m}.;vec3 p=vec3((vUv.x-.5)*.48,.245,.10),g=vec3(0,1,0);
  if(m==7.){p=vec3(uCube.x,.255+uCubeY,uCube.y)+qrot(uCubeQ,p);g=qrot(uCubeQ,g);}
  else if(m==8.)p=vec3(uObs0.x+p.x,.49,uObs0.y+p.z);
  else if(m==19.)p=vec3(uPlat0.x+p.x,uPlatMeta0.x,uPlat0.y+p.z);
  else if(m==20.)p=vec3(uZone0.x+p.x,.028,uZone0.y+p.z);
  else p=vec3(uBump0.x+p.x,uBump0.w,uBump0.y+p.z);
  gFootprint=.0015;vec3 a,e,n;float r,s;vec4 layers;
  surfaceMaterial(m,p,g,a,r,s,e,layers,n);
  if(m==7.)n=qrot(vec4(-uCubeQ.xyz,uCubeQ.w),n);
  float row=floor(vUv.y*4.);
  gl_FragColor=vec4(row<1.?a:(row<2.?vec3(r,s,layers.x):(row<3.?layers.yzw:n*.5+.5)),1.);
}`;
  fragments['anchor-'+label]=replaceMain(fragmentShader('cinematic'),main);
  for(const step of [0,1]){
    const f=structuredClone(template);Object.assign(f,{name:`anchor-${label}-${step}`,tier:'anchor-'+label,width:128,height:64,diagnostic:true});
    f.uniforms.uRes.args=[128,64];f.uniforms.uLook.args[3]=0;f.uniforms.uTime.args[0]=step*2.7;
    f.uniforms.uObs0.args=[step*.7,step*.4,1,1];f.uniforms.uPlat0.args=[step*.7,step*.4,1,1];f.uniforms.uPlatMeta0.args=[.6,0,0,0];
    f.uniforms.uZone0.args=[step*.7,step*.4,.7,5];f.uniforms.uBump0.args=[step*.7,step*.4,.4,.6];
    f.uniforms.uCube.args=[step*.7,step*.4];f.uniforms.uCubeQ.args=step?[.2,.3,.4,Math.sqrt(.71)]:[0,0,0,1];
    fixtures.push(f);
  }
}
const filterMain=`
void main(){
  gFootprint=.15;float x=vUv.x*6.-3.;
  vec3 value=materialNoise(vec2(x,x*1.7)*80.,80.);
  float stripe=filteredStripe(x,.025,.0025);
  gl_FragColor=vec4(stripe,value.x,length(value.yz),1.);
}`;
fragments.filter=replaceMain(fragmentShader('cinematic'),filterMain);
fixtures.push({...structuredClone(template),name:'filter',tier:'filter',width:128,height:32,diagnostic:true});
// White-furnace quadrature at 4096 angles per texel. Executes the production direct BRDF.
// Values are divided by 2 for 8-bit storage, so 0.5 encodes reflectance 1.
for(const [label,metal,coat] of [['dielectric',0,0],['coated',0,.42],['metal',1,0]]){
 const main=`
void main(){
  float rough=mix(.2,.95,vUv.x),nv=mix(.15,1.,vUv.y);
  vec3 n=vec3(0,1,0),v=vec3(sqrt(1.-nv*nv),nv,0),sum=vec3(0);
  for(int i=0;i<4096;i++){
    float z=(float(i)+.5)/4096.,phi=fract(float(i)*.6180339)*6.283185;
    vec3 l=vec3(sqrt(1.-z*z)*cos(phi),z,sqrt(1.-z*z)*sin(phi));
    sum+=direct(vec3(0),n,v,l*10.,vec3(1),12.,rough,${metal?'vec3(.8)':'vec3(.04)'},vec3(1),${metal}.,1.,${coat.toFixed(2)},.24,n);
  }
  gl_FragColor=vec4(sum*6.283185/4096./2.,1.);
}`;
 // High precision integer indices prevent float(i) being lowered to half precision on GLES.
 fragments['furnace-'+label]=replaceMain(fragmentShader('cinematic'),main).replace('precision highp float;','precision highp float; precision highp int;');
 fixtures.push({...structuredClone(template),name:'furnace-'+label,tier:'furnace-'+label,width:24,height:12,diagnostic:true});
}
// Edge-wear coverage is measured separately from the central face swatches.
const edgeMain=`
void main(){
  vec3 local=vec3(mix(-.24,.24,vUv.x),mix(-.24,.24,vUv.y),.245),p=vec3(uCube.x,.255+uCubeY,uCube.y)+local;
  gFootprint=.001;vec3 a,e,n;float r,s;vec4 layers;
  surfaceMaterial(7.,p,vec3(0,0,1),a,r,s,e,layers,n);
  gl_FragColor=vec4(layers.x,layers.y,layers.z,1.);
}`;
fragments.wear=replaceMain(fragmentShader('cinematic'),edgeMain);
fixtures.push({...structuredClone(template),name:'wear',tier:'wear',width:128,height:128,diagnostic:true});
// A true mediump execution test: tiny finite differences must not underflow in normalize().
const normalMain=`
void main(){
  float column=floor(vUv.x*3.);vec3 p=vec3((fract(vUv.x*3.)-.5)*.3,.6+vUv.y*2.,-3.185),expected=vec3(0,0,1);
  if(column<1.){p=vec3(-3.185,p.y,p.x);expected=vec3(1,0,0);}
  if(column>1.5){p=vec3(3.185,p.y,p.x);expected=vec3(-1,0,0);}
  vec3 n=normalAt(p);bool valid=dot(n,expected)>.99&&dot(n,n)<1.01;
  gl_FragColor=vec4(n*.5+.5,valid?1.:0.);
}`;
for(const precision of ['highp','mediump']){
 const key='normal-'+precision;
 fragments[key]=replaceMain(fragmentShader('low',precision),normalMain);
 fixtures.push({...structuredClone(template),name:key,tier:key,width:96,height:64,diagnostic:true});
}
const hitMain=`
void main(){vec3 ro,rd=cameraRay(gl_FragCoord.xy,ro);vec2 h=march(ro,rd);gl_FragColor=vec4(h.y/25.,h.x/24.,0.,h.y>.5&&h.x<MAX_DIST?1.:0.);}`;
for(const precision of ['highp','mediump']){
 const key='hits-'+precision;fragments[key]=replaceMain(fragmentShader('low',precision),hitMain);
 const f={...structuredClone(template),name:key,tier:key,width:160,height:90,diagnostic:true};f.uniforms.uRes.args=[160,90];fixtures.push(f);
}
console.log(JSON.stringify({vertex:packet.vertex,fragments,fixtures,comparisons:[]}));
