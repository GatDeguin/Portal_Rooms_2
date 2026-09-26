import test from 'node:test';
import assert from 'node:assert/strict';
import {HandGameEngine} from '../src/hand-physics.js';
const point=(x,z=0)=>({x,y:.24,z,vx:3,vy:0,vz:0,radius:.19});
const hand=p=>({id:'Right',pinch:{active:false},points:[p],palm:null});
const room={id:1,start:[-.4,0],target:{pos:[2.6,2.6],type:1}};
for(const [name,extra] of [['obstacle',{obstacles:[{x:0,z:0,w:.3,d:2,h:.5}]}],['platform side',{platforms:[{x:0,z:0,w:.3,d:2,h:.5}]}],['high ramp side',{ramps:[{x:0,z:0,w:.3,d:2,h:.6,base:.6,dx:0,dz:1}]}]]){
  test(`hand pushes remain outside a ${name} throughout sustained contact`,()=>{
    const e=new HandGameEngine([{...room,...extra}]);e.start();
    for(let i=0;i<60;i++){e.advance(1/120,{x:0,z:0,hands:[hand(point(e.state.cube.x-.28))]});assert.ok(e.state.cube.x<=-.39+1e-6,`penetration at step ${i}: x=${e.state.cube.x}`);assert.equal(e.state.cube.y,0);}
  });
}
test('multiple hand contacts cannot tunnel through a thin wall in one step',()=>{
  const e=new HandGameEngine([{...room,start:[-.26,0],obstacles:[{x:0,z:0,w:.02,d:2,h:.5}]}]);e.start();
  const points=Array.from({length:6},(_,i)=>point(-.26+.045*i-.15));
  e.advance(1/120,{x:0,z:0,hands:[{...hand(points[0]),points},{...hand(points[0]),id:'Left',points}]});
  assert.ok(e.state.cube.x<=-.25+1e-6,`cube crossed barrier: ${e.state.cube.x}`);
});
test('losing the grabbed hand releases it even when the other hand stays visible',()=>{
  const e=new HandGameEngine([{...room,start:[0,0]}]);e.start();
  e.advance(1/120,{hands:[{id:'Right',pinch:{x:0,y:.24,z:0,active:true,vx:0,vy:0,vz:0}}]});assert.equal(e.handGrab,'Right');
  e.advance(1/120,{hands:[{id:'Left',pinch:{x:2,y:2,z:2,active:false},points:[]}]});assert.equal(e.handGrab,null);
});
import {LEVELS} from '../src/levels.js';
test('multiple hand contacts follow the surface of the shipped room 15 ramp',()=>{
  const e=new HandGameEngine([{...LEVELS[14],start:[-1.3,-.82]}]);e.start();
  const contacts=Array.from({length:5},(_,i)=>({...point(-1.45+.05*i,-.82),radius:.105,vy:0,y:.24}));
  const hands=['Right','Left'].map(id=>({id,pinch:{active:false},points:contacts,palm:{...point(-1.20,-.82),radius:.19}}));
  e.advance(1/120,{x:0,z:0,hands});
  assert.ok(e.state.cube.x>-1.3,'contact should move along the ramp');
  const expectedHeight=(e.state.cube.x+1.35)/2.1*.62;
  assert.ok(Math.abs(e.state.cube.y-expectedHeight)<1e-6,`cube y=${e.state.cube.y}, ramp y=${expectedHeight}`);
});
