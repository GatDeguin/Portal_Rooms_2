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

const preserved={"src/physics.js":"d1ea9637c2625e1160a26c3355a93fd134a7ba07f628c18f816f6753c57548e5","src/geometry.js":"c863e85b21e1553ec140ddd8919ffb555364eedfb1a442ee0facfb68592158cb","src/levels.js":"17f3c8d15b395fe9fce078ed0b691f00f16dc85ee124ccd2c1af5eea23beecb3","src/levels-expansion.js":"3a27b8f755833b2f29da4360016cab7fcc5841c5fea33430742f7d2b4de6a1e3","src/input.js":"e9c82c60d9b78b32b1a9fd42360aa490171faf87525a8246ee18ddbf1cf0833b","src/storage.js":"45c33ef17264de41587c47f80b5039346834723b2c2a794d78e93c55e9eb481c","src/campaign.js":"566c36e38e83611a4f6c9671d30fab7193bf5829d2f819077128f4d7f4fc35a7","src/renderer.js":"34f0b3f6a6684d075738c0838f6fc262a65d2c7283fb150051b14aee6973befe","src/renderer-client.js":"125cbfca3e84983406367916c700d447b1b2118ed8acd4c6b964fd5313610a06","src/renderer-worker.js":"2ac573485b3a8d38a93f70d4429737046e02ff93fd7be9cd294e9445200b03c4","src/quality.js":"76d097a9d78047bf63b2c393e63070e90413940096daa7548b66ee64125e1529","src/app.js":"77813b2832920c35b70b050132df32d94ecd2925e54ecd275c156795e88625f3","src/ui.js":"b808313e3bdc5f1241768f3fc66162aed4d47d8e402fd24553b24367b6d0c07d","src/audio.js":"0722fc7efcdc74a8308624428b81844db42ba14c506620d8ed48e8ed0ebc7e63","index.html":"b14f724520482b260357f9ea8f4352177991db7b2aa6fe58ad08b90b3f1d67b2","styles/game.css":"8d52035220bc6ae7343388a090f75c4a7849731b87e6a8f0e02aa497e99ad7e8"};
for(const [path,hash] of Object.entries(preserved))test(`materials-only change preserves ${path}`,()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash);
});

test('only the mediump primary march uses a precision-aware tolerance',()=>{
  assert.match(fragmentShader('low','mediump'),/if\(h\.x<max\(SURF_DIST,t\*\.0012\)\)/);
  assert.match(fragmentShader('low','highp'),/if\(h\.x<SURF_DIST\)/);
});
