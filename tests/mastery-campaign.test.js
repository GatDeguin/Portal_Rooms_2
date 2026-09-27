import test from 'node:test';
import assert from 'node:assert/strict';
import * as campaign from '../src/campaign.js';
import {insideRect,surfaceAt,activeTarget} from '../src/geometry.js';
import {SaveStore} from '../src/storage.js';
const {CAMPAIGN_LEVELS:levels,CHAPTERS}=campaign;
test('mastery appends rooms 43–62 in four chapters without renumbering',()=>{
 assert.equal(levels.length,62);assert.deepEqual(levels.map(r=>r.id),Array.from({length:62},(_,i)=>i+1));
 assert.equal(new Set(levels.map(r=>r.name)).size,62);
 assert.deepEqual(CHAPTERS.slice(8).map(c=>[c.id,c.first,c.last]),[[9,43,47],[10,48,52],[11,53,57],[12,58,62]]);
});
test('42-room save offers mastery and preserves records',()=>{
 const map=new Map(),adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const old=new SaveStore(adapter,42);for(let i=0;i<42;i++){old.startAttempt(i);old.complete(i,20+i);}
 const before=structuredClone(old.progress),next=new SaveStore(adapter,62);
 assert.equal(next.progress.current,41);assert.equal(next.progress.unlocked,43);
 for(const k of ['attempts','bestTimes','restarts'])assert.deepEqual(next.progress[k].slice(0,42),before[k]);
 assert.equal(campaign.expansionStart(next.progress),42);assert.equal(campaign.offerExpansion(next.progress),true);
 next.startAttempt(42);assert.equal(campaign.expansionStart(next.progress),null);
});
test('original completion still offers room 23',()=>{
 const s=new SaveStore(null,62);for(let i=0;i<22;i++){s.startAttempt(i);s.complete(i,10);}
 assert.equal(campaign.expansionStart(s.progress),22);s.startAttempt(22);assert.equal(campaign.expansionStart(s.progress),null);
});
test('requested walls seal bypasses and room31 has recovery pad',()=>{
 const wall=levels[4].obstacles[0];assert.ok(wall.z+wall.d/2>=3.2);
 for(const id of [16,19])for(const o of levels[id-1].obstacles){assert.ok(o.x-o.w/2<=-3.2);assert.ok(o.x+o.w/2>=3.2);}
 const p=levels[16].platforms[0];assert.ok(p.x-p.w/2<=-3.2);
 assert.ok(levels[30].jumpPads.some(p=>p.x>1.5&&p.z>.8));
});
for(let id=43;id<=62;id++)test(`mastery ${id}: capacity, bounds, spawn, goal support`,()=>{
 const r=levels[id-1];assert.ok(r,`missing ${id}`);assert.ok(Object.isFrozen(r));assert.ok(r.name&&r.lesson&&r.hint&&r.objective);
 for(const [key,max] of [['obstacles',6],['ramps',3],['platforms',4],['bumpers',3],['cloths',2]])assert.ok((r[key]??[]).length<=max,key);
 assert.ok(r.zones.length+r.jumpPads.length<=8);
 for(const o of [...r.obstacles,...r.platforms,...r.ramps])for(const axis of ['x','z'])assert.ok(Math.abs(o[axis])+(o.move?.axis===axis?o.move.amp:0)+(axis==='x'?o.w:o.d)/2<=3.2+1e-8,`${axis} extent`);
 for(const o of r.obstacles)assert.ok(!insideRect(...r.start,o,.24),'spawn in wall');
 for(const p of r.jumpPads)assert.ok(Math.hypot(r.start[0]-p.x,r.start[1]-p.z)>p.r+.24,'spawn on pad');
 for(let seq=0;seq<(r.sequence?.length??1);seq++){const t=activeTarget(r,seq,0);assert.ok(t.pos.every(n=>Math.abs(n)<2.96));
 for(const [dx,dz] of [[0,0],[.48,0],[-.48,0],[0,.48],[0,-.48]])assert.ok(Math.abs(surfaceAt(r,t.pos[0]+dx,t.pos[1]+dz,0).height-(t.y??0))<.001,`unsupported goal ${seq}`);}
});
test('new platforms and the repaired finale leave no sub-cube gaps at room walls',()=>{
 for(const r of [levels[41],...levels.slice(42)])for(const p of r.platforms)for(const axis of ['x','z']){
  const half=(axis==='x'?p.w:p.d)/2,amp=p.move?.axis===axis?p.move.amp:0;
  for(const side of [-1,1]){
   const gap=3.2-(side*p[axis]+half+amp);
   assert.ok(gap<1e-8||gap>=.48-1e-8,'room '+r.id+' '+axis+' wall gap '+gap);
  }
 }
});
