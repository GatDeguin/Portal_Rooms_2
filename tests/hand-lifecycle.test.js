import test from 'node:test';
import assert from 'node:assert/strict';
import {HandTracking} from '../src/hand-tracking.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(){
  const tracks=[],status=[],clock={now:1000};
  const video={srcObject:null,readyState:2,currentTime:1,play:async()=>{},pause(){}};
  const win={isSecureContext:true,navigator:{mediaDevices:{getUserMedia:async()=>makeStream()}},document:{hidden:false},performance:{now:()=>clock.now},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
  function makeStream(){const listeners=new Map(),track={readyState:'live',stop(){this.readyState='ended';},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),end(){this.readyState='ended';listeners.get('ended')?.();}};tracks.push(track);return {getTracks:()=>[track]};}
  const tracker=new HandTracking({win,video,onStatus:(kind,message)=>status.push({kind,message})});tracker.load=async()=>{};
  return {tracker,video,win,tracks,status,clock,makeStream};
}
test('concurrent activation requests open one camera and disabling stops every track',async()=>{
  const {tracker,tracks}=setup();await Promise.all([tracker.enable(),tracker.enable()]);
  assert.equal(tracks.length,1);tracker.disable();assert.ok(tracks.every(t=>t.readyState==='ended'));
});
test('disabling during model loading prevents a later camera request',async()=>{
  const {tracker,tracks}=setup(),load=deferred();tracker.load=()=>load.promise;
  const activation=tracker.enable();tracker.disable();load.resolve();assert.equal(await activation,false);
  assert.equal(tracks.length,0);assert.equal(tracker.enabled,false);
});
test('a camera permission result arriving after disable is stopped without attaching video',async()=>{
  const {tracker,video,win,tracks,makeStream}=setup(),permission=deferred();win.navigator.mediaDevices.getUserMedia=()=>permission.promise;
  const activation=tracker.enable();await Promise.resolve();tracker.disable();permission.resolve(makeStream());
  assert.equal(await activation,false);assert.equal(video.srcObject,null);assert.equal(tracks[0].readyState,'ended');
});
test('disabling while video playback is pending cannot re-enable tracking',async()=>{
  const {tracker,video,tracks}=setup(),playback=deferred(),started=deferred();video.play=()=>{started.resolve();return playback.promise;};
  const activation=tracker.enable();await started.promise;tracker.disable();playback.resolve();
  assert.equal(await activation,false);assert.equal(tracker.enabled,false);assert.equal(tracks[0].readyState,'ended');
});
test('a cancelled activation cannot stop or overwrite a newer camera session',async()=>{
  const {tracker,video,win,tracks,makeStream}=setup(),old=deferred();let calls=0;
  win.navigator.mediaDevices.getUserMedia=()=>++calls===1?old.promise:Promise.resolve(makeStream());
  const previous=tracker.enable();await Promise.resolve();tracker.disable();assert.equal(await tracker.enable(),true);
  const current=video.srcObject;old.resolve(makeStream());assert.equal(await previous,false);
  assert.equal(video.srcObject,current);assert.equal(tracker.enabled,true);assert.equal(tracks[0].readyState,'live');assert.equal(tracks[1].readyState,'ended');tracker.disable();
});
test('an old camera rejection does not clear a newer active stream',async()=>{
  const {tracker,video,win,makeStream}=setup(),old=deferred();let calls=0;
  win.navigator.mediaDevices.getUserMedia=()=>++calls===1?old.promise:Promise.resolve(makeStream());
  const previous=tracker.enable();await Promise.resolve();tracker.disable();await tracker.enable();const current=video.srcObject;
  old.reject(new Error('old permission request failed'));assert.equal(await previous,false);assert.equal(video.srcObject,current);assert.equal(tracker.enabled,true);tracker.disable();
});
test('destroy during pending activation prevents camera resurrection',async()=>{
  const {tracker,tracks}=setup(),load=deferred();tracker.load=()=>load.promise;
  const activation=tracker.enable();tracker.destroy();load.resolve();assert.equal(await activation,false);assert.equal(tracks.length,0);
});
test('ending a camera track disables hand input and releases the video',async()=>{
  const {tracker,tracks,video}=setup();await tracker.enable();tracks[0].end();assert.equal(tracker.enabled,false);assert.equal(video.srcObject,null);
});
function seedTracking(s){
  const landmarks=Array.from({length:21},(_,i)=>({x:.5+(i%4-.5)*.025,y:.68-Math.floor(i/4)*.035,z:0}));
  landmarks[4]={x:.495,y:.49,z:0};landmarks[8]={x:.505,y:.49,z:0};
  s.tracker.enabled=true;s.tracker.baseline={scale:.14,y:.7};s.tracker.process({landmarks:[landmarks],handednesses:[[{categoryName:'Right'}]]},s.clock.now);
  return landmarks;
}
test('inference failure immediately clears the last pinch and motion history',()=>{
  const s=setup();seedTracking(s);assert.equal(s.tracker.sample().length,1);
  s.tracker.landmarker={detectForVideo(){throw new Error('inference failure');}};s.tracker.detect();
  assert.deepEqual(s.tracker.sample(),[]);assert.equal(s.tracker.previous.size,0);
});
test('a stopped video cannot keep an old hand acting on the cube',()=>{
  const s=setup();seedTracking(s);s.clock.now+=1000;
  assert.deepEqual(s.tracker.sample(),[]);
});
test('hidden and inactive pages clear hand samples before resuming',()=>{
  const s=setup();seedTracking(s);s.win.document.hidden=true;assert.deepEqual(s.tracker.sample(),[]);
  s.win.document.hidden=false;seedTracking(s);s.tracker.isActive=()=>false;assert.deepEqual(s.tracker.sample(),[]);
});
test('a temporarily unavailable video clears input without waiting for inference',()=>{
  const s=setup();seedTracking(s);s.video.readyState=1;assert.deepEqual(s.tracker.sample(),[]);
});
test('a returning hand starts with zero velocity after tracking was lost',()=>{
  const s=setup(),landmarks=seedTracking(s);s.tracker.process({landmarks:[]},s.clock.now+40);
  s.clock.now+=80;s.tracker.process({landmarks:[landmarks.map(p=>({...p,x:p.x+.2}))],handednesses:[[{categoryName:'Right'}]]},s.clock.now);
  assert.equal(s.tracker.sample()[0].pinch.vx,0);
});
import {HandGameEngine} from '../src/hand-physics.js';
test('reacquiring a distant pinched hand after a stall cannot resume an old grab',()=>{
  const s=setup(),landmarks=seedTracking(s),pinch=s.tracker.sample()[0].pinch;
  const engine=new HandGameEngine([{id:1,start:[pinch.x,pinch.z],target:{pos:[2.6,2.6],type:1}}]);
  engine.state.cube.y=pinch.y-.24;engine.start();engine.advance(1/120,{hands:s.tracker.sample()});assert.ok(engine.handGrab);
  const before=engine.state.cube.x;s.clock.now+=1000;
  s.tracker.landmarker={detectForVideo:()=>({landmarks:[landmarks.map(p=>({...p,x:p.x-.4}))],handednesses:[[{categoryName:'Right'}]]})};
  s.tracker.detect();engine.advance(1/120,{hands:s.tracker.sample()});
  assert.equal(engine.handGrab,null);assert.ok(Math.abs(engine.state.cube.x-before)<.01);
});


