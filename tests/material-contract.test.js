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
// metadata, pinch-operated menus and the reviewed audio redesign (2026-09-26).
// Audio, UI and audio preferences changed; rendering, physics, geometry, levels
// and input remain pinned; worker changes only transport the displayed camera.
const preserved={"src/physics.js":"d1ea9637c2625e1160a26c3355a93fd134a7ba07f628c18f816f6753c57548e5","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"17f3c8d15b395fe9fce078ed0b691f00f16dc85ee124ccd2c1af5eea23beecb3","src/levels-expansion.js":"3a27b8f755833b2f29da4360016cab7fcc5841c5fea33430742f7d2b4de6a1e3","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"cd31f289c651ce2884fcaec3e159f5e52eb0c265db6460e7215ae55337136fa2","src/campaign.js":"566c36e38e83611a4f6c9671d30fab7193bf5829d2f819077128f4d7f4fc35a7","src/renderer.js":"5a2aa2b247b6fc61527c20b85b5805581578f25a36a1c3dd33b114a0eeef3b38","src/renderer-client.js":"ffb0487e6f518fbc9cf6d2e07c9942ef2bb6d21ca0ce36d0b136ab86a036fddb","src/renderer-worker.js":"68539e069fb3c3147c4eff675bdf6a237fa3f1c5dcdbadb7ef0d6e0d56503bee","src/quality.js":"46c20d1611308de8f3fbf2052763babf56168a79ac40621b7f75e0771573e888","src/app.js":"24238f41e7ab4f9f48904c0e97719b360d08de1d5f471a1e138b43912c3c68fe","src/ui.js":"953bf786034582b8a71085eb3e55e6cec252d7a2c501dbced5da2884be5bbec2","src/audio.js":"2d5af0c334a95da8807aef74287bb27cf09e8d8133e7f3c3b9ca612da80923b7","index.html":"80e9b634e10de6cf75ba71ff342c9338438e42cf650121e7d9959966675a8bd9","styles/game.css":"cf14650f87beb098720829fa1657ab2cd7478a4bb12561bf033839f36e6042dd"};
for(const [path,hash] of Object.entries(preserved))test(`render stability preserves the reviewed contract for ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
