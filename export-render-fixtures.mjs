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
for(const tier of ['low','medium','high'])snapshot(0,tier,64,64,0,`quality-${tier}`);
for(let i=0;i<LEVELS.length;i++)snapshot(i,'medium',480,300,0,`room-${String(i+1).padStart(2,'0')}`);
for(const i of [0,6,14,17,19,21])snapshot(i,'medium',384,240,0,`scene-${String(i+1).padStart(2,'0')}`);
snapshot(0,'medium',280,496,0,'scene-phone');
for(const i of [4,12,13,21])for(let seq=1;seq<LEVELS[i].sequence.length;seq++)snapshot(i,'medium',480,300,seq,`room-${String(i+1).padStart(2,'0')}-step-${seq+1}`);snapshot(21,'medium',384,240,3,'scene-22-portal');
console.log(JSON.stringify({vertex:VERTEX_SHADER,fragments:Object.fromEntries(['low','medium','high'].map(t=>[t,fragmentShader(t)])),fixtures}));
