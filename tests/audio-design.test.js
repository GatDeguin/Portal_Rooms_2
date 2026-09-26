import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings,SaveStore} from '../src/storage.js';
import {AudioFeedback} from '../src/audio.js';
const score=await import('../src/audio-score.js').catch(()=>({}));
const audio=await import('../src/audio.js');

test('old saves acquire independent audio controls without losing silence or progress',()=>{
  const map=new Map([['roomTiltGame.settings.v2',JSON.stringify({sound:false,volume:0})],['roomTiltGame.level','10']]);
  const adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=new SaveStore(adapter,42);assert.equal(store.settings.sound,false);assert.equal(store.settings.volume,0);
  assert.equal(store.progress.current,10);assert.equal(store.progress.unlocked,11);
  for(const key of ['musicVolume','ambienceVolume','effectsVolume'])assert.ok(store.settings[key]>0&&store.settings[key]<=1,key);
  store.setSettings({musicVolume:0,ambienceVolume:.2,effectsVolume:.8,audioMix:'night',audioMono:true});
  const restored=new SaveStore(adapter,42).settings;assert.equal(restored.musicVolume,0);assert.equal(restored.ambienceVolume,.2);assert.equal(restored.effectsVolume,.8);assert.equal(restored.audioMix,'night');assert.equal(restored.audioMono,true);
});
test('invalid audio preferences cannot produce negative or nonfinite gains',()=>{
  for(const key of ['musicVolume','ambienceVolume','effectsVolume']){
    assert.equal(normalizeSettings({[key]:-4})[key],0);assert.equal(normalizeSettings({[key]:4})[key],1);
    for(const value of [null,'1',NaN,Infinity])assert.ok(Number.isFinite(normalizeSettings({[key]:value})[key]));
  }
  assert.equal(normalizeSettings({audioMix:'LOUD',audioMono:'false'}).audioMix,'full');assert.equal(normalizeSettings({audioMono:'false'}).audioMono,false);
});
test('score covers eight chapters with bounded playable notes and recurring motifs',()=>{
  assert.equal(typeof score.scoreStep,'function');const signatures=new Set();
  for(let chapter=0;chapter<8;chapter++){
    const notes=Array.from({length:128},(_,step)=>score.scoreStep(chapter,step,{playing:true,intensity:.8})).flat();
    assert.ok(notes.length>30&&notes.length<250);assert.ok(notes.some(n=>n.instrument==='pad'));assert.ok(notes.some(n=>n.instrument==='key'));
    assert.ok(notes.every(n=>n.midi>=28&&n.midi<=90&&n.duration>0&&n.duration<=12&&n.gain>0&&n.gain<.3));
    signatures.add(JSON.stringify(notes));
  }
  assert.equal(signatures.size,8);
});
test('menu arrangement is sparser and movement adds a pulse without randomizing harmony',()=>{
  assert.equal(typeof score.scoreStep,'function');
  const notes=opts=>Array.from({length:64},(_,s)=>score.scoreStep(0,s,opts)).flat();
  const menu=notes({playing:false,intensity:0}),idle=notes({playing:true,intensity:0}),moving=notes({playing:true,intensity:1});
  assert.ok(menu.length<idle.length);assert.ok(moving.length>idle.length);
  assert.deepEqual(notes({playing:true,intensity:1}),moving);
});
test('audio snapshot silences contact in air and detects held objects without mutating physics',()=>{
  assert.equal(typeof audio.readAudioFrame,'function');
  const engine={state:{level:0,seq:0,time:1,surface:'wood',cube:{x:1,z:-2,y:0,vx:3,vz:4,vy:0,grounded:true,hold:.275}},room:{sequence:[{},{}],obstacles:[],platforms:[]},target:{type:3,pos:[1,-2]},handGrab:null};
  const before=JSON.stringify(engine),ground=audio.readAudioFrame(engine);assert.equal(ground.speed,5);assert.equal(ground.contact,1);assert.equal(ground.charge,.5);assert.equal(JSON.stringify(engine),before);
  engine.state.cube.grounded=false;assert.equal(audio.readAudioFrame(engine).contact,0);
  engine.state.cube.grounded=true;engine.handGrab='right';assert.equal(audio.readAudioFrame(engine).contact,0);assert.equal(audio.readAudioFrame(engine).grabbed,true);
});
test('audio remains optional on devices without Web Audio',()=>{
  const a=new AudioFeedback(()=>normalizeSettings());assert.doesNotThrow(()=>{a.unlock();a.event({type:'impact',power:1});a.refresh();a.suspend();});
});

test('landing sound uses the supporting material while the physics surface still reads air',()=>{
  const engine={state:{level:0,seq:0,time:0,surface:'air',cube:{x:0,z:0,y:.5,vx:0,vz:0,vy:0,grounded:true,hold:0}},room:{platforms:[{x:0,z:0,w:1,d:1,h:.5}]},target:{type:1,pos:[2,2]},handGrab:null};
  assert.equal(audio.readAudioFrame(engine).surface,'platform');assert.equal(engine.state.surface,'air');
});