test('startup distinguishes model loading, camera permission and video playback',async()=>{
  const s=setup(),permission=deferred(),playback=deferred();
  s.win.navigator.mediaDevices.getUserMedia=()=>permission.promise;s.video.play=()=>playback.promise;
  const activation=s.tracker.enable();assert.equal(s.status.at(-1).kind,'loading');
  await Promise.resolve();assert.equal(s.status.at(-1).kind,'permission');
  permission.resolve(s.makeStream());await Promise.resolve();assert.equal(s.status.at(-1).kind,'starting');
  playback.resolve();assert.equal(await activation,true);assert.equal(s.status.at(-1).kind,'searching');s.tracker.disable();
});
for(const [name,message] of [['NotAllowedError',/permiso/i],['NotFoundError',/no se encontr[oó].*c[aá]mara/i],['NotReadableError',/ocupada|otra aplicaci[oó]n/i],['OverconstrainedError',/configuraci[oó]n/i]])test(`camera ${name} has an actionable error and permits retry`,async()=>{
  const s=setup();s.win.navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('camera failed',name);};
  assert.equal(await s.tracker.enable(),false);assert.equal(s.status.at(-1).kind,'error');assert.match(s.status.at(-1).message,message);
  s.win.navigator.mediaDevices.getUserMedia=async()=>s.makeStream();assert.equal(await s.tracker.enable(),true);s.tracker.disable();
});
test('model loading failures identify the download stage',async()=>{
  const s=setup();s.tracker.load=async()=>{throw new TypeError('Failed to fetch');};
  assert.equal(await s.tracker.enable(),false);assert.match(s.status.at(-1).message,/descargar|cargar MediaPipe/i);assert.equal(s.tracks.length,0);
});
test('a camera that never starts video times out, stops its stream and permits retry',async()=>{
  const s=setup(),playback=deferred();let timeout,cleared=false;
  s.win.setTimeout=(fn,ms)=>{assert.equal(ms,15000);timeout=fn;return 1;};s.win.clearTimeout=()=>{cleared=true;};s.video.play=()=>playback.promise;
  const activation=s.tracker.enable();await Promise.resolve();await Promise.resolve();assert.equal(typeof timeout,'function');timeout();
  assert.equal(await activation,false);assert.ok(cleared);assert.equal(s.tracks[0].readyState,'ended');assert.equal(s.video.srcObject,null);assert.match(s.status.at(-1).message,/v[ií]deo/i);
  s.video.play=async()=>{};assert.equal(await s.tracker.enable(),true);playback.resolve();await Promise.resolve();assert.equal(s.tracker.enabled,true);s.tracker.disable();
});
test('no hands during initial calibration is reported as searching',()=>{
  const s=setup();s.tracker.enabled=true;s.tracker.recalibrate();s.tracker.process({landmarks:[]},s.clock.now);
  assert.equal(s.status.at(-1).kind,'searching');assert.match(s.status.at(-1).message,/mano/i);
});


test('the visible skeleton shares all five smoothed contact positions with physics',()=>{
  const s=setup(),landmarks=seedTracking(s);
  s.clock.now+=40;s.tracker.process({landmarks:[landmarks.map(p=>({...p,x:p.x+.1}))],handednesses:[[{categoryName:'Right'}]]},s.clock.now);
  const hand=s.tracker.sample()[0];assert.equal(hand.joints?.length,21);
  for(const [i,index] of [4,8,12,16,20].entries())for(const axis of ['x','y','z'])assert.equal(hand.joints[index][axis],hand.points[i][axis]);
  for(const axis of ['x','y','z'])assert.ok(Math.abs((hand.joints[4][axis]+hand.joints[8][axis])/2-hand.pinch[axis])<1e-10);
});
