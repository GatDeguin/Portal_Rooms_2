import test from 'node:test';
import assert from 'node:assert/strict';
import {playMastery,replay} from './helpers/mastery-pilot.mjs';
const summary=r=>JSON.stringify({id:r.id,fps:r.fps,strongGravity:r.strongGravity,variant:r.variant,failure:r.failure,seq:r.seq,final:r.final});
function check(id,options={}){
 const r=playMastery(id,options);assert.equal(r.solved,true,summary(r));
 assert.ok(r.frames.every(v=>v.every(Number.isFinite)&&Math.hypot(...v)<=1+1e-8),'unbounded controller');
 const again=replay(r);assert.equal(again.solved,true,'recorded input replay');assert.equal(again.seq,r.seq);assert.equal(again.seconds,r.seconds);assert.deepEqual(again.cube,r.final);
 return r;
}
for(let id=43;id<=62;id++)for(const strongGravity of [true,false])test(`mastery route ${id}, gravity ${strongGravity?'strong':'soft'}, input replay`,()=>{
 const r=check(id,{strongGravity});
 if([50,52,53,54,55,56,57,60,61,62].includes(id))assert.ok(r.events.filter(e=>e.type==='jump').length>=([54,61].includes(id)?2:1),'jump bypassed');
 if([49,52].includes(id))assert.ok(r.events.some(e=>e.type==='bumper'),'concealed bumper bypassed');
 if(id===62)assert.ok(r.supports.includes(1),'moving platform bypassed');
});
for(const id of [5,16,17,19,31])for(const strongGravity of [true,false])test(`corrected original route ${id}, gravity ${strongGravity}`,()=>{
 const r=check(id,{strongGravity});if([16,19,31].includes(id))assert.equal(r.events.filter(e=>e.type==='jump').length,id===19?2:1);
});
for(const id of [53,56])for(const strongGravity of [true,false])test(`mastery deliberate fall and recovery ${id}, gravity ${strongGravity}`,()=>{
 const r=check(id,{strongGravity,variant:'recovery'});assert.ok(r.events.filter(e=>e.type==='jump').length>=2);
});
for(const strongGravity of [true,false])test(`room31 rear recovery before first goal, gravity ${strongGravity}`,()=>{
 const r=check(31,{strongGravity,variant:'rear-recovery'});
 assert.ok(r.events.some(e=>e.type==='jump'&&e.z<0&&e.seq===0),'rear pad not used before first goal');
});
for(const id of [19,54,56,61,62])for(const fps of [30,120])test(`fixed-step route ${id} at ${fps}Hz`,()=>check(id,{fps}));
for(const delay of [1.1,4.2])test(`mastery62 phase delay ${delay}`,()=>check(62,{delay}));