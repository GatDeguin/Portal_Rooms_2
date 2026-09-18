import test from 'node:test';import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';import {SaveStore,normalizeSettings} from '../src/storage.js';
const presentation=await import('../src/presentation.js').catch(()=>({}));
test('every room preview is derived from its geometry and uses a unique accessible title',()=>{
  assert.equal(typeof presentation.previewSVG,'function');
  for(const l of LEVELS){const svg=presentation.previewSVG(l,{prefix:'test'});assert.match(svg,/<svg/);assert.match(svg,/role="img"/);assert.match(svg,new RegExp(`Sala ${l.id}`));assert.equal((svg.match(/data-preview="goal"/g)??[]).length,l.sequence?.length??1);assert.equal((svg.match(/data-preview="platform"/g)??[]).length,l.platforms.length);}
});
test('hints escalate and clamp instead of revealing everything at once',()=>{assert.equal(typeof presentation.hintFor,'function');assert.equal(presentation.hintFor(LEVELS[0],0).text,LEVELS[0].hints[0]);assert.equal(presentation.hintFor(LEVELS[0],999).text,LEVELS[0].hints[2]);});
test('sequence data distinguishes previous, active and future goals',()=>{assert.equal(typeof presentation.sequenceSteps,'function');assert.deepEqual(presentation.sequenceSteps(LEVELS[4],1).map(s=>s.status),['complete','active','pending']);});
test('effects and volume are validated, with reduced-motion default',()=>{assert.equal(normalizeSettings({volume:3,effects:true}).volume,1);assert.equal(normalizeSettings({},true).effects,false);});
test('new course archives old times once and preserves unlocked rooms',()=>{
 const map=new Map([['roomTiltGame.progress.v2',JSON.stringify({version:2,current:1,unlocked:2,completed:[0],bestTimes:[10]})]]);const adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const s=new SaveStore(adapter);assert.equal(s.progress.unlocked,2);assert.equal(s.progress.bestTimes[0],null);assert.equal(s.progress.legacyBestTimes[0],10);
 s.complete(0,12);const restored=new SaveStore(adapter);assert.equal(restored.progress.bestTimes[0],12);assert.equal(restored.progress.legacyBestTimes[0],10);
});
test('explicit reset clears archived-record notices with the records',()=>{
 const adapter={getItem:k=>k.endsWith('progress.v2')?JSON.stringify({version:2,current:0,unlocked:2,completed:[0],bestTimes:[10]}):null,setItem(){}};
 const store=new SaveStore(adapter);assert.equal(store.courseMigrated,true);
 store.resetProgress();assert.equal(store.courseMigrated,false);assert.ok(store.progress.legacyBestTimes.every(t=>t===null));
});
