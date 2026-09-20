#!/usr/bin/env node
/** Real app and real Worker scheduling; default driver is simulated Canvas2D, never WebGL. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const options={browser:process.env.CHROMIUM_PATH||undefined,playwright:process.env.PLAYWRIGHT_MODULE||'playwright',output:resolve(ROOT,'docs/RENDER-STABILITY-BROWSER.json'),real:false};
for(let i=2;i<process.argv.length;i++){const arg=process.argv[i];if(arg==='--real-worker-low')options.real=true;else if(arg==='--browser')options.browser=process.argv[++i];else if(arg==='--playwright')options.playwright=process.argv[++i];else if(arg==='--output')options.output=resolve(process.argv[++i]);else if(arg==='--help'){console.log('node tests/render-stability-browser.mjs [--output file] [--real-worker-low] [--browser executable] [--playwright package]');process.exit(0);}else throw Error('Unknown option '+arg);}
const DRIVER=String.raw`
// Test driver boundary only: production renderer, worker, app and storage modules run unchanged.
let testDrawDelay=0,testStartupDelayed=false,testHeavyDelayed=false;const testNativeCanvas=OffscreenCanvas;
self.addEventListener('message',event=>{if(event.data.type==='test-control'){testDrawDelay=event.data.drawDelayMs??0;event.stopImmediatePropagation();}});
self.OffscreenCanvas=class extends testNativeCanvas{
 getContext(kind,...args){
  if(kind!=='webgl')return super.getContext(kind,...args);
  const canvas=this,ctx=super.getContext('2d');let current=null,n=1;const constants=new Map();
  const tier=program=>program?.shaders?.some(s=>s.source?.includes('#define STEPS 176'))?'cinematic':program?.shaders?.some(s=>s.source?.includes('#define STEPS 136'))?'high':program?.shaders?.some(s=>s.source?.includes('#define STEPS 112'))?'medium':'low';
  return new Proxy({}, {get:(_,key)=>{
   if(key==='checkFramebufferStatus')return ()=>{if(!constants.has('FRAMEBUFFER_COMPLETE'))constants.set('FRAMEBUFFER_COMPLETE',n++);return constants.get('FRAMEBUFFER_COMPLETE');};
   if(key==='NO_ERROR')return 0;if(key==='getError')return ()=>0;
   if(key==='getExtension')return ()=>null;
   if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
   if(key==='getParameter')return ()=>[8192,8192];
   if(key==='shaderSource')return (shader,source)=>shader.source=source;
   if(key==='compileShader')return shader=>{if(!testHeavyDelayed&&testConfig.heavyDelay&&shader.source.includes('#define STEPS 176')){testHeavyDelayed=true;const end=performance.now()+testConfig.heavyDelay;while(performance.now()<end){}}if(!testStartupDelayed&&testConfig.startupDelay){testStartupDelayed=true;const end=performance.now()+testConfig.startupDelay;while(performance.now()<end){}}if(testConfig.cinematic==='fail'&&shader.source.includes('#define STEPS 176'))throw Error('Simulated Cinematic compiler failure');};
   if(key==='attachShader')return (program,shader)=>(program.shaders??=[]).push(shader);
   if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
   if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'';
   if(key==='getAttribLocation')return ()=>0;if(key==='getUniformLocation')return (_,name)=>name;
   if(key==='useProgram')return program=>current=program;
   if(key==='drawArrays')return ()=>{const mode=tier(current),ms=mode==='cinematic'&&testConfig.cinematic==='timeout'?1800:testDrawDelay,end=performance.now()+ms;while(performance.now()<end){}ctx.fillStyle={low:'#102030',medium:'#204030',high:'#405020',cinematic:'#603040'}[mode];ctx.fillRect(0,0,canvas.width,canvas.height);};
   if(key.startsWith('create'))return ()=>({});
   if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,n++);return constants.get(key);}
   return ()=>{};
  }});
 }
};
`;
const HARDWARE_REPORT=String.raw`
const ReportCanvas=OffscreenCanvas;
self.OffscreenCanvas=class extends ReportCanvas {
 getContext(kind,...args){const gl=super.getContext(kind,...args);if(kind==='webgl'&&gl){const debug=gl.getExtension('WEBGL_debug_renderer_info');self.postMessage({type:'test-backend',renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION),extensions:gl.getSupportedExtensions()});}return gl;}
};
`;
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),path=resolve(ROOT,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}
  let content=readFileSync(path);if(options.real&&path.endsWith('renderer-worker.js'))content=HARDWARE_REPORT+'\n'+content.toString();if(!options.real&&path.endsWith('renderer-worker.js'))content=`const testConfig=${JSON.stringify({cinematic:url.searchParams.get('cinematic'),startupDelay:Number(url.searchParams.get('startupDelay')),heavyDelay:Number(url.searchParams.get('heavyDelay'))})};\n${DRIVER}\n${content.toString()}`;
  if(!options.real&&path.endsWith('renderer-client.js'))content=content.toString().replace('RENDER_TIMEOUTS.frame','600').replace('preparationTimeout(tier??quality)','600');
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(path)]??'application/octet-stream','cache-control':'no-store'});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
const {chromium}=createRequire(import.meta.url)(options.playwright),checks=[],errors=[],diagnostics=[];let browser;
const progress={version:2,current:3,unlocked:4,completed:[0,1,2],bestTimes:[12,14,17,...Array(39).fill(null)],attempts:[2,3,4,5,...Array(38).fill(0)],restarts:[0,1,1,...Array(39).fill(0)]};
const check=(name,condition=true,detail={})=>{assert.ok(condition,name);checks.push({name,...detail});console.log('PASS '+name);};
async function pageFor(mode,query=''){
 const context=await browser.newContext({viewport:{width:800,height:600},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(options.real?60000:6000);page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(({mode,progress,simulation})=>{
  localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:mode,sound:false,haptic:false,dynamicCamera:false,effects:false}));localStorage.setItem('roomTiltGame.progress.v2',JSON.stringify(progress));
  window.__heartbeats=0;setInterval(()=>window.__heartbeats++,10);window.__workers=[];window.__gpuCalls=0;
  const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(path,opts){const absolute=new URL(path,location.href);absolute.search=location.search;super(absolute,opts);this.record={createdAt:performance.now(),frames:0,pending:0,maxPending:0,replies:0,ready:false,terminated:false,sizes:[]};window.__workers.push(this);this.addEventListener('message',({data})=>{if(data.type==='test-backend')this.record.backend=data;if(data.type==='preparing')this.record.preparingAt=performance.now();if(data.type==='prepared')this.record.preparedAt=performance.now();if(data.type==='error'){this.record.error=data.message;this.record.errorAt=performance.now();}if(data.type==='ready'){this.record.readyAt=performance.now();this.record.ready=true;this.record.quality=data.quality;this.record.bitmap=[data.bitmap?.width,data.bitmap?.height];}if(data.type==='frame'){this.record.pending--;this.record.replies++;this.record.quality=data.quality;}});}
   postMessage(packet,...args){if(packet.type==='init')this.record.mode=packet.quality;if(packet.type==='frame'){this.record.frames++;this.record.pending++;this.record.maxPending=Math.max(this.record.maxPending,this.record.pending);this.record.sizes.push(packet.size);}return super.postMessage(packet,...args);}
   terminate(){this.record.terminatedAt=performance.now();this.record.terminated=true;return super.terminate();}
  };
  if(simulation){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2'){window.__gpuCalls++;throw Error('Unexpected main-thread WebGL call during simulation');}return original.call(this,kind,...args);};}
 },{mode,progress,simulation:!options.real});
 await page.goto(url+query);return {page,context};
}
const phase=(page,value)=>page.waitForFunction(value=>document.getElementById('app').dataset.phase===value,value);
const saved=page=>page.evaluate(()=>({progress:localStorage.getItem('roomTiltGame.progress.v2'),quality:JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality}));
const records=page=>page.evaluate(()=>window.__workers.map(w=>w.record));
const settings=async page=>{await page.locator('#startSettingsBtn').click();await page.locator('#tab-scene').click();};
try{
 browser=await chromium.launch({executablePath:options.browser,headless:true,args:options.real?['--no-sandbox','--disable-dev-shm-usage','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer']});
 for(const mode of options.real?['low']:['auto','low','medium','high','cinematic']){
  const {page,context}=await pageFor(mode);
  if(options.real){
   await page.waitForFunction(()=>['menu','error'].includes(document.getElementById('app').dataset.phase));
   const observed=await page.evaluate(()=>({phase:document.getElementById('app').dataset.phase,error:document.getElementById('errorDetail').textContent,at:performance.now(),workers:__workers.map(w=>w.record),savedQuality:JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality}));diagnostics.push(observed);console.log(JSON.stringify(observed));
   assert.equal(observed.phase,'menu','Real Low startup failed: '+observed.error);
   check('real Low uses the requested NVIDIA D3D11 hardware backend',observed.workers.some(w=>/NVIDIA.*D3D11/i.test(w.backend?.renderer??'')),{backends:observed.workers.map(w=>w.backend)});
  }
  await phase(page,'menu');await page.waitForFunction(()=>document.getElementById('quality').getAttribute('aria-busy')==='false');await settings(page);const actual=await page.locator('#qualityActual').innerText(),storage=await saved(page),rows=await records(page);
  check(`stored ${mode} starts with usable image and preserved progress`,storage.quality===mode&&storage.progress===JSON.stringify(progress)&&rows[0].ready&&rows[0].bitmap[0]>2,{actual,firstBitmap:rows[0].bitmap});
  check(`stored ${mode} matches actual selection`,await page.locator('#quality').inputValue()===mode&&actual.includes({auto:'Baja',low:'Baja',medium:'Media',high:'Alta',cinematic:'Cinemática'}[mode]));
  if(!options.real)check(`stored ${mode} made no real main-thread WebGL call`,await page.evaluate(()=>__gpuCalls)===0);
  await context.close();
 }
 if(!options.real){
  {
   const {page,context}=await pageFor('auto','?startupDelay=450');await phase(page,'menu');await page.locator('#startBtn').click();await phase(page,'playing');const before=await saved(page);
   await page.evaluate(()=>__workers[0].dispatchEvent(new ErrorEvent('error',{message:'Controlled Auto worker failure',cancelable:true})));
   await phase(page,'paused');await page.waitForTimeout(40);const frozenTime=await page.locator('#roomTime').innerText(),rows=await records(page);
   check('Auto recovery pauses gameplay and warns before the replacement worker is ready',rows.length===2&&!rows[1].ready&&(await page.locator('#qualityState').innerText()).includes('recuperando'));
   await page.locator('#resumeBtn').click();await phase(page,'paused');await page.locator('#pauseDialog [data-action="restart"]').click();
   check('resume and restart remain paused during recovery without adding an attempt',await page.locator('#app').getAttribute('data-phase')==='paused'&&JSON.stringify(await saved(page))===JSON.stringify(before)&&!(await records(page))[1].ready);
   await page.waitForFunction(()=>__workers[1].record.ready);await page.waitForTimeout(80);
   check('successful Auto recovery stays paused and preserves elapsed display, saved mode and progress',await page.locator('#app').getAttribute('data-phase')==='paused'&&await page.locator('#roomTime').innerText()===frozenTime&&JSON.stringify(await saved(page))===JSON.stringify(before));await context.close();
  }
  {
   const {page,context}=await pageFor('cinematic','?heavyDelay=350');await phase(page,'menu');await page.waitForFunction(()=>__workers.length===2);await page.locator('#startBtn').click();await phase(page,'playing');const before=await saved(page);await page.waitForTimeout(120);
   check('playing continues to draw Low while the saved Cinematic candidate compiles', (await records(page))[0].frames>=2&&!(await records(page))[0].terminated&&!(await records(page))[1].terminated&&await page.locator('#quality').getAttribute('aria-busy')==='true');
   await page.waitForFunction(()=>__workers[1].record.ready&&__workers[0].record.terminated);await page.locator('#pauseBtn').click();await phase(page,'paused');
   check('saved startup candidate survives gameplay and replaces Low without rewriting preference or progress',JSON.stringify(await saved(page))===JSON.stringify(before)&&(await records(page))[1].quality.mode==='cinematic');await context.close();
  }
  {
   const {page,context}=await pageFor('cinematic','?cinematic=timeout');await phase(page,'menu');await page.waitForFunction(()=>__workers.length===2);
   const before=await saved(page),heart=await page.evaluate(()=>__heartbeats);await page.waitForTimeout(120);
   check('saved heavy quality shows usable Low and a cancellable pending preference in the menu',await page.locator('#startupQualityState').isVisible()&&(await page.locator('#startupQualityState').innerText()).includes('Preparando Cinemática')&&(await records(page))[0].ready&&await page.evaluate(()=>__heartbeats)>heart+5);
   await page.locator('#startupCancelQualityBtn').click();await page.waitForTimeout(25);
   check('cancelling saved startup preparation retains Low and the saved preference without retries',JSON.stringify(await saved(page))===JSON.stringify(before)&&(await records(page)).length===2&&!(await records(page))[0].terminated&&(await records(page))[1].terminated);await context.close();
  }
  {
   const {page,context}=await pageFor('auto','?startupDelay=450');await page.waitForFunction(()=>__workers.length===1&&__workers[0].record.preparingAt);
   const heart=await page.evaluate(()=>__heartbeats);await page.waitForTimeout(100);
   check('main UI heartbeat continues while the first Low worker is compiling',await page.evaluate(()=>__heartbeats)>heart+5);
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));await page.waitForTimeout(25);
   check('pagehide aborts startup before a renderer is assigned and starts no recovery', (await records(page)).length===1&&(await records(page))[0].terminated&&(await saved(page)).progress===JSON.stringify(progress));await context.close();
  }
  for(const failure of ['fail','timeout']){
   const {page,context}=await pageFor('cinematic','?cinematic='+failure);await phase(page,'menu');await page.waitForFunction(()=>document.getElementById('quality').getAttribute('aria-busy')==='false');await settings(page);const storage=await saved(page),rows=await records(page);
   check(`saved Cinematic ${failure} visibly recovers Low without rewriting preference or progress`,storage.quality==='cinematic'&&storage.progress===JSON.stringify(progress)&&(await page.locator('#qualityActual').innerText()).includes('Baja')&&(await page.locator('#qualityState').innerText()).includes('preferencia')&&rows.length===2&&!rows[0].terminated&&rows[1].terminated);
   await context.close();
  }
  {
   const {page,context}=await pageFor('low','?cinematic=timeout');await phase(page,'menu');await settings(page);const before=await saved(page),heart=await page.evaluate(()=>__heartbeats);await page.locator('#quality').selectOption('cinematic');await page.waitForFunction(()=>document.getElementById('quality').getAttribute('aria-busy')==='true');await page.waitForTimeout(180);const beats=await page.evaluate(()=>__heartbeats)-heart;
   await page.locator('#tab-controls').click();check('UI heartbeat and settings tabs respond while candidate Worker is synchronously hung',beats>=8&&await page.locator('#settings-controls').isVisible(),{heartbeatTicks:beats});
   await page.waitForFunction(()=>document.getElementById('quality').getAttribute('aria-busy')==='false');await page.locator('#tab-scene').click();check('Cinematic first-draw timeout retains working renderer and saved data',JSON.stringify(await saved(page))===JSON.stringify(before)&&(await records(page))[0].terminated===false&&await page.locator('#quality').inputValue()==='low');
   await page.locator('#quality').selectOption('cinematic');await page.locator('#cancelQualityBtn').click();check('explicit cancel preserves working selection and progress',JSON.stringify(await saved(page))===JSON.stringify(before));await context.close();
  }
  {
   const {page,context}=await pageFor('auto');await phase(page,'menu');await page.evaluate(()=>__workers[0].postMessage({type:'test-control',drawDelayMs:120}));await page.locator('#startBtn').click();await phase(page,'playing');await page.waitForTimeout(500);await page.setViewportSize({width:900,height:640});await page.waitForTimeout(180);await page.locator('#pauseBtn').click();await phase(page,'paused');const rows=await records(page),before=await saved(page);
   check('playing backpressure sends at most one frame per worker while retaining latest resize',rows[0].maxPending===1&&rows[0].frames>=2&&rows[0].sizes.some(s=>s.width===900),{frames:rows[0].frames,maxPending:rows[0].maxPending});
   await page.evaluate(()=>__workers[0].postMessage({type:'test-control',drawDelayMs:1800}));await page.locator('#resumeBtn').click();await phase(page,'playing');await page.waitForTimeout(100);await page.locator('#pauseBtn').click();await phase(page,'paused');const heart=await page.evaluate(()=>__heartbeats);await page.waitForFunction(()=>__workers.length===2&&__workers[1].record.ready);await page.waitForTimeout(50);const after=await saved(page);
   check('paused busy Auto worker watchdog recovers once and keeps UI responsive',await page.evaluate(()=>__heartbeats)>heart+15&&(await records(page))[0].terminated,{workers:(await records(page)).length});
   check('worker recovery preserves progress after the legitimate attempt start',JSON.stringify(after)===JSON.stringify(before));
   await page.evaluate(()=>__workers[1].postMessage({type:'test-control',drawDelayMs:1800}));await page.locator('#resumeBtn').click();await phase(page,'playing');await page.waitForTimeout(100);await page.locator('#pauseBtn').click();await phase(page,'error');check('second Auto worker failure ends bounded recovery without creating worker loop',(await records(page)).length===2&&JSON.stringify(await saved(page))===JSON.stringify(before));await context.close();
  }
 }
 check('no uncaught app exceptions',errors.length===0,{errors});
}catch(error){errors.push(error.stack??String(error));process.exitCode=1;console.error(error);}
finally{
 if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));mkdirSync(dirname(options.output),{recursive:true});writeFileSync(options.output,JSON.stringify({schema:1,executedAt:new Date().toISOString(),backend:options.real?'Real Chromium app + real Worker WebGL Low smoke':'Real Chromium app + real Worker; simulated WebGL driver using software Canvas2D; GPU disabled',runtimeTestTimeoutMs:options.real?{lowPrepare:60000,mediumPrepare:90000,heavyPrepare:180000,frame:12000}:600,diagnostics,checks,errors},null,2)+'\n');console.log(options.output);
}
