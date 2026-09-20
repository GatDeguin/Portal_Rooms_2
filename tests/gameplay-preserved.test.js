import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Pinned to the active runtime at 32573266071065b15969f183d0721c507a3f3e2a.
// These are visual-only change guards, not substitutes for input-only course tests.
const baseline={"src/physics.js": "d1ea9637c2625e1160a26c3355a93fd134a7ba07f628c18f816f6753c57548e5", "src/levels.js": "17f3c8d15b395fe9fce078ed0b691f00f16dc85ee124ccd2c1af5eea23beecb3", "src/geometry.js": "c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb", "src/input.js": "e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b"};
for(const [path,hash] of Object.entries(baseline))test(`${path} remains byte-identical to the original gameplay`,()=>assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),hash));
const source=readFileSync(new URL('../src/shaders.js',import.meta.url),'utf8');
test('all SDF shapes and the unexcluded scene union preserve the original geometry',()=>{
  // Strip only rendering exclusion gates / their instance keys. Every primitive,
  // coordinate, dimension and union order must still match the original hash.
  const geometry=source.slice(source.indexOf('vec3 qrot('),source.indexOf('vec3 normalAt('))
    .replace(/if\((?:includeCandidate|includeSceneCandidate)\(\d+\.\)\)/g,'')
    .replace(/  if\(!(?:includeCandidate|includeSceneCandidate)\(700\.\)\)return r;\n/g,'')
    .replace(/,\d{3,4}\)\}/g,')}');
  assert.equal(digest(geometry),'985463a802ead20be7ba2bfeb71ce53dcee3a4ee1bf5236e2f273bef1262fbf0');
});

test('cameraRay remains byte-identical',()=>assert.equal(digest(source.slice(source.indexOf('vec3 cameraRay('),source.indexOf('vec3 aces('))),'d244849c2c30a1c33b06f8334ce076b175b6f9541a50bba896da7faa40bf66ac'));
