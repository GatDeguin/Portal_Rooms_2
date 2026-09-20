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
test('wood change preserves all non-timber evaluators byte for byte',()=>{
 const regions=[[['void carpetMaterial(', 'void platformMaterial('],'f0eac9923aacf8937cd8892d890d4720eea405cc06a4274f426fe70292321383'],[['void jumpMaterial(', 'void surfaceMaterial('],'78227baee060fd66b5a445a704a9c8eacfd743e1bd1701dda53c7700ae1cf327']];
 for(const [[start,end],hash] of regions)assert.equal(digest(block(start,end)),hash);
});
