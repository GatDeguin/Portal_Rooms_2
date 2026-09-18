import test from 'node:test';import assert from 'node:assert/strict';
import {fragmentShader} from '../src/shaders.js';
import {readFileSync} from 'node:fs';
test('obstacle and zone metadata preserve physical elevation in the renderer',()=>{const source=fragmentShader();assert.match(source,/uObsMeta0/);assert.match(source,/uZoneMeta0/);assert.match(source,/meta\.x/);});
test('future sequence markers and separate cosmetic time are present',()=>{const source=fragmentShader();assert.match(source,/uGhost3/);assert.match(source,/uFxTime/);});
test('HTML contains preview-before-play, help and three accessible settings tabs',()=>{const html=readFileSync('index.html','utf8');for(const id of ['previewPlayBtn','helpDialog','settings-controls','settings-scene','settings-audio'])assert.ok(html.includes(`id="${id}"`));assert.match(html,/role="tablist"/);});

test('soft shadows sample props, not convex room boundaries',()=>{
  const source=fragmentShader('medium');
  assert.ok(source.includes('float shadowScene(vec3 p)'));
  assert.ok(source.includes('shadowScene(ro+rd*t)'));
});
test('portal interior sits in front of the rear wall',()=>{
  const source=fragmentShader('medium');
  assert.ok(source.includes('pp-vec3(0,0,.015)'));
});
