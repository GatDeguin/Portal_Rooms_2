import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/level-transition.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const make=()=>{assert.equal(typeof api.LevelTransition,'function');return new api.LevelTransition();};
test('entry materializes the cube and returns exactly to the resting appearance',()=>{
 const t=make();t.start('enter');const first=t.sample();assert.ok(first.scale<.1&&first.lift>.5);
 for(let i=0;i<6;i++)t.advance(60);const middle=t.sample();assert.ok(middle.scale>first.scale&&middle.energy>.4);assert.ok(Math.abs(middle.spin)>.01);
 while(!t.advance(60)){}const last=t.sample();assert.equal(last.scale,1);assert.equal(last.lift,0);assert.equal(last.spin,0);assert.equal(last.energy,0);
});
test('completion lifts and spins the cube before it contracts completely',()=>{
 const t=make();t.start('exit');assert.equal(t.sample().scale,1);
 for(let i=0;i<7;i++)t.advance(60);const middle=t.sample();assert.ok(middle.lift>.2&&middle.scale<1&&middle.spin>.2&&middle.energy>.5);
 while(!t.advance(60)){}assert.equal(t.sample().scale,0);assert.equal(t.sample().energy,0);
});
test('a stalled or invalid clock never skips the entire entrance',()=>{
 const t=make();t.start('enter');t.advance(NaN);t.advance(-10);assert.equal(t.elapsed,0);
 assert.equal(t.advance(10000),false);assert.ok(t.elapsed<=80);
});
test('reduced motion and disabled effects skip the animation without hiding the cube',()=>{
 for(const options of [{reduced:true},{enabled:false}])for(const kind of ['enter','exit']){
  const t=make();t.start(kind,options);assert.equal(t.done,true);assert.equal(t.sample(),null);
 }
});
test('a new transition replaces the previous one and cancelling clears its visual state',()=>{
 const t=make();t.start('exit');t.advance(80);t.start('enter');assert.equal(t.elapsed,0);assert.ok(t.sample().scale<.1);t.clear();assert.equal(t.sample(),null);assert.equal(t.done,true);
});
