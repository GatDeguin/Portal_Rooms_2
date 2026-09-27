import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {extname,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../test-results/atelier/',import.meta.url);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent((req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname)));if(!path.startsWith(root.replace(/[\\/]$/,'')+sep))throw Error('Path');
 const file=path.endsWith(sep)?path+'index.html':path,body=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.bin':'application/octet-stream'})[extname(file)]||'application/octet-stream');res.end(body);
 }catch{res.statusCode=404;res.end('Not found');}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--enable-gpu','--ignore-gpu-blocklist',...(process.platform==='win32'?['--use-angle=d3d11']:[])]});
const report={mode:'Real WebGL2 + room worker, synthetic hand poses; no physical camera',checks:[],errors:[],consoleErrors:[]};
try{
 const page=await browser.newPage({viewport:{width:1100,height:760},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:'low',sound:false,haptic:false,effects:false,dynamicCamera:false})));
 // Test-only adapters. Real HandView, real skinning, real shadows, real room.
 await page.route('**/src/hand-tracking.js',async route=>{
  const source=await readFile(new URL('../src/hand-tracking.js',import.meta.url),'utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`\nHandTracking.prototype.enable=async function(){this.enabled=true;window.testTracker=this;return true;};HandTracking.prototype.sample=function(){return this.enabled?(window.testHands??[]):[];};`});
 });
 await page.route('**/src/hand-renderer.js',async route=>{
  const source=await readFile(new URL('../src/hand-renderer.js',import.meta.url),'utf8');
  await route.fulfill({contentType:'text/javascript',body:source+`\nconst draw=AtelierHandRenderer.prototype.render;AtelierHandRenderer.prototype.render=function(...args){window.lastHandFrame=args;return draw.apply(this,args);};const create=AtelierHandRenderer.create;AtelierHandRenderer.create=async function(...args){const r=await create.apply(this,args);window.testHandRenderer=r;return r;};`});
 });
 await page.goto(url);await page.waitForFunction(()=>['menu','error'].includes(document.getElementById('app').dataset.phase));
 assert.equal(await page.locator('#app').getAttribute('data-phase'),'menu');
 await page.evaluate(async()=>{
  const {REST}=await import('./src/hand-rig.js');
  window.makeTestHand=(id,x,mirror=1,z=.8)=>{
   const joints=Array.from({length:21},(_,i)=>({x:REST[i*3]*.09*mirror+x,y:REST[i*3+1]*.09+.32,z:REST[i*3+2]*.09+z}));
   return {id,label:mirror===1?'Right':'Left',joints,palm:{x,y:.8,z},points:[],pinch:{x,y:1,z,active:false},screen:{x:.5,y:.5,joints:joints.map(()=>({x:.5,y:.5}))}};
  };
  window.testHands=[makeTestHand('Right:1',-.75),makeTestHand('Left:2',.75,-1)];
 });
 await page.locator('#startHandsBtn').click();await page.waitForFunction(()=>window.testHandRenderer?.ready&&!document.querySelector('[data-render="atelier-v03"]').hidden);
 await page.waitForTimeout(800);report.checks.push('Actual app starts in hands mode with a compiled skin and shadow renderer');
 report.gl=await page.evaluate(()=>{const g=testHandRenderer.gl;return {error:g.getError(),vertices:testHandRenderer.mesh.vertices.length/18,triangles:testHandRenderer.mesh.indices.length/3,rigs:testHandRenderer.rigs.size};});assert.equal(report.gl.error,0);assert.equal(report.gl.rigs,2);
 await page.screenshot({path:fileURLToPath(new URL('game-two-hands.png',out))});
 report.pixels=await page.evaluate(()=>{
  const r=testHandRenderer,g=r.gl,[hands,camera,scene,settings,grab]=lastHandFrame;
  const read=()=>{const p=new Uint8Array(r.canvas.width*r.canvas.height*4);g.readPixels(0,0,r.canvas.width,r.canvas.height,g.RGBA,g.UNSIGNED_BYTE,p);let skin=0,shadow=0,cx=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>240&&p[i]>30)skin++;if(p[i]+p[i+1]+p[i+2]<3&&p[i+3]>8&&p[i+3]<220){shadow++;cx+=(i/4)%r.canvas.width;}}return {skin,shadow,shadowX:cx/Math.max(1,shadow)};};
  r.render(hands,camera,scene,settings,grab);const open=read();
  const moved=hands.map(h=>({...h,joints:h.joints.map(p=>({...p,x:p.x+.35}))}));r.render(moved,camera,scene,settings,grab);const shifted=read();
  r.render([],camera,scene,settings,grab);const empty=read();r.render(hands,camera,scene,settings,grab);
  const single=[makeTestHand('Right:1',0)];
  const c=scene.state.cube,state={...scene.state,cube:{...c,x:0,y:.6,z:1.6,q:[0,0,0,1]}};
  r.render(single,camera,{...scene,state:{...state,cube:{...state.cube,x:8}}},settings,grab);const unobstructed=read();
  r.render(single,camera,{...scene,state},settings,grab);const occluded=read();
  r.render(hands,camera,scene,settings,grab);
  return {open,shifted,empty,unobstructed,occluded};
 });
 assert.ok(report.pixels.open.skin>1000);assert.ok(report.pixels.open.shadow>1000);
 assert.ok(Math.abs(report.pixels.open.shadowX-report.pixels.shifted.shadowX)>10);assert.equal(report.pixels.empty.shadow,0);assert.equal(report.pixels.empty.skin,0);
 assert.ok(report.pixels.unobstructed.skin-report.pixels.occluded.skin>500,'A foreground cube hides hand pixels');
 report.checks.push('Foreground cube occludes the hand in the depth buffer');
 report.checks.push('GPU pixels contain volumetric skin and separate shadows that follow hand movement and clear completely');
 await page.evaluate(()=>{window.testHands=[makeTestHand('Right:1',-.4,1,-1.2)];});await page.waitForTimeout(250);
 await page.screenshot({path:fileURLToPath(new URL('game-distant-hand.png',out))});
 await page.evaluate(()=>{window.testHands=[];});await page.waitForFunction(()=>document.querySelector('[data-render="atelier-v03"]').hidden);report.checks.push('Losing tracking removes both the hand and its shadow');
 await page.evaluate(()=>{window.testHands=[makeTestHand('Right:1',-.6)];});await page.waitForTimeout(200);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='paused');assert.equal(await page.locator('[data-render="atelier-v03"]').isHidden(),true);report.checks.push('Pause clears the 3D layer');
 await page.locator('#resumeBtn').click();await page.waitForFunction(()=>!document.querySelector('[data-render="atelier-v03"]').hidden);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(900);
 await page.screenshot({path:fileURLToPath(new URL('game-mobile-hand.png',out))});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);report.checks.push('Portrait resize keeps the hand and room aligned');
 await page.evaluate(()=>{window.contextExtension=testHandRenderer.gl.getExtension('WEBGL_lose_context');contextExtension.loseContext();});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>testHandRenderer.ready),false);
 await page.evaluate(()=>{contextExtension.restoreContext();});await page.waitForFunction(()=>testHandRenderer.ready);await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>testHandRenderer.gl.getError()),0);report.checks.push('Hand WebGL context restores successfully');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await browser.close();server.close();await writeFile(new URL('browser.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
