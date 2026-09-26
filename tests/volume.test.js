import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,normalizeSettings} from '../src/storage.js';
import {AudioFeedback} from '../src/audio.js';
test('volume is normalized, saved and restored including complete silence',()=>{
  const map=new Map(),adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=new SaveStore(adapter);assert.equal(store.settings.volume,.65);
  for(const volume of [0,.25,1]){store.setSettings({volume});assert.equal(new SaveStore(adapter).settings.volume,volume);}
  assert.equal(normalizeSettings({volume:-1}).volume,0);assert.equal(normalizeSettings({volume:4}).volume,1);
  for(const volume of [null,'0',NaN,Infinity])assert.equal(normalizeSettings({volume}).volume,.65);
});
test('audio uses the saved volume at creation, refresh and resume',()=>{
  const oldWindow=globalThis.window;let settings={sound:true,volume:.25};
  class Context{constructor(){this.state='running';this.destination={};}createGain(){return {gain:{value:1},connect(){}};}resume(){this.state='running';return Promise.resolve();}}
  globalThis.window={AudioContext:Context};
  try{const audio=new AudioFeedback(()=>settings);audio.unlock();assert.equal(audio.master.gain.value,.25);
    settings.volume=0;audio.refresh();assert.equal(audio.master.gain.value,0);
    settings={sound:false,volume:.8};audio.refresh();assert.equal(audio.master.gain.value,0);
    settings.sound=true;audio.context.state='suspended';audio.unlock();assert.equal(audio.master.gain.value,.8);assert.equal(audio.context.state,'running');
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});
