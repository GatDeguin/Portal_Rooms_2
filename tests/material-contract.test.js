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
// Static level geometry, objectives, input, storage and camera stay pinned separately.
// Presentation includes cloth meshes, cube transitions and late-worker redraws.
// GPU coverage: test:hand-render, test:transitions, test:living-materials.
const preserved={"src/physics.js":"0c4c383db2b28cf700d039063b789772169b7b7a6399ddac654e01fbdf840e07","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"12a46583ac57422f4df37aa2ad621c7ac4d7d13b86bef93e051f40c604b089a0","src/levels-expansion.js":"a96408da36e9a695a6264f2863c4fccd192d68a186354f52bbac30d07e04e704","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"cd31f289c651ce2884fcaec3e159f5e52eb0c265db6460e7215ae55337136fa2","src/campaign.js":"566c36e38e83611a4f6c9671d30fab7193bf5829d2f819077128f4d7f4fc35a7","src/renderer.js":"1456851dcf010d0d4bbcab215fb9bcfc3cb7d13522798ff3bfc400115a0cda43","src/renderer-client.js":"95da9855797f84528afe25f71695cf219cbe344db91c66099432ed64fd85a6f0","src/renderer-worker.js":"e9e22b72d1bd526080dd91113613deb9fd7ade8e1ac02e6f191e76b3c075a3a1","src/quality.js":"46c20d1611308de8f3fbf2052763babf56168a79ac40621b7f75e0771573e888","src/app.js":"dc5bb7675db268f9f6cbde5883609fa72a17d52dc8daf78fb9d7c3a74d523ebe","src/ui.js":"513713e7096b4b7a0b335ebff0f1cf9c6f4ca37a7c902546749f24b5de8d788a","src/audio.js":"dac4e065f7235c4e39d57ce0d2c9ac499e1fe0499cbd6b889a0b7c74604aa563","index.html":"80e9b634e10de6cf75ba71ff342c9338438e42cf650121e7d9959966675a8bd9","styles/game.css":"cf14650f87beb098720829fa1657ab2cd7478a4bb12561bf033839f36e6042dd"};
for(const [path,hash] of Object.entries(preserved))test(`render stability preserves the reviewed contract for ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
