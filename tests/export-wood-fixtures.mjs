// Execute the real timber evaluators; only the probe camera/main is test-specific.
import {execFileSync} from 'node:child_process';
import {fragmentShader} from '../src/shaders.js';
const base=JSON.parse(execFileSync(process.execPath,['tests/export-render-fixtures.mjs'],{encoding:'utf8',maxBuffer:8e6}));
const template=base.fixtures.find(f=>f.name==='cinematic-materials');
const fragments={},fixtures=[];
const main=`void main(){
  vec3 p=vec3(vUv.x*6.0-3.,0.,vUv.y*6.0-3.);
  gFootprint=.006;
  vec3 a,e,n;float r,s;vec4 layers;
  surfaceMaterial(1.,p,vec3(0,1,0),a,r,s,e,layers,n);
  bool valid=all(greaterThanEqual(a,vec3(0)))&&all(lessThanEqual(a,vec3(.65)))&&r>=.45&&r<=.85&&
    layers.x==0.&&layers.y<=.11&&dot(n,n)>.99&&dot(n,n)<1.01&&n.y>.98;
  vec3 color=uPulse.w<.5?pow(a,vec3(.454545)):(uPulse.w<1.5?vec3(r,layers.y,layers.z):n*.5+.5);
  gl_FragColor=vec4(color,valid?1.:0.);
}`;
const swap=(src,body)=>src.slice(0,src.lastIndexOf('void main(){'))+body;
for(const [tier,precision] of [['low','highp'],['medium','highp'],['high','highp'],['cinematic','highp'],['low','mediump'],['cinematic','mediump']]){
 const k=tier+'-'+precision;fragments[k]=swap(fragmentShader(tier,precision),main);
 for(const [channel,index] of [['color',0],['response',1],['normal',2]]){
  const f=structuredClone(template);Object.assign(f,{name:k+'-'+channel,tier:k,width:384,height:384,diagnostic:true});f.uniforms.uRes.args=[384,384];f.uniforms.uPulse.args=[0,0,0,index];fixtures.push(f);
 }
}
fragments.filter=swap(fragmentShader('cinematic'),`void main(){gFootprint=.15;vec2 slope;vec4 a=woodAnatomy(vec2(vUv.x*6.,vUv.y*2.),.4,slope);gl_FragColor=vec4(woodRingFilter(vUv.x*15.,40.,.19),a.y+.5,a.z,1.);}`);
fixtures.push({...structuredClone(template),name:'wood-filter',tier:'filter',width:192,height:96,diagnostic:true});
console.log(JSON.stringify({vertex:base.vertex,fragments,fixtures,comparisons:[]}));
