import test from 'node:test';
import assert from 'node:assert/strict';
import {handMetrics,pinchRatio,mapLandmarkToWorld,MEDIAPIPE_VERSION,HAND_MODEL} from '../src/hand-tracking.js';

const hand=()=>Array.from({length:21},(_,i)=>({x:.5+(i%4-.5)*.025,y:.68-Math.floor(i/4)*.035,z:0}));

test('MediaPipe integration is version-pinned',()=>{assert.equal(MEDIAPIPE_VERSION,'1.0.1');assert.match(HAND_MODEL,/\/float16\/1\/hand_landmarker\.task$/);assert.doesNotMatch(HAND_MODEL,/latest/);});
test('pinch ratio distinguishes a thumb-index pinch',()=>{
  const open=hand();open[4]={x:.37,y:.49,z:0};open[8]={x:.61,y:.47,z:0};open[5]={x:.40,y:.64,z:0};open[17]={x:.61,y:.64,z:0};open[9]={x:.50,y:.49,z:0};open[0]={x:.50,y:.76,z:0};
  const pinched=open.map(p=>({...p}));pinched[4]={x:.495,y:.49,z:0};pinched[8]={x:.505,y:.49,z:0};
  assert.ok(pinchRatio(pinched)<pinchRatio(open)*.2);
});
test('top-monitor mapping mirrors X, lifts with image Y and uses apparent hand size for depth',()=>{
  const calibration={y:.70,scale:.14},metrics={x:.5,y:.65,z:0,scale:.14};
  const left=mapLandmarkToWorld({x:.35,y:.65,z:0},metrics,calibration),right=mapLandmarkToWorld({x:.65,y:.65,z:0},metrics,calibration);
  assert.ok(left.x>0&&right.x<0,'camera view is mirrored to behave like a mirror');
  const high=mapLandmarkToWorld({x:.5,y:.42,z:0},metrics,calibration),low=mapLandmarkToWorld({x:.5,y:.72,z:0},metrics,calibration);assert.ok(high.y>low.y);
  const near=mapLandmarkToWorld({x:.5,y:.65,z:0},{...metrics,scale:.19},calibration),far=mapLandmarkToWorld({x:.5,y:.65,z:0},{...metrics,scale:.10},calibration);assert.ok(near.z>far.z);
});
test('hand metrics return a stable palm scale from 21 landmarks',()=>assert.ok(handMetrics(hand()).scale>0));
