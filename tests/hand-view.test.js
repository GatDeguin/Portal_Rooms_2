import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraForHands,projectPoint,handInteraction} from '../src/hand-view.js';
const state={cube:{x:0,y:0,z:0,q:[0,0,0,1]},gravity:{x:0,z:0},shake:0,time:0};
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const norm=a=>a.map(v=>v/Math.sqrt(dot(a,a)));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Forward rays follow the existing GLSL cameraRay; projection must invert its lens.
for(const [width,height] of [[1200,800],[390,844],[800,800]])test(`hand projection follows the room camera at ${width}x${height}`,()=>{
  for(const dynamicCamera of [false,true]){
    const s={...state,cube:{x:1,y:.4,z:-1,q:[0,0,0,1]},gravity:{x:.3,z:-.2}};
    const m=+dynamicCamera,gx=s.gravity.x*m,gz=s.gravity.z*m,c=s.cube;
    const ro=[gx*.50+c.x*.055*m,1.42+c.y*.06*m+Math.abs(gz)*.10,(width>=height?5.08:5.78)+gz*.30];
    const ta=[c.x*.05*m,.82+c.y*.18*m,-.56+c.z*.04*m],ww=norm(ta.map((v,i)=>v-ro[i])),uu=norm(cross(ww,[0,1,0])),vv=cross(uu,ww);
    const camera=cameraForHands(s,{dynamicCamera},{width,height});
    for(const [x,y] of [[width*.5,height*.5],[width*.2,height*.3],[width*.8,height*.7]]){
      const u=(x*2-width)/height,v=(height-y*2)/height,lens=1+.035*(u*u+v*v),fov=width>=height?1.34:1.02;
      const ray=norm(ww.map((w,i)=>uu[i]*u*lens+vv[i]*v*lens+w*fov));
      const p=projectPoint({x:ro[0]+ray[0]*4,y:ro[1]+ray[1]*4,z:ro[2]+ray[2]*4},camera);
      assert.ok(Math.abs(p.x-x)<.001);assert.ok(Math.abs(p.y-y)<.001);
    }
  }
});
test('points behind the camera are not drawn',()=>{
  const camera=cameraForHands(state,{}, {width:800,height:600});assert.equal(projectPoint({x:0,y:1,z:10},camera),null);
});
test('reduced motion keeps the same hand projection as the room',()=>{
  const s={...state,cube:{...state.cube,x:2},gravity:{x:1,z:1},shake:1};
  assert.deepEqual(cameraForHands(s,{dynamicCamera:true},{width:800,height:600,reduced:true}),cameraForHands(s,{dynamicCamera:false},{width:800,height:600}));
});
test('feedback distinguishes an open hand, a pinch and an actual cube grab',()=>{
  const h={id:'Left:1',pinch:{active:false}};
  assert.equal(handInteraction([h],null).kind,'open');h.pinch.active=true;
  assert.equal(handInteraction([h],null).kind,'pinch');assert.equal(handInteraction([h],h.id).kind,'grab');
  assert.equal(handInteraction([],h.id).kind,'searching');assert.equal(handInteraction([h],'old-track').kind,'pinch');
});


test('resizing scales the guide with the currently displayed bitmap until its replacement arrives',()=>{
  const point={x:1,y:.6,z:-1},original=projectPoint(point,cameraForHands(state,{}, {width:1200,height:800}));
  const resized=projectPoint(point,cameraForHands(state,{}, {width:390,height:844,renderWidth:1200,renderHeight:800}));
  assert.ok(Math.abs(resized.x-original.x*390/1200)<1e-6);assert.ok(Math.abs(resized.y-original.y*844/800)<1e-6);
});
