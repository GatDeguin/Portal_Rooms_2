import test from 'node:test';
import assert from 'node:assert/strict';
import {ClothSystem} from '../src/cloth-physics.js';
import {clothsForRoom} from '../src/cloth-layout.js';

const fixture={id:'test',cloths:[{id:'test-cloth',x:0,z:0,top:1.12,width:1,height:1,columns:9,rows:10,wind:0}]};
const cubeAt=(x=0,z=0)=>({x,y:0,z,size:.48,q:[0,0,0,1],vx:2,vy:0,vz:1});
const advance=(system,count,extra={})=>{for(let i=0;i<count;i++)system.step(1/120,{time:i/120,...extra});};
const offset=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);

test('cloth layouts stay outside level data and can be explicitly disabled',()=>{
 const room=Object.freeze({id:1});
 assert.ok(clothsForRoom(room).length>0);
 assert.deepEqual(clothsForRoom({id:1,cloths:[]}),[]);
 assert.deepEqual(clothsForRoom({id:999}),[]);
 const a=clothsForRoom(room),b=clothsForRoom(room);a[0].x=999;
 assert.notEqual(b[0].x,999);
});
test('cloth top edge remains anchored during sustained gravity and wind',()=>{
 const s=new ClothSystem({...fixture,cloths:[{...fixture.cloths[0],wind:1}]});
 const before=structuredClone(s.snapshot()[0]);advance(s,1200);
 const after=s.snapshot()[0],edge=(before.columns+1)*3;
 assert.deepEqual(after.positions.slice(0,edge),before.positions.slice(0,edge));
 assert.ok(offset(after.positions.slice(edge),before.positions.slice(edge))>.1);
 for(const v of after.positions)assert.ok(Number.isFinite(v)&&Math.abs(v)<4);
 for(let i=1;i<after.positions.length;i+=3)assert.ok(after.positions[i]>=.012-1e-6);
});
test('distance constraints remain bounded through hard cube and hand contacts',()=>{
 const s=new ClothSystem(fixture);
 for(let i=0;i<900;i++)s.step(1/120,{time:i/120,cube:cubeAt(Math.sin(i*.03)*.6),hands:[{palm:{x:Math.sin(i*.027)*.3,y:.55,z:Math.cos(i*.029)*.16,radius:.18,vx:5,vy:0,vz:3},points:[]}]});
 const f=s.snapshot()[0],p=f.positions;
 for(let row=0;row<=f.rows;row++)for(let col=0;col<f.columns;col++){
  const a=(row*(f.columns+1)+col)*3,b=a+3;
  assert.ok(Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2])<.24);
 }
 for(const v of p)assert.ok(Number.isFinite(v)&&Math.abs(v)<4);
});
test('cube displaces cloth without moving the cube or reversing its velocity',()=>{
 const empty=new ClothSystem(fixture),hit=new ClothSystem(fixture),cube=cubeAt(),position=[cube.x,cube.y,cube.z];
 advance(empty,25);advance(hit,25,{cube});
 assert.ok(offset(empty.snapshot()[0].positions,hit.snapshot()[0].positions)>1);
 assert.deepEqual([cube.x,cube.y,cube.z],position);
 assert.ok(cube.vx>1&&cube.vx<=2&&cube.vz>0&&cube.vz<=1);
 const p=hit.snapshot()[0].positions;
 for(let i=0;i<p.length;i+=3)assert.ok(!(Math.abs(p[i])<.235&&p[i+1]>.012&&p[i+1]<.475&&Math.abs(p[i+2])<.235),'cloth cannot remain inside cube');
});
test('palms and fingertip spheres both push fabric and release it with momentum',()=>{
 for(const collider of ['palm','points']){
  const s=new ClothSystem(fixture),control=new ClothSystem(fixture),point={x:.05,y:.50,z:.02,radius:.21,vx:0,vy:0,vz:2};
  const hand=collider==='palm'?{palm:point,points:[]}:{palm:null,points:[point]};
  advance(s,12,{hands:[hand]});advance(control,12);
  const touching=structuredClone(s.snapshot()[0].positions);
  assert.ok(offset(touching,control.snapshot()[0].positions)>.4,collider);
  advance(s,15);assert.ok(offset(s.snapshot()[0].positions,touching)>.05);
 }
});
test('cloth clears floor and room solids, including moving obstacles and ramp surfaces',()=>{
 const s=new ClothSystem({...fixture,obstacles:[{x:0,z:0,w:.4,d:.28,move:{axis:'x',amp:.12,speed:1}}],platforms:[{x:.35,z:0,w:.25,d:.3,h:.35}],ramps:[{x:-.4,z:0,w:.2,d:.4,h:.4,dx:1,dz:0}]});
 advance(s,240);
 const p=s.snapshot()[0].positions;
 for(let i=0;i<p.length;i+=3){
  assert.ok(p[i+1]>=.012-1e-6);
  const ox=Math.sin(239/120)*.12;
  assert.ok(!(Math.abs(p[i]-ox)<.199&&Math.abs(p[i+2])<.139&&p[i+1]<.489));
 }
});
test('snapshot is cloneable mesh data and never exposes solver history',()=>{
 const s=new ClothSystem(fixture);advance(s,5);
 const frames=s.snapshot(),copy=structuredClone(frames),f=copy[0];
 assert.ok(f.positions instanceof Float32Array);assert.ok(f.normals instanceof Float32Array);assert.ok(f.indices instanceof Uint16Array);
 assert.equal(f.positions.length,(f.columns+1)*(f.rows+1)*3);assert.equal(f.normals.length,f.positions.length);
 assert.equal(f.indices.length,f.columns*f.rows*6);
 assert.ok(!('previous' in f)&&!('constraints' in f)&&!('velocities' in f));
 for(let i=0;i<f.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...f.normals.slice(i,i+3))-1)<1e-4);
 const unchanged=copy[0].positions.slice();advance(s,4);assert.deepEqual(copy[0].positions,unchanged);
});
test('zero, invalid and oversized elapsed times cannot create debt or unstable jumps',()=>{
 const s=new ClothSystem(fixture),initial=structuredClone(s.snapshot());
 for(const dt of [0,-1,NaN,Infinity])s.step(dt,{time:10});
 assert.deepEqual(s.snapshot(),initial);
 s.step(120,{time:120});for(const v of s.snapshot()[0].positions)assert.ok(Number.isFinite(v)&&Math.abs(v)<4);
 const fresh=new ClothSystem(fixture);assert.deepEqual(fresh.snapshot(),initial);
});

