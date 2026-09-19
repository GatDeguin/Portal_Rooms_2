import test from 'node:test';import assert from 'node:assert/strict';
import {AdaptiveQuality,drawingSize,TIERS} from '../src/quality.js';
test('all quality profiles honor pixel budgets, including pathological aspect ratios',()=>{for(const tier of Object.keys(TIERS))for(const [w,h,dpr] of [[320,568,3],[1920,1080,2],[7680,4320,4],[2,1e9,4]]){const s=drawingSize(w,h,dpr,tier,1);assert.ok(s.width>=2&&s.height>=2);assert.ok(s.width*s.height<=TIERS[tier].pixels,`${tier}: ${s.width}x${s.height}`);}});
test('malformed resize arguments never produce NaN',()=>{const s=drawingSize({},NaN,Infinity,'bad',new Event('resize'));assert.ok(Number.isInteger(s.width)&&Number.isInteger(s.height));});
test('automatic quality degrades under sustained pressure',()=>{const q=new AdaptiveQuality('auto');for(let i=0;i<1200;i++)q.sample(40);assert.equal(q.tier,'low');assert.ok(q.scale<1);});
test('automatic quality does not bounce after a single fast frame',()=>{const q=new AdaptiveQuality('auto');q.sample(8);assert.equal(q.tier,'medium');assert.equal(q.scale,1);});
test('fast quality recovery requires sustained headroom',()=>{const q=new AdaptiveQuality('auto');for(let i=0;i<500;i++)q.sample(16);assert.equal(q.tier,'high');});
test('explicit quality choice remains stable',()=>{for(const tier of ['low','medium','high','cinematic']){const q=new AdaptiveQuality(tier);for(let i=0;i<1000;i++)q.sample(40);assert.equal(q.tier,tier);assert.equal(q.scale,1);}});
