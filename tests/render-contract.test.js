import test from 'node:test';import assert from 'node:assert/strict';
import {fragmentShader} from '../src/shaders.js';
test('renderer supports all four platforms in the final room',()=>assert.match(fragmentShader('high'),/uPlat3/));
test('all shader quality variants retain the original perspective camera',()=>{for(const tier of ['low','medium','high']){const src=fragmentShader(tier);assert.match(src,/mix\(5\.78,5\.08,land\)/);assert.match(src,/float fov=mix\(1\.02,1\.34,land\)/);}});
test('renderer and physical ramp share projected span and raised base',()=>{const src=fragmentShader('medium');assert.match(src,/abs\(dir\.x\)\*r\.z\+abs\(dir\.y\)\*r\.w/);assert.match(src,/meta\.w\+along\*\(meta\.x-meta\.w\)/);});
test('presets use different constant shader budgets, not only display labels',()=>{assert.match(fragmentShader('low'),/#define STEPS 88/);assert.match(fragmentShader('high'),/#define STEPS 136/);});
