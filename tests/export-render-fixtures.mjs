// Exercise production uniform packing independently from the browser.
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';
import {CAMPAIGN_LEVELS as LEVELS} from '../src/campaign.js';
import {DEFAULT_SETTINGS} from '../src/storage.js';
import {VERTEX_SHADER,fragmentShader} from '../src/shaders.js';
import {RELIEF_NOISE_VERTEX,RELIEF_NOISE_FRAGMENT} from '../src/relief-noise.js';
let commands={};let next=1;const constants=new Map();
const gl=new Proxy({}, {get:(_,key)=>{
  if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
  if(key==='getParameter')return parameter=>parameter===gl.VIEWPORT?[0,0,64,64]:parameter===gl.ACTIVE_TEXTURE?gl.TEXTURE0:parameter===gl.FRAMEBUFFER_BINDING||parameter===gl.CURRENT_PROGRAM||parameter===gl.ARRAY_BUFFER_BINDING||parameter===gl.TEXTURE_BINDING_2D?null:[8192,8192];
  if(key==='checkFramebufferStatus')return ()=>gl.FRAMEBUFFER_COMPLETE;
  if(key==='isEnabled')return ()=>false;
  if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
  if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'';
  if(key==='getAttribLocation')return ()=>0;
  if(key==='getUniformLocation')return (_program,name)=>name;
  if(key.startsWith('uniform'))return (name,...args)=>{if(!args.every(Number.isFinite))throw Error(`Invalid uniform ${name}`);commands[name]={kind:key,args};};
  if(key.startsWith('create'))return ()=>({});
  if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,next++);return constants.get(key);}
  return ()=>{};
}});
globalThis.innerWidth=64;globalThis.innerHeight=64;globalThis.devicePixelRatio=1;
const canvas={clientWidth:64,clientHeight:64,width:64,height:64,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
const renderer=new Renderer(canvas),engine=new GameEngine(LEVELS),fixtures=[];
function snapshot(index,tier,width,height,seq=0,label=''){
  canvas.clientWidth=width;canvas.clientHeight=height;renderer.setQuality(tier);engine.reset(index);engine.state.seq=seq;commands={};renderer.draw(engine,DEFAULT_SETTINGS);
  fixtures.push({name:label||`room-${String(index+1).padStart(2,'0')}-${tier}`,tier,width:canvas.width,height:canvas.height,uniforms:commands});
}
for(const tier of ['low','medium','high','cinematic'])snapshot(0,tier,64,64,0,`quality-${tier}`);
for(let i=0;i<LEVELS.length;i++)snapshot(i,'low',64,64);
for(const i of [0,6,14,17,19,21])snapshot(i,'medium',384,240,0,`scene-${String(i+1).padStart(2,'0')}`);
snapshot(0,'medium',216,384,0,'scene-phone');snapshot(21,'medium',384,240,3,'scene-22-portal');
for(const i of [0,3,14,21])snapshot(i,'cinematic',384,240,i===21?3:0,`cinematic-${String(i+1).padStart(2,'0')}`);
snapshot(0,'cinematic',1280,720,0,'cinematic-materials');
// Expansion coverage uses the same composed catalog as the application.
for(let i=22;i<LEVELS.length;i++)snapshot(i,'low',512,320,0,`expansion-${i+1}`);
for(const id of [23,27,29,31,34,36,37,41,42])for(const tier of ['low','medium','high','cinematic'])snapshot(id-1,tier,512,320,0,`showcase-${id}-${tier}`);
for(const id of [23,31,34,42])snapshot(id-1,'medium',320,180,0,`portrait-${id}`);
snapshot(41,'cinematic',768,480,3,'expansion-final-portal');
const tiers=['low','medium','high','cinematic'];
const fragments={},surfaceFragments={};
function addProfile(key,tier,precision='highp',derivatives=false){
  const split=precision==='highp'&&['high','cinematic'].includes(tier);
  fragments[key]=fragmentShader(tier,precision,{derivatives,...(split?{pass:'shade'}:{})});
  if(split)surfaceFragments[key]=fragmentShader(tier,precision,{derivatives,pass:'surface'});
}
for(const tier of tiers)addProfile(tier,tier);
for(const tier of tiers)for(const precision of ['highp','mediump'])for(const derivatives of [false,true]){
  if(precision==='highp'&&!derivatives)continue;
  const variant=`${tier}-${precision}-${derivatives?'derivatives':'cone'}`;
  addProfile(variant,tier,precision,derivatives);
  const source=fixtures.find(f=>f.name===`quality-${tier}`);
  // Compile/link every combination. Half-float software JIT can take minutes per variant.
  // Pixel tests for those variants are opt-in; the report distinguishes compiled from drawn.
  if(precision==='highp'||process.argv.includes('--draw-mediump'))fixtures.push({...structuredClone(source),tier:variant,name:`variant-${variant}`});
}
// Identical physical state at two clocks: effects-off must yield identical pixels.
const still=structuredClone(fixtures.find(f=>f.name==='cinematic-04'));
still.uniforms.uLook.args[3]=0;still.uniforms.uMotion.args[0]=0;
for(const time of [0,3]){
  const frame=structuredClone(still);frame.name=`effects-off-${time}`;frame.uniforms.uTime.args[0]=time;fixtures.push(frame);
}
const comparisons=[['effects-off-0','effects-off-3']];
const reliefNoise={width:256,height:256,vertex:RELIEF_NOISE_VERTEX,fragment:RELIEF_NOISE_FRAGMENT};
for(const fixture of fixtures){fixture.uniforms.uReliefNoise={kind:'uniform1i',args:[0]};fixture.uniforms.uSurfaceHits={kind:'uniform1i',args:[1]};}
console.log(JSON.stringify({vertex:VERTEX_SHADER,fragments,surfaceFragments,fixtures,comparisons,reliefNoise}));
