import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/hand-menu.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const hand=(active,id='Right:1')=>({id,pinch:{active}});
const gate=()=>{assert.equal(typeof api.MenuPinch,'function','menu pinch controller must exist');return new api.MenuPinch();};
test('one open-to-closed pinch produces exactly one menu click',()=>{
 const p=gate();assert.equal(p.update('victory',hand(false)),false);assert.equal(p.update('victory',hand(true)),true);
 for(let i=0;i<20;i++)assert.equal(p.update('victory',hand(true)),false);
 assert.equal(p.update('victory',hand(false)),false);assert.equal(p.update('victory',hand(true)),true);
});
test('a cube grab held while entering victory cannot click next',()=>{
 const p=gate();assert.equal(p.update('victory',hand(true)),false);assert.equal(p.update('victory',hand(true)),false);
 p.update('victory',hand(false));assert.equal(p.update('victory',hand(true)),true);
});
test('switching dialogs requires a fresh release before another click',()=>{
 const p=gate();p.update('settings',hand(false));assert.equal(p.update('settings',hand(true)),true);
 assert.equal(p.update('confirm',hand(true)),false);p.update('confirm',hand(false));assert.equal(p.update('confirm',hand(true)),true);
});
test('losing or switching hands cannot turn a held pinch into a new click',()=>{
 const p=gate();p.update('menu',hand(false));p.update('menu',hand(true));p.update('menu',null);
 assert.equal(p.update('menu',hand(true)),false);p.update('menu',hand(false));assert.equal(p.update('menu',hand(true,'Left:2')),false);
});
test('reset also protects reopening the same dialog',()=>{
 const p=gate();p.update('menu',hand(false));p.reset();assert.equal(p.update('menu',hand(true)),false);
});
test('menu cursor reaches the whole viewport with bounded coordinates',()=>{
 assert.equal(typeof api.menuPoint,'function');assert.deepEqual(api.menuPoint({x:.5,y:.5},1000,800),{x:500,y:400});
 assert.deepEqual(api.menuPoint({x:.05,y:.95},1000,800),{x:12,y:788});
 assert.deepEqual(api.menuPoint({x:.95,y:.05},390,844),{x:378,y:12});
});
