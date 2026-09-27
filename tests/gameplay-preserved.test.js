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
test('neutral transition preserves all SDF shapes and the original scene geometry',()=>{
  // Evaluate the presentation-only cube transform at its neutral uniform (1,0,0,0).
  // Strip rendering exclusion gates / their instance keys. Every primitive,
  // coordinate, dimension and union order must still match the original hash.
  const geometry=source.slice(source.indexOf('vec3 qrot('),source.indexOf('vec3 normalAt('))
    .replaceAll('cubeCenter()','vec3(uCube.x,.255+uCubeY,uCube.y)')
    // Neutral spring state is the original cylinder; animated gel is tested separately.
    .replace(/\/\/ Bounded affine squash[\s\S]*?vec2 bumperObj[^\n]*\n/,"vec2 bumperObj(vec3 p,vec4 b){if(b.z<.01)return vec2(100,0);float h=max(b.w,.34);return vec2(sdCyl(p-vec3(b.x,h*.5,b.y),b.z,h*.5),22.);}\n")
    .replaceAll('bumperObj(p,uBump${i},uBumpFx${i},uBumpWarp${i})','bumperObj(p,uBump${i})')
    .replaceAll('*cubeScale()','').replace('||uTransition.x<.008','')
    .replace(/if\((?:includeCandidate|includeSceneCandidate)\(\d+\.\)\)/g,'')
    .replace(/  if\(!(?:includeCandidate|includeSceneCandidate)\(700\.\)\)return r;\n/g,'')
    .replace(/,\d{3,4}\)\}/g,')}');
  assert.equal(digest(geometry),'985463a802ead20be7ba2bfeb71ce53dcee3a4ee1bf5236e2f273bef1262fbf0');
});

test('cameraRay remains byte-identical',()=>assert.equal(digest(source.slice(source.indexOf('vec3 cameraRay('),source.indexOf('vec3 aces('))),'d244849c2c30a1c33b06f8334ce076b175b6f9541a50bba896da7faa40bf66ac'));

const levelGeometry=levels=>levels.map(({name,objective,hint,lesson,...room})=>room);
test('src/levels.js retains every authored physical layout and objective position',async()=>{const mod=await import('../src/levels.js');assert.equal(digest(JSON.stringify(levelGeometry(mod.LEVELS))), 'e051b47b488b97a7bd7cadcc86d85e75ccee90f44b44df3462b81286c492b0b2');});
test('src/levels-expansion.js retains every authored physical layout and objective position',async()=>{const mod=await import('../src/levels-expansion.js');assert.equal(digest(JSON.stringify(levelGeometry(mod.EXPANSION_LEVELS))), '55c201948d46eb58d6b9d383399163941831cefc0034256ac186b1c684355c7e');});
