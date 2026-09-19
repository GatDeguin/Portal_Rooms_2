import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS as ORIGINAL} from '../src/levels.js';
import {SaveStore} from '../src/storage.js';
import {insideRect,movingAt,surfaceAt,activeTarget} from '../src/geometry.js';
const mod=await import('../src/campaign.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const levels=mod.CAMPAIGN_LEVELS??[];

test('campaign appends exactly twenty frozen rooms and preserves original object identity',()=>{
  assert.equal(levels.length,42);assert.ok(Object.isFrozen(levels));
  for(let i=0;i<22;i++)assert.equal(levels[i],ORIGINAL[i]);
  assert.deepEqual(levels.map(l=>l.id),Array.from({length:42},(_,i)=>i+1));
  assert.equal(new Set(levels.map(l=>l.name)).size,42);
});
test('chapters cover all rooms once and preserve the four original lighting assignments',()=>{
  assert.equal(mod.CHAPTERS?.length,8);
  for(let i=0;i<42;i++){
    const matches=mod.CHAPTERS.filter(c=>i+1>=c.first&&i+1<=c.last);assert.equal(matches.length,1);
    assert.equal(mod.chapterForRoom(i+1),matches[0]);assert.ok([0,1,2,3].includes(mod.lookForRoom(i+1)));
    if(i<22)assert.equal(mod.lookForRoom(i+1),i<6?0:i<14?1:i<19?2:3);
  }
});
test('22/22 save expands to 42 with old records, counts and current room untouched',()=>{
  assert.equal(levels.length,42);const map=new Map();const adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const old=new SaveStore(adapter,22);for(let i=0;i<22;i++){old.startAttempt(i);old.complete(i,20+i);}const before=structuredClone(old.progress);
  const next=new SaveStore(adapter,levels.length);
  assert.equal(next.progress.current,21);assert.equal(next.progress.unlocked,23);
  for(const key of ['bestTimes','attempts','restarts'])assert.deepEqual(next.progress[key].slice(0,22),before[key]);
  assert.deepEqual(next.progress.bestTimes.slice(22),Array(20).fill(null));
  assert.equal(mod.offerExpansion(next.progress),true);assert.equal(next.progress.current,21);
  next.startAttempt(22);assert.equal(mod.offerExpansion(next.progress),false);next.complete(22,9);assert.equal(next.progress.unlocked,24);
});
test('partial saves, blocked storage and full completion use the composed catalog',()=>{
  assert.equal(levels.length,42);const partial=new SaveStore(null,42);partial.startAttempt(0);partial.complete(0,12);
  assert.equal(mod.offerExpansion(partial.progress),false);assert.equal(partial.select(22),false);
  const s=new SaveStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},42);
  for(let i=0;i<42;i++){assert.equal(s.startAttempt(i),true);s.complete(i,5+i);}
  assert.equal(s.progress.unlocked,42);assert.equal(s.progress.completed.length,42);s.resetProgress();assert.equal(s.progress.unlocked,1);
});
for(let id=23;id<=42;id++)test(`expansion room ${id}: capacity, safe spawn, nonoverlapping surfaces and supported goals`,()=>{
  const l=levels.find(room=>room.id===id);assert.ok(l,`missing room ${id}`);assert.ok(Object.isFrozen(l));assert.ok(l.name&&l.hint&&l.objective&&l.lesson);
  for(const [key,max] of [['obstacles',6],['ramps',3],['platforms',4],['bumpers',3]])assert.ok(l[key].length<=max,key);
  assert.ok(l.zones.length+l.jumpPads.length<=8);assert.ok(l.start.every(n=>Number.isFinite(n)&&Math.abs(n)<2.96));
  const boosts=l.zones.filter(z=>z.type===3);for(const b of boosts)assert.deepEqual([b.dx,b.dz],[boosts[0].dx,boosts[0].dz]);
  for(const pad of l.jumpPads){assert.equal(pad.y??0,0);assert.ok(Math.hypot(l.start[0]-pad.x,l.start[1]-pad.z)>pad.r+.24);}
  for(let i=0;i<l.zones.length;i++)for(let j=i+1;j<l.zones.length;j++)assert.ok(Math.hypot(l.zones[i].x-l.zones[j].x,l.zones[i].z-l.zones[j].z)>=l.zones[i].r+l.zones[j].r-.001,'overlapping material zones');
  for(const b of l.bumpers)assert.ok(Math.hypot(l.start[0]-b.x,l.start[1]-b.z)>b.r+.24,'spawn in bumper');
  for(const o of [...l.obstacles,...l.platforms,...l.ramps]){
    assert.ok([o.x,o.z,o.w,o.d].every(Number.isFinite));assert.ok(o.w>0&&o.d>0);
    for(const axis of ['x','z'])assert.ok(Math.abs(o[axis])+(o.move?.axis===axis?o.move.amp:0)+(axis==='x'?o.w:o.d)/2<=3.2+1e-8,'shape outside room');
  }
  for(const o of l.obstacles){assert.equal(o.h??.49,.49);for(let k=0;k<36;k++)assert.ok(!insideRect(...l.start,movingAt(o,k*.4),.24),'spawn swept by gate');}
  for(let k=0;k<16;k++)for(let seq=0;seq<(l.sequence?.length??1);seq++){
    const t=activeTarget(l,seq,k*.7);assert.ok([1,2,3,4].includes(t.type));assert.ok(t.pos.every(Number.isFinite));
    if(t.platform!==undefined)assert.ok(l.platforms[t.platform]);
    for(const [dx,dz] of [[0,0],[.49,0],[-.49,0],[0,.49],[0,-.49]])assert.ok(Math.abs(surfaceAt(l,t.pos[0]+dx,t.pos[1]+dz,k*.7).height-(t.y??0))<.001,`unsupported goal ${seq} at offset ${dx},${dz}`);
    if(t.type===4)assert.equal(t.pos[1],-2.42);
  }
});
for(const id of [28,29])test(`room ${id} gate windows include cube clearance for at least 1.2 seconds`,()=>{
  const room=levels.find(l=>l.id===id);
  for(const gate of room.obstacles.filter(o=>o.move)){
    const period=2*Math.PI/gate.move.speed;let longest=0,run=0;
    for(let i=0;i<Math.ceil(period*240);i++){
      const o=movingAt(gate,i/120),clear=Math.abs(o.x)>o.w/2+.24;
      run=clear?run+1/120:0;longest=Math.max(longest,run);
    }
    assert.ok(longest>=1.2,`geometric crossing window ${longest}`);
  }
});
