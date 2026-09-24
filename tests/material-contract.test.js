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

// Reviewed runtime hashes advance only for the explicit hand-interaction integration.
// Gameplay physics/input/geometry/levels and renderer/shaders keep their protected baselines.
// App, HTML and CSS advance for the MediaPipe controller, camera preview and hand controls.
const preserved={"src/physics.js":"d1ea9637c2625e1160a26c3355a93fd134a7ba07f628c18f816f6753c57548e5","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"17f3c8d15b395fe9fce078ed0b691f00f16dc85ee124ccd2c1af5eea23beecb3","src/levels-expansion.js":"3a27b8f755833b2f29da4360016cab7fcc5841c5fea33430742f7d2b4de6a1e3","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"45c33ef17264de41587c47f80b5039346834723b2c2a794d78e93c55e9eb481c","src/campaign.js":"566c36e38e83611a4f6c9671d30fab7193bf5829d2f819077128f4d7f4fc35a7","src/renderer.js":"5a2aa2b247b6fc61527c20b85b5805581578f25a36a1c3dd33b114a0eeef3b38","src/renderer-client.js":"168f3a847f11e7acd56b86afd54a16785cf05219f3657d87aec1822d281b712b","src/renderer-worker.js":"15a90f869c4bd938e2e85b228e638044f2fa33a9e3158aef0e436fcc670d2a2f","src/quality.js":"46c20d1611308de8f3fbf2052763babf56168a79ac40621b7f75e0771573e888","src/app.js":"a7a5f455f89e7e0aa4daa7c4f0a9fa4144b262c3b050bb029dcafb63b3b742f2","src/ui.js":"b229631c1170dc090a696121373ed66861018cd316876210218f1590f281607b","src/audio.js":"0722fc7efcdc74a8308624428b81844db42ba14c506620d8ed48e8ed0ebc7e63","index.html":"c10a0b86ffa042d3bc5f85325672f5341331fff9c66e7d3fc3cf458418ed39c6","styles/game.css":"f66f78cb2ad56d302ebf4d7f2051a482fcaf5457c840e151dae91cbc93801c23"};
for(const [path,hash] of Object.entries(preserved))test(`render stability preserves the reviewed contract for ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
