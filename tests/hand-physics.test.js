import test from 'node:test';
import assert from 'node:assert/strict';
import {HandGameEngine} from '../src/hand-physics.js';

const room={id:1,start:[0,0],target:{pos:[2.6,2.6],type:1}};
const pinchHand=(x,y,z,active=true,vx=0,vy=0,vz=0)=>({id:'Right',pinch:{x,y,z,active,vx,vy,vz},palm:null,points:[]});

test('a pinch near the cube grabs and drags it in 3D',()=>{
  const engine=new HandGameEngine([room],{strongGravity:false});engine.start();
  engine.advance(.03,{x:0,z:0,hands:[pinchHand(.08,.28,0,true)]});assert.equal(engine.handGrab,'Right');
  for(let i=0;i<8;i++)engine.advance(.03,{x:0,z:0,hands:[pinchHand(1.05,1.25,.35,true,1.8,1.2,.4)]});
  assert.ok(engine.state.cube.x>.45);assert.ok(engine.state.cube.y>.2);assert.ok(engine.state.cube.z>.05);
});
test('opening a pinched hand releases and transfers throwing velocity',()=>{
  const engine=new HandGameEngine([room]);engine.start();engine.advance(.03,{x:0,z:0,hands:[pinchHand(.08,.28,0,true)]});
  engine.advance(.03,{x:0,z:0,hands:[pinchHand(.35,.55,0,false,3.2,1.2,0)]});
  assert.equal(engine.handGrab,null);assert.ok(engine.state.cube.vx>1);assert.ok(engine.state.cube.vy>0);
});
test('fingertips and palm can push without grabbing',()=>{
  const engine=new HandGameEngine([room]);engine.start();
  const hand={id:'Left',pinch:{x:2,y:2,z:2,active:false,vx:0,vy:0,vz:0},palm:null,points:[{x:-.30,y:.24,z:0,vx:3,vy:0,vz:0,radius:.12}]};
  for(let i=0;i<4;i++)engine.advance(.02,{x:0,z:0,hands:[hand]});
  assert.ok(engine.state.cube.vx>.25||engine.state.cube.x>.05);
});
