import test from 'node:test';
import assert from 'node:assert/strict';
import {fragmentShader} from '../src/shaders.js';

// Follow GLSL calls, not just a direct-call string: hiding scene traversal behind
// a renamed wrapper must still fail this architectural cost regression.
function functions(source){
 const result=new Map();
 const signatures=/\b(?:float|vec[234]|void|bool|ReliefCandidate)\s+(\w+)\s*\([^{};]*\)\s*\{/g;
 for(const match of source.matchAll(signatures)){
  let depth=1,end=match.index+match[0].length;
  const start=end;
  for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  result.set(match[1],source.slice(start,end-1));
 }
 return result;
}
function closure(name,graph,seen=new Set()){
 if(seen.has(name))return seen;
 assert.ok(graph.has(name),`Missing GLSL function ${name}`);seen.add(name);
 for(const call of graph.get(name).matchAll(/\b(\w+)\s*\(/g))if(graph.has(call[1]))closure(call[1],graph,seen);
 return seen;
}
test('POM call graph evaluates one cached candidate and cannot traverse or select scene objects',()=>{
 const graph=functions(fragmentShader('cinematic'));
 const calls=closure('parallaxOcclusion',graph);
 assert.ok(calls.has('candidateReliefDistance'),'POM must evaluate the cached hit candidate');
 for(const name of calls){
  assert.ok(!['mapScene','mapReliefScene','materialCoordinates','opU','march','marchEnvelope','marchFrom'].includes(name),`POM reaches scene traversal through ${name}`);
  assert.doesNotMatch(graph.get(name),/\bu(?:Obs|Plat|Ramp|Bump|Zone)\d\b/,`${name} selects scene objects inside POM`);
 }
});
test('High and Cinematic keep bounded relief budgets, with no POM in cheaper or mediump profiles',()=>{
 for(const tier of ['low','medium','high','cinematic'])for(const precision of ['highp','mediump']){
  const source=fragmentShader(tier,precision),steps=Number(source.match(/#define POM_STEPS (\d+)/)[1]),refine=Number(source.match(/#define POM_REFINE (\d+)/)[1]);
  if(precision==='mediump'||['low','medium'].includes(tier))assert.equal(steps,0);
  else {assert.ok(steps>0&&steps<=(tier==='high'?8:14));assert.ok(refine<=(tier==='high'?3:4));}
 }
});
test('candidate relief retains depth and vertex color fields and does not duplicate the scene graph',()=>{
 const source=fragmentShader('cinematic'),graph=functions(source);
 assert.ok(closure('candidateReliefDistance',graph).has('surfaceInset'));
 assert.ok(graph.has('materialVertexColor'));
 assert.equal(graph.has('mapReliefScene'),false,'Remove the duplicate scene graph instead of leaving a future hot-path trap');
});


test('height samples do not mutate global shading state',()=>{
 const graph=functions(fragmentShader('cinematic'));
 for(const name of closure('surfaceInset',graph)){
  assert.doesNotMatch(graph.get(name),/\bg[A-Z]\w*\s*(?:[+*/-]?=(?!=)|\+\+|--)/,`${name} writes global state in a height sample`);
 }
});


test('split high-quality programs separate surface traversal from material lighting',()=>{
 for(const tier of ['high','cinematic']){
  const surface=functions(fragmentShader(tier,'highp',{pass:'surface'})),shade=functions(fragmentShader(tier,'highp',{pass:'shade'}));
  const surfaceCalls=closure('main',surface),shadeCalls=closure('main',shade);
  assert.ok(surfaceCalls.has('parallaxOcclusion'));
  assert.ok(!surfaceCalls.has('shade')&&!surfaceCalls.has('surfaceMaterial'),'surface preparation must not clone material lighting');
  assert.ok(shadeCalls.has('shade'));
  assert.equal(shade.get('includeSceneCandidate'),'return true;','secondary scene traversal must not carry primary instance state');
  assert.match(surface.get('includeSceneCandidate'),/includeCandidate/);
  assert.doesNotMatch(shade.get('main'),/depth=key>0/,'miss distance must survive the surface handoff for atmosphere');
  for(const name of ['march','marchEnvelope','marchFrom','parallaxOcclusion'])assert.ok(!shadeCalls.has(name),`shading pass still reaches primary ${name}`);
  assert.match(shade.get('main'),/gForcedCandidate=key/,'reconstruct the recorded instance rather than the nearest foreground');
  assert.match(shade.get('main'),/gForcedCandidate=0\./,'secondary rays must regain the complete scene');
 }
});
