import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,normalizeSettings} from '../src/storage.js';
test('volume is normalized, saved and restored including complete silence',()=>{
  const map=new Map(),adapter={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=new SaveStore(adapter);assert.equal(store.settings.volume,.65);
  for(const volume of [0,.25,1]){store.setSettings({volume});assert.equal(new SaveStore(adapter).settings.volume,volume);}
  assert.equal(normalizeSettings({volume:-1}).volume,0);assert.equal(normalizeSettings({volume:4}).volume,1);
  for(const volume of [null,'0',NaN,Infinity])assert.equal(normalizeSettings({volume}).volume,.65);
});
// Native gain ramps, mute and resume are covered by tests/audio-browser.py.
