import test from 'node:test';
import assert from 'node:assert/strict';
import {playMastery,replay} from './helpers/mastery-pilot.mjs';

const directions=[[0,0],[1,0],[-1,0],[0,1],[0,-1],...[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,z])=>[x/Math.SQRT2,z/Math.SQRT2])];
const summary=r=>JSON.stringify({id:r.id,strongGravity:r.strongGravity,failure:r.failure,seq:r.seq,final:r.final});
const representativeReplay=new Set([43,49,56,62]);

for(let id=43;id<=62;id++)for(const strongGravity of [true,false])test(`mastery eight-way keyboard ${id}, gravity ${strongGravity?'strong':'soft'}`,()=>{
 const r=playMastery(id,{keyboard:true,strongGravity,fps:60});
 assert.equal(r.solved,true,summary(r));assert.equal(r.keyboard,true);assert.ok(r.frames.length>0);
 let heldFrames=0,previous=null;
 for(const input of r.frames){
  assert.ok(input.every(Number.isFinite)&&Math.hypot(...input)<=1+1e-8,'unbounded keyboard input');
  assert.ok(directions.some(d=>Math.abs(d[0]-input[0])<1e-8&&Math.abs(d[1]-input[1])<1e-8),'input outside eight-way keyboard');
  if(previous&&(input[0]!==previous[0]||input[1]!==previous[1])){
   assert.ok(heldFrames>=6,'keyboard pulse shorter than .1s at 60Hz');heldFrames=0;
  }
  heldFrames++;previous=input;
 }
 if([50,52,53,54,55,56,57,60,61,62].includes(id))assert.ok(r.events.filter(e=>e.type==='jump').length>=([54,61].includes(id)?2:1),'jump challenge bypassed');
 if([49,52].includes(id))assert.ok(r.events.some(e=>e.type==='bumper'),'concealed bumper bypassed');
 if(id===62)assert.ok(r.supports.includes(1),'moving platform bypassed');
 // Analogue tests already replay every route. These four keyboard cases cover
 // material control, a hidden bumper, an elevated pad and combined moving geometry.
 if(strongGravity&&representativeReplay.has(id)){
  const again=replay(r);assert.equal(again.solved,true);assert.equal(again.seq,r.seq);
  assert.equal(again.seconds,r.seconds);assert.deepEqual(again.cube,r.final);
 }
});
