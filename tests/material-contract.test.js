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
// metadata, pinch-operated menus, audio, Atelier hands and level transitions.
// Reviewed material physics now covers water/slime/current/gel and cloth contact.
// Requested wall, recovery and floor-shape corrections are guarded by route tests.
// All other original/expansion layouts, input, storage and camera stay pinned separately.
// Presentation includes cloth meshes, cube transitions and late-worker redraws.
// GPU coverage: test:hand-render, test:transitions, test:living-materials.
// UI/app/CSS hashes include semantic UI motion; behavior is covered by test:motion.
// Physics, rendering, input, storage, catalog and audio hashes remain unchanged.
const preserved={"src/physics.js":"2c405ae50b35940dbb446521b89dd3778a341e11aaf67863226e916d993b467a","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"07f674ab10da73344480abee8a8485df65767acb9a80b3cbbc2e2ab0c4ff6860","src/levels-expansion.js":"83fea6bbd4397c213019bdb869a108f43105420f8f141558d3ef7203bdbb6e00","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"cd31f289c651ce2884fcaec3e159f5e52eb0c265db6460e7215ae55337136fa2","src/campaign.js":"dbd52c3a756539b1b973416e564b307068fa1087005c6b04ff1781b8a3b75b64","src/renderer.js":"7911c9681bef57217004434683af6c75752883ac4a810b54a57ab0522137d2cf","src/renderer-client.js":"95da9855797f84528afe25f71695cf219cbe344db91c66099432ed64fd85a6f0","src/renderer-worker.js":"e9e22b72d1bd526080dd91113613deb9fd7ade8e1ac02e6f191e76b3c075a3a1","src/quality.js":"46c20d1611308de8f3fbf2052763babf56168a79ac40621b7f75e0771573e888","src/app.js":"873ea78e5f2c74b0a9ce6f4463af62a4e93a5650d3a3dc5173e159f9ec7f383d","src/ui.js":"c83fb3577a24329606824ae8b9bcf60c1bd63ec19cbe664fa403a3c828c6ddbf","src/audio.js":"dac4e065f7235c4e39d57ce0d2c9ac499e1fe0499cbd6b889a0b7c74604aa563","index.html":"eb4ed30e02e4c0f2af6ef5ec2c54b0435ed84e2d80b470deabd8a60fda30e234","styles/game.css":"9257dc3e3dc46b521d2a1ab51e2b2af1d26bf32711377cc03792b0b1af4708d9"};
for(const [path,hash] of Object.entries(preserved))test(`render stability preserves the reviewed contract for ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
