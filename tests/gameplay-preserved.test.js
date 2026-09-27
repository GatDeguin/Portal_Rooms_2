import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Geometry and input stay pinned. Material physics and level copy were explicitly
// revised for water/slime/sand/gelatin; semantic level geometry is checked below.
const baseline={"src/geometry.js": "c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb", "src/input.js": "e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b"};
for(const [path,hash] of Object.entries(baseline))test(`${path} remains byte-identical to the original gameplay`,()=>assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),hash));
const source=readFileSync(new URL('../src/shaders.js',import.meta.url),'utf8');
// User-authorized shaped liquids and rubber caps have dedicated geometry tests.
// Remove only their function bodies/unions; every other primitive and scene union stays pinned.
function withoutZoneFunctions(text){
 for(const name of ['zoneObj','zoneDimensions','zoneRotation','zoneLocal','sdZoneFootprint','zonePlate','jumpCap','zoneBase']){
  const pattern=new RegExp('(?:float|vec[234]) '+name+'\\('),match=pattern.exec(text);if(!match)continue;
  let pos=text.indexOf('{',match.index),depth=1,end=pos+1;
  while(depth&&end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++;}
  text=text.slice(0,match.index)+text.slice(end);
 }
 return text;
}
function staticGeometry(text){
 let geometry=withoutZoneFunctions(text.slice(text.indexOf('vec3 qrot('),text.indexOf('vec3 normalAt(')))
  .replaceAll('cubeCenter()','vec3(uCube.x,.255+uCubeY,uCube.y)')
  .replace(/\/\/ Bounded affine squash[\s\S]*?vec2 bumperObj[^\n]*\n/,"vec2 bumperObj(vec3 p,vec4 b){if(b.z<.01)return vec2(100,0);float h=max(b.w,.34);return vec2(sdCyl(p-vec3(b.x,h*.5,b.y),b.z,h*.5),22.);}\n")
  .replaceAll('bumperObj(p,uBump${i},uBumpFx${i},uBumpWarp${i})','bumperObj(p,uBump${i})')
  .replaceAll('*cubeScale()','').replace('||uTransition.x<.008','')
  .replace(/if\((?:includeCandidate|includeSceneCandidate)\(\d+\.\)\)/g,'')
  .replace(/  if\(!(?:includeCandidate|includeSceneCandidate)\(700\.\)\)return r;\n/g,'')
  .replace(/,\d{3,4}\)\}/g,')}')
  .replace(/^.*objects\(8,i=>.*zoneObj.*$/gm,'')
  .replace(/\/\/[^\n]*/g,'').replace(/\s+/g,'');
 return geometry;
}
test('shaped liquids and jumpers preserve all unrelated static scene geometry',()=>assert.equal(digest(staticGeometry(source)), 'd26f407047719815d345b4a40ca9d7e23ad0961614ae4a58672780c3eac323ca'));

test('cameraRay remains byte-identical',()=>assert.equal(digest(source.slice(source.indexOf('vec3 cameraRay('),source.indexOf('vec3 aces('))),'d244849c2c30a1c33b06f8334ce076b175b6f9541a50bba896da7faa40bf66ac'));

const levelGeometry=levels=>levels.map(({name,objective,hint,lesson,...room})=>room);
test('unrequested original layouts and objective positions remain unchanged',async()=>{const mod=await import('../src/levels.js');assert.equal(digest(JSON.stringify(levelGeometry(mod.LEVELS.filter(l=>![5,7,8,10,16,17,19].includes(l.id))))), '3d55710e95febfb9c7655619f53c4bdc3629050814dc45747f7a3f39763065d0');});
test('unrequested expansion layouts and objective positions remain unchanged',async()=>{const mod=await import('../src/levels-expansion.js');assert.equal(digest(JSON.stringify(levelGeometry(mod.EXPANSION_LEVELS.filter(l=>![31,42].includes(l.id))))), 'f5b88c231b2c7b2cc303ac7c8f0b0df7705b92d9515836dc11ac8ecf0ce759d5');});