import {LEVELS} from '../src/levels.js';
import {EXPANSION_LEVELS} from '../src/levels-expansion.js';
import {movingAt} from '../src/geometry.js';
test('shipped cloth supports keep clear of solids and objective footprints',()=>{
 for(const room of [...LEVELS,...EXPANSION_LEVELS])for(const f of new ClothSystem(room).snapshot()){
  for(const point of f.rail){
   for(const time of [0,1,2,3,4,5])for(const raw of [...room.obstacles,...room.platforms,...room.ramps]){
    const o=movingAt(raw,time);
    assert.ok(!(Math.abs(point[0]-o.x)<o.w/2+.08&&Math.abs(point[2]-o.z)<o.d/2+.08),`room ${room.id}: support intersects a solid`);
   }
   for(const target of room.sequence??[room.target])assert.ok(Math.hypot(point[0]-target.pos[0],point[2]-target.pos[1])>.65,`room ${room.id}: support overlaps a goal`);
  }
 }
});

test('a tracked palm intersecting a wall cannot push fabric through the solid',()=>{
 const s=new ClothSystem({...fixture,obstacles:[{x:0,z:.1,w:.65,d:.2}]});
 advance(s,90,{hands:[{palm:{x:0,y:.3,z:-.13,radius:.24,vx:0,vy:0,vz:2},points:[]}]});
 const p=s.snapshot()[0].positions;
 for(let i=0;i<p.length;i+=3)assert.ok(!(Math.abs(p[i])<.32&&p[i+1]<.488&&p[i+2]>.001&&p[i+2]<.199),'fabric remains outside wall during palm contact');
});
