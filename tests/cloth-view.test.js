import test from 'node:test';
import assert from 'node:assert/strict';
import {clothFrameForPresentation,ClothView} from '../src/cloth-view.js';
import {projectPoint} from '../src/hand-view.js';
const state=(time=0)=>({time,cube:{x:0,y:0,z:0,q:[0,0,0,1]},gravity:{x:0,z:0},shake:0,cloths:[{id:`frame-${time}`}]});
const engine={state:state(2),room:{id:1},target:{type:1,pos:[0,0]}};

test('cloth follows the displayed snapshot instead of a newer simulation tick',()=>{
 const shown={state:state(1),room:engine.room,target:engine.target,settings:{dynamicCamera:false},reduced:false,width:1200,height:800};
 const frame=clothFrameForPresentation(engine,{dynamicCamera:true},{presentation:shown,width:390,height:844});
 assert.strictEqual(frame.cloths,shown.state.cloths);assert.strictEqual(frame.scene.state,shown.state);assert.strictEqual(frame.settings,shown.settings);
 assert.equal(frame.camera.renderWidth,1200);assert.equal(frame.camera.renderHeight,800);
 const p=projectPoint({x:1,y:.6,z:-1},frame.camera);
 const original=clothFrameForPresentation(engine,{}, {presentation:shown,width:1200,height:800});
 const q=projectPoint({x:1,y:.6,z:-1},original.camera);
 assert.ok(Math.abs(p.x-q.x*390/1200)<1e-6);assert.ok(Math.abs(p.y-q.y*844/800)<1e-6);
});
test('room transitions hide stale cloth until the matching room bitmap arrives',()=>{
 assert.equal(clothFrameForPresentation({...engine,room:{id:2}},{},{presentation:{state:state(1),room:{id:1}},width:800,height:600}),null);
});
test('an old bitmap without cloth data never borrows future simulation mesh',()=>{
 const old=state(1);delete old.cloths;
 const frame=clothFrameForPresentation(engine,{},{presentation:{state:old,room:engine.room,width:800,height:600,settings:{}},width:800,height:600});
 assert.deepEqual(frame.cloths,[]);
});
test('cloth rendering does not depend on enabled hand tracking or advancing simulation',()=>{
 const frame=clothFrameForPresentation(engine,{}, {width:800,height:600,reduced:true});
 assert.strictEqual(frame.cloths,engine.state.cloths);assert.equal(frame.reduced,true);
 assert.deepEqual(frame.scene.state,state(2));
 const view=new ClothView(null);view.render(engine,{});view.clear();view.destroy();view.destroy();
});
