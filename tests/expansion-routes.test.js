import test from 'node:test';
import assert from 'node:assert/strict';
import {playExpansion,replay} from './helpers/expansion-pilot.mjs';
const failure=r=>JSON.stringify({id:r.id,fps:r.fps,strongGravity:r.strongGravity,variant:r.variant,delay:r.delay,failure:r.failure,final:r.final,seq:r.seq});
function check(id,options={},reproduce=false){
  const r=playExpansion(id,options);assert.equal(r.solved,true,failure(r));
  assert.ok(r.frames.every(v=>v.every(Number.isFinite)&&Math.hypot(...v)<=1+1e-8));
  if(reproduce){const again=replay(r);assert.equal(again.solved,true,'input replay did not complete');assert.equal(again.seq,r.seq);assert.equal(again.seconds,r.seconds);}
  return r;
}
for(let id=23;id<=42;id++)for(const fps of [30,60,120,144])for(const strongGravity of [true,false])test(`input-only route ${id}, ${fps}Hz, gravity ${strongGravity?'strong':'soft'}`,()=>{
  const r=check(id,{fps,strongGravity},true);
  if([34,36,37,41,42].includes(id))assert.ok(r.events.filter(e=>e.type==='jump').length>=(id===37?2:1),'jump challenge bypassed');
  if([30,31,32,39,41,42].includes(id))assert.ok(r.supports.includes(1),'transport challenge bypassed');
  if(id===31)assert.ok(r.supports.includes(2),'second transport bypassed');
});
for(let id=23;id<=42;id++)for(const strongGravity of [true,false])test(`eight-way keyboard route ${id}, gravity ${strongGravity?'strong':'soft'}`,()=>check(id,{keyboard:true,strongGravity}));
for(const id of [28,29,30,31,32,36,39,41,42])for(const delay of [1.1,2.7,5.4])for(const strongGravity of [true,false])test(`phase robustness ${id}, delay ${delay}, gravity ${strongGravity}`,()=>check(id,{delay,strongGravity}));
for(const [id,variant] of [[24,'return-ice'],[25,'bumper'],[26,'right'],[38,'jump'],[39,'bumper'],[40,'jump']])for(const strongGravity of [true,false])test(`alternative route ${id}/${variant}, gravity ${strongGravity}`,()=>{
  const r=check(id,{variant,strongGravity},true);
  if(variant==='bumper')assert.ok(r.events.some(e=>e.type==='bumper'));
  if(variant==='jump')assert.ok(r.events.some(e=>e.type==='jump'));
});
for(const id of [34,42])for(const strongGravity of [true,false])test(`fall recovery ${id}, gravity ${strongGravity}`,()=>{
  const r=check(id,{variant:'recovery',strongGravity},true);assert.ok(r.events.filter(e=>e.type==='jump').length>=2);
});
for(const id of [23,29,31,34,42])test(`pause and resume during actual route ${id}`,()=>assert.equal(check(id,{pauseAt:2},true).pauseProbed,true));
