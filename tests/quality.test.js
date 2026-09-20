import test from 'node:test';import assert from 'node:assert/strict';
import {AdaptiveQuality,drawingSize,TIERS} from '../src/quality.js';
test('all quality profiles honor pixel budgets, including pathological aspect ratios',()=>{for(const tier of Object.keys(TIERS))for(const [w,h,dpr] of [[320,568,3],[1920,1080,2],[7680,4320,4],[2,1e9,4]]){const s=drawingSize(w,h,dpr,tier,1);assert.ok(s.width>=2&&s.height>=2);assert.ok(s.width*s.height<=TIERS[tier].pixels,`${tier}: ${s.width}x${s.height}`);}});
test('malformed resize arguments never produce NaN',()=>{const s=drawingSize({},NaN,Infinity,'bad',new Event('resize'));assert.ok(Number.isInteger(s.width)&&Number.isInteger(s.height));});
test('automatic quality degrades progressively under sustained pressure',()=>{const q=new AdaptiveQuality('auto');q.tier='high';assert.equal(q.sample(16),false);assert.equal(q.scale,1);for(let i=0;i<60;i++)q.sample(40);assert.equal(q.tier,'high');assert.ok(q.scale<1);for(let i=0;i<1200;i++)q.sample(40);assert.equal(q.tier,'low');assert.ok(q.scale<1);});
test('automatic quality does not bounce after a single fast frame',()=>{const q=new AdaptiveQuality('auto');q.sample(8);assert.equal(q.tier,'low');assert.equal(q.scale,1);});
test('fast quality recovery requires sustained headroom',()=>{const q=new AdaptiveQuality('auto');for(let i=0;i<800;i++)q.sample(16);assert.equal(q.tier,'high');});
test('explicit quality choice remains stable',()=>{for(const tier of ['low','medium','high','cinematic']){const q=new AdaptiveQuality(tier);for(let i=0;i<1000;i++)q.sample(40);assert.equal(q.tier,tier);assert.equal(q.scale,1);}});
test('very fast GPU samples promote Auto within bounded frame windows',()=>{const q=new AdaptiveQuality('auto');for(let n=0;n<360;n++)q.sample(2);assert.equal(q.tier,'medium');for(let n=0;n<360;n++)q.sample(2);assert.equal(q.tier,'high');for(let n=0;n<360;n++)q.sample(16);assert.equal(q.tier,'high');});


test('emergency scale reduces the capped pixel budget on large high-DPI viewports',()=>{
 for(const tier of Object.keys(TIERS))for(const [w,h,dpr] of [[1920,1080,2],[7680,4320,4]]){
  const full=drawingSize(w,h,dpr,tier,1),half=drawingSize(w,h,dpr,tier,.5);
  assert.ok(half.width*half.height<=full.width*full.height*.26,`${tier} scale must reduce actual pixels after the tier cap`);
  assert.ok(Math.abs(half.width/half.height-w/h)<.02);
 }
 const q=new AdaptiveQuality('auto');q.tier='high';q.sample(2000);
 const size=drawingSize(7680,4320,4,q.tier,q.scale);
 assert.ok(size.width*size.height<=TIERS.low.pixels*.25,'catastrophic recovery must use one quarter of Low pixel budget');
});
