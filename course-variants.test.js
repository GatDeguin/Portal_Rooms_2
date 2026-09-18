import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';
import {play} from './helpers/playthrough.mjs';
export const VARIANTS=[
  {name:'30 Hz',fps:30},
  {name:'60 Hz, gravedad suave',fps:60,gravity:false},
  {name:'144 Hz, aproximación lenta',fps:144,speed:1.2},
  {name:'60 Hz, aproximación rápida',fps:60,speed:1.8}
];
for(const variant of VARIANTS)for(const [i] of LEVELS.entries()){
  test(`room ${i+1}: input-only route at ${variant.name}`,()=>{
    const r=play(i,{...variant,maxSeconds:65});
    assert.ok(r.solved,JSON.stringify({room:i+1,variant:variant.name,position:r.position,seq:r.seq,point:r.point}));
  });
}
