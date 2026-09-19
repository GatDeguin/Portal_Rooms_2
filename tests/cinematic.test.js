import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TIERS,AdaptiveQuality,drawingSize} from '../src/quality.js';
import {normalizeSettings,SaveStore} from '../src/storage.js';
import {fragmentShader} from '../src/shaders.js';

test('cinematic is a distinct explicit budget, not an automatic promotion',()=>{
  assert.ok(TIERS.cinematic,'missing cinematic tier');
  for(const key of ['pixels','dpr','steps','shadows','ao','reflections','fog','octaves'])assert.ok(TIERS.cinematic[key]>TIERS.high[key],key);
  const q=new AdaptiveQuality('cinematic');for(let i=0;i<1500;i++)q.sample(40);assert.equal(q.tier,'cinematic');
  const auto=new AdaptiveQuality('auto');for(let i=0;i<20000;i++)auto.sample(10);assert.equal(auto.tier,'high');
  const size=drawingSize(3840,2160,3,'cinematic');assert.ok(size.width*size.height<=TIERS.cinematic.pixels);
});
test('cinematic and effects survive settings storage without touching progress',()=>{
  assert.equal(normalizeSettings({quality:'cinematic',effects:false}).quality,'cinematic');
  assert.equal(normalizeSettings({effects:false}).effects,false);
  const store=new SaveStore(),before=structuredClone(store.progress);store.setSettings({quality:'cinematic',effects:false});
  const restored=new SaveStore({getItem:key=>store.memory.get(key.replace('roomTiltGame.',''))??null});
  assert.equal(restored.settings.quality,'cinematic');assert.equal(restored.settings.effects,false);assert.deepEqual(store.progress,before);
});
test('cinematic has bounded extras and preserves the camera and geometry',()=>{
  const s=fragmentShader('cinematic');assert.match(s,/#define STEPS 176/);assert.match(s,/#define GI_STEPS 3/);
  assert.match(s,/mix\(5\.78,5\.08,land\)/);assert.match(s,/float fov=mix\(1\.02,1\.34,land\)/);assert.match(s,/uPlat3/);
  assert.match(s,/sdRoundBox\(cp,vec3\(\.245\),\.038\)/);assert.match(fragmentShader('low'),/#define GI_STEPS 0/);
});
test('derivatives are opt-in and a portable shader remains available',()=>{
  assert.doesNotMatch(fragmentShader('high'),/#extension GL_OES_standard_derivatives/);
  assert.match(fragmentShader('cinematic','highp',{derivatives:true}),/#extension GL_OES_standard_derivatives : enable/);
  assert.match(fragmentShader('cinematic','mediump'),/precision mediump float/);
});
test('the output has stable grain, filtered detail and physically inspired shading',()=>{
  const s=fragmentShader('cinematic');assert.doesNotMatch(s,/gl_FragCoord\.xy\+uTime\*17/);
  for(const name of ['fresnelSchlick','distributionGGX','smithG1','detailWeight','cubeLocal','portalEnergy'])assert.ok(s.includes(name),name);
  assert.match(s,/aces\(/);assert.doesNotMatch(s,/#version 300/);
});
test('the cinematic option is presented honestly',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<option value="cinematic">Cinemática<\/option>/);
  assert.doesNotMatch(html,/DLSS.*activad/i);
});
