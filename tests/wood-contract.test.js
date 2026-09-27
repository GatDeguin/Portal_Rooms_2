import test from 'node:test';
import assert from 'node:assert/strict';
import {fragmentShader} from '../src/shaders.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=readFileSync(new URL('../src/shaders.js',import.meta.url),'utf8');
const block=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
const digest=s=>createHash('sha256').update(s).digest('hex');
test('wood has one shared anatomical field for growth rings, fibre and pores',()=>{
 assert.match(fragmentShader('high'),/vec4 woodAnatomy\(/);
 assert.match(block('void woodMaterial(', 'void carpetMaterial('),/woodAnatomy\(/);
 assert.match(block('void platformMaterial(', 'void jumpMaterial('),/woodAnatomy\(/);
});
test('wood detail has per-board identity and footprint-aware latewood filtering',()=>{
 assert.match(fragmentShader('cinematic'),/float woodRingFilter\(/);
 assert.match(fragmentShader('cinematic'),/woodBoardCoordinates\(/);
 // Only timber evaluators belong to this guard; the intervening silhouette
 // height cache may sample its GPU lattice without texturing the wood anatomy.
 const body=block('float woodRingFilter(', '// A virtual color lattice')+block('void woodMaterial(', 'void carpetMaterial(')+block('void platformMaterial(', 'void jumpMaterial(');
 assert.doesNotMatch(body,/effectTime\(|uTime|texture2D|mapScene\(|fwidth\(/);
});
// Water/slime/sand, cube film, rubber jump caps and gelatin were explicitly revised; other evaluators stay pinned.
const unchangedMaterials={"carpet":"738b4bb74ea3caa61c2b545e4682d10db37e28ceb4e0ddfb6645f80399761afc","wall":"d5f9eff7950b066dcdcfc7649a1e7a0ac34f149f7f58211d44136aacafab33ea","obstacle":"194a09dce602513e87b4a2127072c60538b0bb27af7d096e038687b3e9295515","greenGoal":"69aaf1ae324e49762b799812d4aa1e113d2e8db509f0abf4f41aaa7d03253ae7","blueGoal":"b0289a21052db2ac0f99430b92b83a65f554b256c4c618723a39ac8132181e43","ring":"4926dca3fece97805fca82b9983c69d293500d588f90d7e5b77a073b3881673e","light":"917c42581dce497d6e21c7e5322c07cef0ffa15431b8620e0bbc0e103aa2ef99","trim":"b26e565dc870b8615a8a61e0602f9fef6bb9922872ff5bd5118f0ee420741960","portal":"0256490fd7f34918d199914589b46bd128b298a8247e4583e7ca691629c553bb"};
for(const [name,hash] of Object.entries(unchangedMaterials))test(name+' evaluator remains unchanged by the material physics update',()=>{
 const start=source.indexOf('void '+name+'Material('),brace=source.indexOf('{',start);let depth=1,end=brace+1;for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 assert.equal(digest(source.slice(start,end)),hash);
});
