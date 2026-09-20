// Real WebGL probes. Set PLAYWRIGHT_MODULE and CHROMIUM_PATH for bundled runtimes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fragmentShader,VERTEX_SHADER} from '../src/shaders.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=new URL('../test-results/relief/',import.meta.url);await mkdir(out,{recursive:true});
const packet=JSON.parse(execFileSync(process.execPath,['tests/export-render-fixtures.mjs'],{encoding:'utf8',maxBuffer:8e6}));
const checks=[];
try{
 const page=await browser.newPage();
 await page.setContent('<canvas width="640" height="360"></canvas>');
 await page.evaluate(()=>{
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false});
  if(!gl)throw Error('Real WebGL is required');
  gl.getExtension('OES_standard_derivatives');
  window.render=({vertex,fragment,uniforms={},width=128,height=64,compileOnly=false})=>{
   canvas.width=width;canvas.height=height;
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram();
   gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
   gl.deleteShader(v);gl.deleteShader(f);
   if(compileOnly){gl.deleteProgram(p);return [];}
   gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   for(const [name,{kind,args}] of Object.entries(uniforms))gl[kind](gl.getUniformLocation(p,name),...args);
   gl.uniform2f(gl.getUniformLocation(p,'uRes'),width,height);gl.viewport(0,0,width,height);gl.drawArrays(gl.TRIANGLES,0,3);
   const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const error=gl.getError();gl.deleteBuffer(b);gl.deleteProgram(p);if(error)throw Error('WebGL error '+error);
   return Array.from(pixels);
  };
 });
 const template=packet.fixtures.find(f=>f.name==='cinematic-materials');
 const uniforms=structuredClone(template.uniforms);
 uniforms.uCube.args=[0,0];uniforms.uCubeY.args=[0];uniforms.uCubeQ.args=[0,0,0,1];
 for(const [key,value] of Object.entries(uniforms))if(/^u(Obs|Plat|PlatMeta|Ramp|RampMeta|Zone|Bump)/.test(key))value.args=[0,0,0,0];
 const run=async(main,tier='cinematic',u=uniforms)=>{
  const source=fragmentShader(tier),fragment=source.slice(0,source.lastIndexOf('void main(){'))+main;
  return page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment,uniforms:u});
 };
 const check=(name,ok,data={})=>{assert.ok(ok,name+': '+JSON.stringify(data));checks.push({name,...data});console.log('PASS',name);};
 // Removing relief from the production march must fail this oblique depth probe.
 const depth=`void main(){
  vec3 ro=vec3(2.2+vUv.x*.4,.3,-.9+vUv.y*.3),rd=normalize(vec3(.6,-1.,.2));
  vec2 h=march(ro,rd);float plane=-ro.y/rd.y;
  gl_FragColor=vec4(clamp((h.x-plane)*100.,0.,1.),h.y/25.,0.,1.);
 }`;
 const low=await run(depth,'low'),high=await run(depth);
 check('height field changes the actual oblique floor intersection',high.some((v,i)=>i%4===0&&v>25));
 check('low tier retains the undisplaced intersection',Math.max(...low.filter((_,i)=>i%4===0))<=1);
 // A recessed rounded edge must reveal the carpet, not discard the screen pixel.
 const silhouette=`void main(){
  vec3 ro=vec3(.2435+vUv.x*.0015,1.,(vUv.y-.5)*.32);vec2 h=march(ro,vec3(0,-1,0));
  gl_FragColor=vec4(h.y/25.,h.x/2.,0.,h.y>.5?1.:0.);
 }`;
 const flat=await run(silhouette,'low'),relief=await run(silhouette);
 let revealed=0,holes=0,wrongBackground=0;
 for(let i=0;i<flat.length;i+=4){if(flat[i]===71&&relief[i]<30){revealed++;if(relief[i]!==20)wrongBackground++;}if(relief[i+3]!==255)holes++;}
 check('silhouette recesses reveal the surface behind the cube',revealed>5,{revealed});
 check('silhouette continuation does not leave holes',holes===0,{holes});
 check('clipped cube reveals carpet without skipping the thin layer',wrongBackground===0,{wrongBackground});
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
  await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:fragmentShader(tier,precision,{derivatives}),compileOnly:true});
  check(`compile ${tier} ${precision} derivatives=${derivatives}`,true);
 }
 for(const name of ['cinematic-materials','scene-15','expansion-final-portal']){
  const f=packet.fixtures.find(f=>f.name===name),pixels=await page.evaluate(data=>window.render(data),{vertex:VERTEX_SHADER,fragment:fragmentShader('cinematic'),uniforms:f.uniforms,width:640,height:360});
  check('nonempty opaque render '+name,new Set(pixels.filter((_,i)=>i%4===0)).size>80&&pixels.every((v,i)=>i%4!==3||v===255));
  await page.locator('canvas').screenshot({path:fileURLToPath(new URL(name+'.png',out))});
 }
 }
 await writeFile(new URL(process.argv.includes('--probes-only')?'probes.json':'report.json',out),JSON.stringify({status:'passed',backend:'Chromium WebGL / ANGLE SwiftShader (software)',checks},null,2));
}finally{await browser.close();}
