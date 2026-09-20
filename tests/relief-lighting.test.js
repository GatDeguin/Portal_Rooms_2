import test from 'node:test';
import assert from 'node:assert/strict';
import {fragmentShader} from '../src/shaders.js';
function body(source,name){
 const start=source.indexOf('{',source.indexOf('void '+name+'('));
 assert.ok(source.includes('void '+name+'('),`Missing ${name}`);
 let depth=1,end=start+1;for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
 return source.slice(start+1,end-1);
}
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,b)=>a.map(x=>x*b),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Execute the actual GLSL helper's scheduling and arithmetic on CPU. Only vector
// operators/types are lowered; the sample order and branch bounds come from GLSL.
function cpuHelper(){
 let code=body(fragmentShader('high','highp',{pass:'shade'}),'reliefLighting');
 code=code.replace(/^\s*#.*$/gm,'').replace(/\b(?:vec[23]|float|int)\s+(?=\w+\s*=)/g,'let ')
  .replace('q+axis*(side*stepSize)','add(q,mul(axis,side*stepSize))')
  .replace('q+light*distance','add(q,mul(light,distance))')
  .replace('gradient+=axis*(side*height)','gradient=add(gradient,mul(axis,side*height))')
  .replace('gradient/=2.*stepSize','gradient=mul(gradient,1/(2.*stepSize))');
 const run=new Function('m','q','extent','seed','normal','keyLight','rimLight','surfaceInset','reliefDepth','gReliefFootprint','add','mul','dot','smoothstep','max','min','mod','float','vec3','vec2','mix',
  'let gradient,visibility;'+code+';return {gradient,visibility};');
 return (q,n,k,r,footprint,height,enabled=true)=>run(1,q,[1,1,1],0,n,k,r,(_,p)=>height(p),()=>enabled?1:0,footprint,add,mul,dot,smoothstep,Math.max,Math.min,(a,b)=>a%b,Number,(...v)=>v.length===1?[v[0],v[0],v[0]]:v,x=>({x,y:x}),(a,b,t)=>({x:a.x*(1-t.x)+b.x*t.x,y:a.y*(1-t.y)+b.y*t.y}));
}
test('shade uses one 15-sample height site while combined diagnostic wrappers remain compatible',()=>{
 const split=fragmentShader('high','highp',{pass:'shade'}),combined=fragmentShader('high');
 const helper=body(split,'reliefLighting');
 assert.equal((helper.match(/\bsurfaceInset\(/g)||[]).length,1);
 assert.match(helper,/for\(int i=0;i<15;i\+\+\)/);
 assert.doesNotMatch(helper,/materialCoordinates|mapScene|gFootprint\s*=/);
 assert.match(split,/vec3 gradient=gSurfaceGradient/);
 assert.match(split,/visibility\*=reliefLightVisibility\.x/);
 assert.match(split,/rimShadow\*=reliefLightVisibility\.y/);
 assert.match(split,/localNormal=qrot\(iq,geometric\);keyLight=qrot\(iq,keyLight\);rimLight=qrot\(iq,rimLight\)/);
 assert.match(combined,/vec3 gradient=reliefGradient\(m,q,extent,seed\)/);
 assert.match(combined,/visibility\*=reliefVisibility\(m,p,geometric,normalize\(ld\)\)/);
});
test('shared samples preserve central gradient and both original visibility formulas',()=>{
 const run=cpuHelper();let randomState=731;
 const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296);
 for(let sample=0;sample<500;sample++){
  const q=Array.from({length:3},()=>random()*4-2),normal=Array.from({length:3},()=>random()*2-1);
  const key=Array.from({length:3},()=>random()*2-1),rim=Array.from({length:3},()=>random()*2-1),footprint=random()*.1;
  const height=p=>.006*(Math.sin(p[0]*37+p[1]*13)*Math.cos(p[2]*29)+1);
  const step=Math.max(.0015,footprint*.5),gradient=[0,0,0];
  for(let axis=0;axis<3;axis++){const plus=[...q],minus=[...q];plus[axis]+=step;minus[axis]-=step;gradient[axis]=(height(plus)-height(minus))/(2*step);}
  const visibility=light=>{let v=1;for(let i=1;i<=4;i++){const distance=i*.004;v=Math.min(v,smoothstep(-.0015,.0005,dot(normal,light)*distance+height(add(q,mul(light,distance)))-height(q)));}return .4*(1-v)+v;};
  let count=0;const result=run(q,normal,key,rim,footprint,p=>{count++;return height(p);});
  assert.equal(count,15);
  result.gradient.forEach((x,i)=>assert.ok(Math.abs(x-gradient[i])<1e-12));
  assert.ok(Math.abs(result.visibility.x-visibility(key))<1e-12);
  assert.ok(Math.abs(result.visibility.y-visibility(rim))<1e-12);
 }
 let count=0;const off=run([0,0,0],[0,1,0],[1,0,0],[0,0,1],.01,()=>{count++;return 0;},false);
 assert.equal(count,0);assert.deepEqual(off,{gradient:[0,0,0],visibility:{x:1,y:1}});
});
