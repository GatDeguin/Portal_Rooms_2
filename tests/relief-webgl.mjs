// Real WebGL probes. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH for bundled runtimes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fragmentShader,VERTEX_SHADER} from '../src/shaders.js';
import {createReliefNoiseTexture,RELIEF_NOISE_VERTEX,RELIEF_NOISE_FRAGMENT} from '../src/relief-noise.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=new URL('../test-results/relief/',import.meta.url);await mkdir(out,{recursive:true});
const packet=JSON.parse(execFileSync(process.execPath,['tests/export-render-fixtures.mjs'],{encoding:'utf8',maxBuffer:8e6}));
const checks=[];
try{
 const page=await browser.newPage();
 await page.setContent('<canvas width="640" height="360"></canvas>');
 await page.evaluate(({factory,sources})=>{
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});
  if(!gl)throw Error('Real WebGL is required');
  gl.getExtension('OES_standard_derivatives');const programs=new Map();let surfaceTarget=null;
  const reliefTexture=new Function('return ('+factory+')')()(gl,sources);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,reliefTexture);
  window.render=({vertex,fragment,uniforms={},width=128,height=64,compileOnly=false,surfacePass=false})=>{
   canvas.width=width;canvas.height=height;
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   let p=programs.get(fragment);
   if(!p){
    const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);p=gl.createProgram();
    gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
    gl.deleteShader(v);gl.deleteShader(f);programs.set(fragment,p);
   }
   if(compileOnly)return [];
   const dither=gl.isEnabled(gl.DITHER);
   if(surfacePass){
    if(!surfaceTarget||surfaceTarget.width!==width||surfaceTarget.height!==height){
     if(surfaceTarget){gl.deleteTexture(surfaceTarget.texture);gl.deleteFramebuffer(surfaceTarget.framebuffer);}
     const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
     gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
     if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Probe surface framebuffer incomplete');
     surfaceTarget={texture,framebuffer,width,height};
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,surfaceTarget.framebuffer);gl.disable(gl.DITHER);
   }else gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   if(surfaceTarget){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,surfaceTarget.texture);}
   gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'uSurfaceHits'),1);gl.uniform1i(gl.getUniformLocation(p,'uReliefNoise'),0);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   for(const [name,{kind,args}] of Object.entries(uniforms))gl[kind](gl.getUniformLocation(p,name),...args);
   gl.uniform2f(gl.getUniformLocation(p,'uRes'),width,height);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,3);
   const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const error=gl.getError();gl.deleteBuffer(b);gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(dither)gl.enable(gl.DITHER);if(error)throw Error('WebGL error '+error);
   return Array.from(pixels);
  };
 },{factory:createReliefNoiseTexture.toString(),sources:{vertex:RELIEF_NOISE_VERTEX,fragment:RELIEF_NOISE_FRAGMENT}});
 const template=packet.fixtures.find(f=>f.name==='cinematic-materials');
 const uniforms=structuredClone(template.uniforms);
 uniforms.uCube.args=[0,0];uniforms.uCubeY.args=[0];uniforms.uCubeQ.args=[0,0,0,1];
 for(const [key,value] of Object.entries(uniforms))if(/^u(Obs|Plat|PlatMeta|Ramp|RampMeta|Zone|Bump)/.test(key))value.args=[0,0,0,0];
 const run=async(main,tier='cinematic',u=uniforms)=>{
  const source=fragmentShader(tier),fragment=source.slice(0,source.lastIndexOf('void main(){'))+main;
  return page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment,uniforms:u});
 };
 const check=(name,ok,data={})=>{assert.ok(ok,name+': '+JSON.stringify(data));checks.push({name,...data});console.log('PASS',name);};
 // Lattice padding must match analytic periodic noise across negative cells and
 // the wrap boundary. RGBA8 storage/filtering permits a small bounded error.
 const latticePixels=await run(`void main(){
  gReliefFootprint=0.;vec2 p=(vUv*2.-1.)*503.7+vec2(.371,.819);
  float error=abs(reliefNoise(p,1.)-noise(p));
  gl_FragColor=vec4(error*32.,0.,0.,1.);
 }`);
 const latticeError=Math.max(...latticePixels.filter((_,i)=>i%4===0))/255/32;
 check('GPU relief lattice preserves periodic noise within 0.01',latticeError<=.01,{maxError:latticeError});
 // Non-relief materials also use candidate normals in the production High path.
 // Cover cylinder/ring goals, all emitter bars, both portal primitives and zones.
 const normalCases=[
  [10,[0,.055,0],[0,1,0]],[11,[.49,.035,0],[1,0,0]],
  [12,[.45,.053,0],[0,1,0]],[12,[.515,.035,0],[1,0,0]],
  [13,[0,3.07,-1.65],[0,-1,0]],[13,[-1.95,3.07,.4],[0,-1,0]],[13,[1.95,3.07,.4],[0,-1,0]],
  [15,[0,.74,-3.155],[0,0,1]],[15,[.45,.048,0],[0,1,0]],
  [16,[-1,.028,1],[0,1,0]],[17,[1,.028,1],[0,1,0]],[18,[-1,.028,2],[0,1,0]],[20,[1,.028,2],[0,1,0]],
  [22,[-2,.34,-2],[0,1,0]]
 ];
 const normalUniforms=structuredClone(uniforms);
 normalUniforms.uTarget.args=[0,0];normalUniforms.uTargetY.args=[0];
 [[-1,1,.3,1],[1,1,.3,2],[-1,2,.3,3],[1,2,.3,5]].forEach((args,i)=>normalUniforms['uZone'+i].args=args);
 normalUniforms.uBump0.args=[-2,-2,.4,.34];
 const vector=a=>'vec3('+a.map(v=>Number.isInteger(v)?v+'.':String(v)).join(',')+')';
 const normalMain=`void main(){
  float column=floor(vUv.x*${normalCases.length}.);float m=10.;vec3 p=vec3(0),expected=vec3(0,1,0);
  ${normalCases.map(([m,p,n],i)=>(i?'else ':'')+`if(column<${i+.5}){m=${m}.;p=${vector(p)};expected=${vector(n)};}`).join('\n')}
  ReliefCandidate c=reliefCandidate(p,vec3(0,-1,0),vec2(0,m));vec3 n=candidateNormal(c,0.);
  gl_FragColor=vec4(length(n-expected)*8.,abs(length(n)-1.)*8.,0.,1.);
 }`;
 for(const tier of ['high','cinematic']){
  const pixels=await run(normalMain,tier,normalUniforms);
  check(tier+' candidate normals cover goals, lights, portal, zones and bumpers',pixels.every((v,i)=>i%4===0||i%4===1?v<=2:i%4===3?v===255:true));
 }
 // Rays just outside a cube can still enter the primary 1mm hit-tolerance band.
 // Such a phantom foreground must never consume the whole continuation budget.
 const grazing=`void main(){
  vec3 ro=vec3(.2451+vUv.x*.0008,1.,(vUv.y-.5)*.32);
  vec2 h=march(ro,vec3(0,-1,0));gl_FragColor=vec4(h.y/25.,0.,0.,h.y>.5?1.:0.);
 }`;
 for(const tier of ['high','cinematic']){
  const pixels=await run(grazing,tier);
  check(tier+' near-miss tangent rays reveal carpet without holes',pixels.every((v,i)=>i%4===0?v===20:i%4===3?v===255:true));
 }
 // Resolve instance keys from the filtered union, never from an excluded sibling.
 // Encode the integer key in two bytes so all 2243 keys are checked exactly.
 const instanceCases=[
  {name:'obstacle',material:8,point:[.4998,.245,0],excluded:801,expected:802,seed:2,values:{uObs0:[0,0,1,1],uObs1:[1.0004,0,1,1]}},
  {name:'platform',material:19,point:[.4998,.15,0],excluded:1911,expected:1912,seed:12,values:{uPlat0:[0,0,1,1],uPlatMeta0:[.3,0,0,0],uPlat1:[1.0004,0,1,1],uPlatMeta1:[.3,0,0,0]}},
  {name:'ramp',material:19,point:[.4998,.1,0],excluded:1921,expected:1922,seed:22,values:{uRamp0:[0,0,1,1],uRampMeta0:[.3,0,-1,0],uRamp1:[1.0004,0,1,1],uRampMeta1:[.3,0,-1,0]}},
  {name:'platform after excluded ramp',material:19,point:[.4998,.1,0],excluded:1921,expected:1911,seed:11,values:{uRamp0:[0,0,1,1],uRampMeta0:[.3,0,-1,0],uPlat0:[1.0004,0,1,1],uPlatMeta0:[.3,0,0,0]}},
  {name:'ramp after excluded platform',material:19,point:[.4998,.1,0],excluded:1911,expected:1921,seed:21,values:{uPlat0:[0,0,1,1],uPlatMeta0:[.3,0,0,0],uRamp0:[1.0004,0,1,1],uRampMeta0:[.3,0,-1,0]}},
  {name:'bumper',material:22,point:[.4998,.17,0],excluded:2241,expected:2242,seed:42,values:{uBump0:[0,0,.5,.34],uBump1:[1.0004,0,.5,.34]}},
  {name:'front trim at left corner',material:14,point:[-3.11,.2205,-3.154],excluded:0,expected:1401,values:{}},
  {name:'left trim after excluded front',material:14,point:[-3.11,.2205,-3.154],excluded:1401,expected:1402,values:{}},
  {name:'right trim after excluded front',material:14,point:[3.11,.2205,-3.154],excluded:1401,expected:1403,values:{}},
  {name:'front trim after excluded left',material:14,point:[-3.154,.2205,-3.11],excluded:1402,expected:1401,values:{}}
 ];
 const glsl=x=>Number.isInteger(x)?x+'.':String(x);
 for(const tier of ['high','cinematic'])for(const fixture of instanceCases){
  const u=structuredClone(uniforms);for(const [name,args] of Object.entries(fixture.values))u[name]={kind:'uniform4f',args};
  const main=`void main(){
   gExcludedCandidates=vec3(${glsl(fixture.excluded)},0.,0.);
   vec3 p=vec3(${fixture.point.map(glsl).join(',')});
   ReliefCandidate c=reliefCandidate(p,vec3(0,-1,0),vec2(0.,${glsl(fixture.material)}));
   gl_FragColor=vec4(floor(c.key/256.)/255.,mod(c.key,256.)/255.,c.seed/255.,1.);
  }`;
  const pixels=await run(main,tier,u),expected=[Math.floor(fixture.expected/256),fixture.expected%256,fixture.seed,255];
  check(tier+' selects allowed '+fixture.name+' instance',pixels.every((v,i)=>i%4===2&&fixture.seed===undefined?true:v===expected[i%4]),{expectedKey:fixture.expected,firstPixel:pixels.slice(0,4)});
 }
 // The first sliver lies within A's collision envelope but outside its relief;
 // B is also inside the hit tolerance. Rejecting B must not resurrect A.
 const stackedUniforms=structuredClone(uniforms);
 stackedUniforms.uObs0.args=[0,0,1,1];stackedUniforms.uObs1.args=[1.0004,0,1,1];
 const stacked=`void main(){
  vec3 ro=vec3(.49975+vUv.x*.0001,1.,(vUv.y-.5)*.1);
  vec2 h=march(ro,vec3(0,-1,0));
  gl_FragColor=vec4(h.y/25.,all(equal(gExcludedCandidates,vec3(0)))?1.:0.,0.,1.);
 }`;
 for(const tier of ['high','cinematic']){
  const pixels=await run(stacked,tier,stackedUniforms);
  check(tier+' accumulated sibling exclusions reveal carpet and reset before shading',pixels.every((v,i)=>i%4===0?v===20:i%4===1||i%4===3?v===255:true),{firstPixel:pixels.slice(0,4)});
 }
 // Removing relief from the production march must fail this oblique depth probe.
 const depth=`void main(){
  vec3 ro=vec3(2.2+vUv.x*.4,.3,-.9+vUv.y*.3),rd=normalize(vec3(.6,-1.,.2));
  vec2 h=march(ro,rd);float plane=-ro.y/rd.y;
  gl_FragColor=vec4(clamp((h.x-plane)*100.,0.,1.),h.y/25.,0.,1.);
 }`;
 for(const tier of ['low','medium','high','cinematic']){
  const pixels=await run(depth,tier),red=pixels.filter((_,i)=>i%4===0);
  check(tier+' oblique floor '+(['low','medium'].includes(tier)?'retains envelope':'has actual relief'),['low','medium'].includes(tier)?Math.max(...red)<=1:red.some(v=>v>25));
 }
 // A recessed rounded edge must reveal the carpet, not discard the screen pixel.
 const silhouette=`void main(){
  vec3 ro=vec3(.2435+vUv.x*.0015,1.,(vUv.y-.5)*.32);vec2 h=march(ro,vec3(0,-1,0));
  gl_FragColor=vec4(h.y/25.,h.x/2.,0.,h.y>.5?1.:0.);
 }`;
 const flat=await run(silhouette,'low');
 for(const tier of ['high','cinematic']){
  const relief=await run(silhouette,tier);let revealed=0,holes=0,wrongBackground=0;
  for(let i=0;i<flat.length;i+=4){if(flat[i]===71&&relief[i]<30){revealed++;if(relief[i]!==20)wrongBackground++;}if(relief[i+3]!==255)holes++;}
  check(tier+' silhouette recesses reveal the surface behind the cube',revealed>5,{revealed});
  check(tier+' silhouette continuation does not leave holes',holes===0,{holes});
  check(tier+' clipped cube reveals carpet without skipping the thin layer',wrongBackground===0,{wrongBackground});
 }
 // An independently thin, non-relief surface behind the cube must also survive.
 // Insert a test-only 0.8mm plate above the carpet; production SDF remains untouched.
 for(const tier of ['high','cinematic'])for(const plateY of [.025,.255]){
  let source=fragmentShader(tier);
  source=source.replace('if(!includeSceneCandidate(700.))return r;',
   'r=opU(r,vec2(sdBox(p-vec3(0,uTargetY,0),vec3(.4,.0004,.4)),13.));if(!includeSceneCandidate(700.))return r;');
  const fragment=source.slice(0,source.lastIndexOf('void main(){'))+silhouette;
  const pixels=await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment,uniforms:{...uniforms,uTargetY:{kind:'uniform1f',args:[plateY]}}});
  let seen=0,holes=0,skipped=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]===133)seen++;if(pixels[i+3]!==255)holes++;if(flat[i]===71&&pixels[i]<30)skipped++;}
  check(tier+' continuation preserves a 0.8mm background plate at y='+plateY,seen>5&&holes===0&&skipped===0,{seen,holes,skipped});
 }
 // Test the actual RGBA8 handoff: alpha carries key bits, so this must be an
 // offscreen framebuffer, not the opaque default canvas used by other probes.
 const packSilhouette=`void main(){
  vec3 ro=vec3(.2435+vUv.x*.0015,1.,(vUv.y-.5)*.32);vec2 h=march(ro,vec3(0,-1,0));
  gl_FragColor=vec4(packSurfaceWord(floor(h.x/MAX_DIST*65535.+.5)),packSurfaceWord(gHitKey));
 }`;
 const decodeSurface=`void main(){
  vec4 surfaceWords=texture2D(uSurfaceHits,gl_FragCoord.xy/uRes);float key=unpackSurfaceWord(surfaceWords.ba);
  gl_FragColor=vec4(floor(key/100.)/25.,0.,0.,key>0.?1.:0.);
 }`;
 for(const tier of ['high','cinematic'])for(const plateY of [null,.025,.255]){
  let source=fragmentShader(tier);
  if(plateY!==null)source=source.replace('if(!includeSceneCandidate(700.))return r;',
    'r=opU(r,vec2(sdBox(p-vec3(0,uTargetY,0),vec3(.4,.0004,.4)),13.));if(!includeSceneCandidate(700.))return r;');
  const prefix=source.slice(0,source.lastIndexOf('void main(){')),u={...uniforms,uTargetY:{kind:'uniform1f',args:[plateY??0]}};
  const words=await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:prefix+packSilhouette,uniforms:u,surfacePass:true});
  const decoded=await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:prefix+decodeSurface,uniforms:u});
  let revealed=0,holes=0,wrong=0;
  for(let i=0;i<decoded.length;i+=4){
    if(decoded[i+3]!==255)holes++;
    if(flat[i]===71&&decoded[i]!==71){revealed++;if(decoded[i]!== (plateY===null?20:133))wrong++;}
    assert.ok(words[i+2]*256+words[i+3]>0,'surface key was lost in RGBA8');
  }
  check(tier+' RGBA8 handoff preserves clipped background at y='+plateY,revealed>5&&holes===0&&wrong===0,{revealed,holes,wrong});
 }
 const colors=`void main(){
  vec3 q=vec3((vUv.x-.5)*.45,.245,(vUv.y-.5)*.45);
  vec3 p=vec3(uCube.x,.255+uCubeY,uCube.y)+qrot(uCubeQ,q);
  vec3 local,extent;float seed;materialCoordinates(7.,p,local,extent,seed);
  gl_FragColor=materialVertexColor(7.,local,extent,seed);
 }`;
 const c0=await run(colors),moved=structuredClone(uniforms);
 moved.uCube.args=[.7,-.4];moved.uCubeY.args=[.2];moved.uCubeQ.args=[.2,.3,.4,Math.sqrt(.71)];
 const c1=await run(colors,'cinematic',moved);let maxError=0;
 for(let i=0;i<c0.length;i++)maxError=Math.max(maxError,Math.abs(c0[i]-c1[i]));
 check('vertex colors stay anchored through translation and rotation',maxError<=1,{maxError});
 check('vertex colors provide spatial variation',new Set(c0.filter((_,i)=>i%4===0)).size>3);
 if(!process.argv.includes('--probes-only')){
 for(const tier of ['low','medium','high','cinematic'])for(const precision of ['highp','mediump'])for(const derivatives of [false,true]){
  const passes=precision==='highp'&&['high','cinematic'].includes(tier)?['surface','shade']:['combined'];
  for(const pass of passes){
   await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:fragmentShader(tier,precision,{derivatives,pass}),compileOnly:true});
   check(`compile ${tier} ${precision} derivatives=${derivatives} pass=${pass}`,true);
  }
 }
 for(const name of ['cinematic-materials','scene-15','expansion-final-portal']){
  const f=packet.fixtures.find(f=>f.name===name);
  await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:fragmentShader('cinematic','highp',{pass:'surface'}),uniforms:f.uniforms,width:640,height:360,surfacePass:true});
  const pixels=await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:fragmentShader('cinematic','highp',{pass:'shade'}),uniforms:f.uniforms,width:640,height:360});
  check('nonempty opaque render '+name,new Set(pixels.filter((_,i)=>i%4===0)).size>80&&pixels.every((v,i)=>i%4!==3||v===255));
  await page.locator('canvas').screenshot({path:fileURLToPath(new URL(name+'.png',out))});
 }
 }
 await writeFile(new URL(process.argv.includes('--probes-only')?'probes.json':'report.json',out),JSON.stringify({status:'passed',backend:'Chromium WebGL / ANGLE SwiftShader (software)',checks},null,2));
}finally{await browser.close();}
