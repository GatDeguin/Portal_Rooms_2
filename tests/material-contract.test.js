import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fragmentShader} from '../src/shaders.js';
const families=['wood','carpet','wall','cube','obstacle','greenGoal','blueGoal','ring','light','trim','portal','ice','brake','boost','platform','jump','bumper'];
// Interface tests, not an assertion of visual quality. Native probes execute these functions.
test('each material family has a dedicated evaluator and the legacy interface remains available',()=>{
  const shader=fragmentShader('cinematic');
  for(const family of families)assert.match(shader,new RegExp(`void ${family}Material\\(`),family);
  assert.match(shader,/void material\(float m,vec3 p,vec3 n,out vec3 albedo,out float rough,out float spec,out vec3 emit\)/);
});
test('material compilation is deterministic in all 16 supported shader combinations',()=>{
  for(const tier of ['low','medium','high','cinematic'])for(const precision of ['highp','mediump'])for(const derivatives of [false,true]){
    assert.equal(fragmentShader(tier,precision,{derivatives}),fragmentShader(tier,precision,{derivatives}));
  }
});
test('layer response and object-relative coordinates are explicit shader interfaces',()=>{
  const shader=fragmentShader('cinematic');
  assert.match(shader,/void surfaceMaterial\(/);
  assert.match(shader,/void materialCoordinates\(/);
  assert.match(shader,/float filteredStripe\(/);
  assert.match(shader,/vec3 materialNoise\(/);
  assert.match(shader,/float coatRough/);
});
test('secondary material evaluation does not call the full microdetail evaluator',()=>{
  const shader=fragmentShader('cinematic');
  const body=shader.slice(shader.indexOf('vec3 quickMat('),shader.indexOf('vec2 march('));
  assert.doesNotMatch(body,/\bmaterial\(/);
  assert.doesNotMatch(body,/\bsurfaceMaterial\(/);
  assert.doesNotMatch(body,/\bfbm\(/);
});

// Reviewed snapshots include hand guides, camera diagnostics and presentation
// metadata (2026-09-26). Shader rendering, original physics, geometry, levels
// and input remain pinned; worker changes only transport the displayed camera.
const preserved={"src/physics.js":"d1ea9637c2625e1160a26c3355a93fd134a7ba07f628c18f816f6753c57548e5","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"17f3c8d15b395fe9fce078ed0b691f00f16dc85ee124ccd2c1af5eea23beecb3","src/levels-expansion.js":"3a27b8f755833b2f29da4360016cab7fcc5841c5fea33430742f7d2b4de6a1e3","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"5bf6111ac681a9f9d1b387443c9362b7d8a938084159c936b15d8ed20d9482fa","src/campaign.js":"566c36e38e83611a4f6c9671d30fab7193bf5829d2f819077128f4d7f4fc35a7","src/renderer.js":"5a2aa2b247b6fc61527c20b85b5805581578f25a36a1c3dd33b114a0eeef3b38","src/renderer-client.js":"ffb0487e6f518fbc9cf6d2e07c9942ef2bb6d21ca0ce36d0b136ab86a036fddb","src/renderer-worker.js":"68539e069fb3c3147c4eff675bdf6a237fa3f1c5dcdbadb7ef0d6e0d56503bee","src/quality.js":"46c20d1611308de8f3fbf2052763babf56168a79ac40621b7f75e0771573e888","src/app.js":"e7d90065322ccf7b4aed70cea0c6b90255a55621c16398332d57205349697d25","src/ui.js":"ed20f49704434d3c60888d48127ed59ab207d79ace18d96f2fe06fd785568459","src/audio.js":"0b3645e56320b5b0c48dd2e87e9fc697970edbc96f7d12908fe752d0b71afb5a","index.html":"4d68a323f344fea977c6cc4621fc7acba31fed7d8ffa2e5fd2b31eac0adf6d36","styles/game.css":"8f3e5cd50c06674886f65036511911c65e77c79dc5ef4a5ee4004be944057b41"};
for(const [path,hash] of Object.entries(preserved))test(`render stability preserves the reviewed contract for ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
