import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';
import {play} from './helpers/playthrough.mjs';
for(const [i,l] of LEVELS.entries()) {
  test(`room ${i+1}: individual lesson, chapter, three hints and revision`,()=>{
    assert.ok(Number.isInteger(l.chapter)&&l.chapter>=1&&l.chapter<=4);
    assert.ok(l.lesson?.length>8);assert.ok(l.briefing?.length>20);assert.equal(l.hints?.length,3);
    assert.ok(l.revision?.length>20);assert.ok(l.mechanics?.length>0);
  });
  test(`room ${i+1}: full reference route from spawn using gravity only`,()=>{
    const result=play(i,{maxSeconds:65});
    assert.equal(result.solved,true,JSON.stringify({room:i+1,position:result.position,seq:result.seq,point:result.point}));
    if([15,17,18,20,21,22].includes(i+1))assert.ok(result.highest>.3,'Raised route must reach elevation');
    if([16,19,21,22].includes(i+1))assert.ok(result.jumps>=1,'Jump mechanic must be exercised');
    if(i===18)assert.ok(result.jumps>=2,'Double-jump room must perform both jumps');
  });
}
