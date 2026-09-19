// A test-only calibration room using the real renderer, SDF and original camera.
// The lab is NOT appended to the campaign. Fixtures may set poses; they are not course tests.
import {Renderer} from '../src/renderer.js';
import {GameEngine} from '../src/physics.js';
import {DEFAULT_SETTINGS} from '../src/storage.js';
import {VERTEX_SHADER,fragmentShader} from '../src/shaders.js';
import {Q} from '../src/math.js';
let commands={},counter=1;const constants=new Map();
const gl=new Proxy({}, {get:(_,key)=>{
  if(key==='getExtension')return ()=>null;
  if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
  if(key==='getParameter')return ()=>[8192,8192];
  if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
  if(key==='getUniformLocation')return (_,name)=>name;
  if(key==='getAttribLocation')return ()=>0;
  if(key.startsWith('uniform'))return (name,...args)=>{commands[name]={kind:key,args};};
  if(key.startsWith('create'))return ()=>({});
  if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,counter++);return constants.get(key);}
  return ()=>{};
}});
globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
const canvas={clientWidth:1280,clientHeight:720,width:1280,height:720,getContext:()=>gl,addEventListener(){},removeEventListener(){}};
const room={id:1,start:[0,2.15],target:{type:3,pos:[1.65,-.8],y:.62},
 obstacles:[{x:-1.8,z:-.7,w:.70,d:1.3}],
 platforms:[{x:1.65,z:-.80,w:1.25,d:1.4,h:.62}],
 ramps:[{x:1.65,z:.75,w:1.25,d:1.7,h:.62,dx:0,dz:-1}],
 zones:[{x:-1.8,z:1.1,r:.58,type:1},{x:-.5,z:-1.2,r:.48,type:2},{x:.72,z:1.1,r:.45,type:3,dx:0,dz:-1}],
 jumpPads:[{x:-1.8,z:-2.15,r:.4,power:3}],bumpers:[{x:.18,z:-.48,r:.28,h:.55,strength:3.9}]};
const r=new Renderer(canvas),e=new GameEngine([room]),fixtures=[];
const modes=process.argv.includes('--mediump')?['low','cinematic']:['low','medium','high','cinematic'];
for(const tier of modes){
 r.setQuality(tier);e.reset(0);e.state.cube.q=Q.normalize([.12,.18,-.16,.96]);commands={};r.draw(e,{...DEFAULT_SETTINGS,dynamicCamera:false,effects:false});
 fixtures.push({name:'lab-'+tier,tier,width:canvas.width,height:canvas.height,uniforms:commands});
}
// Temporal reference: same shader and 0.015 radians of view-independent cube rotation per frame.
if(!process.argv.includes('--mediump')){
 canvas.clientWidth=640;canvas.clientHeight=360;r.setQuality('high');e.reset(0);
 for(let i=0;i<12;i++){
  e.state.cube.x=(i-5.5)*.012;e.state.cube.q=Q.axis(0,1,0,i*.015);commands={};r.draw(e,{...DEFAULT_SETTINGS,dynamicCamera:false,effects:false});
  fixtures.push({name:'motion-'+String(i).padStart(2,'0'),tier:'high',width:canvas.width,height:canvas.height,uniforms:commands});
 }
}
const precision=process.argv.includes('--mediump')?'mediump':'highp';
console.log(JSON.stringify({vertex:VERTEX_SHADER,fragments:Object.fromEntries(modes.map(t=>[t,fragmentShader(t,precision)])),fixtures,comparisons:[]}));
