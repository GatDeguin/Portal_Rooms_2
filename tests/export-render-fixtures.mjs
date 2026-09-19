// Exercise production uniform packing independently from the browser.
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';
import {LEVELS} from '../src/levels.js';
import {DEFAULT_SETTINGS} from '../src/storage.js';
import {VERTEX_SHADER,fragmentShader} from '../src/shaders.js';
let commands={};let next=1;const constants=new Map();
const gl=new Proxy({}, {get:(_,key)=>{
  if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
  if(key==='getParameter')return ()=>[8192,8192];
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
const tiers=['low','medium','high','cinematic'];
const fragments=Object.fromEntries(tiers.map(t=>[t,fragmentShader(t)]));
for(const tier of tiers)for(const precision of ['highp','mediump'])for(const derivatives of [false,true]){
  if(precision==='highp'&&!derivatives)continue;
  const variant=`${tier}-${precision}-${derivatives?'derivatives':'cone'}`;
  fragments[variant]=fragmentShader(tier,precision,{derivatives});
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
console.log(JSON.stringify({vertex:VERTEX_SHADER,fragments,fixtures,comparisons}));
