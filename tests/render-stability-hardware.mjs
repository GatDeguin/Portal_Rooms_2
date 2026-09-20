#!/usr/bin/env node
/** Opt-in real NVIDIA/D3D11 smoke. No simulated GL, workers, timings or deadlines. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {drawingSize} from '../src/quality.js';
import {RENDER_TIMEOUTS,preparationTimeout} from '../src/renderer.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const options={browser:process.env.CHROMIUM_PATH||(existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),playwright:process.env.PLAYWRIGHT_MODULE||'playwright',output:resolve(ROOT,'test-results/stability-hardware/report.json'),timeoutMs:240000};
for(let i=2;i<process.argv.length;i++){
 const arg=process.argv[i];
 if(arg==='--help'){console.log('node tests/render-stability-hardware.mjs [--output report.json] [--browser executable] [--playwright package] [--timeout-ms 240000]\nRequires exclusive GPU access. Real NVIDIA D3D11 only; no driver stubs. Uses PLAYWRIGHT_MODULE / CHROMIUM_PATH.');process.exit(0);}
 if(!['--output','--browser','--playwright','--timeout-ms'].includes(arg)||!process.argv[i+1])throw Error('Invalid argument '+arg);
 const value=process.argv[++i];if(arg==='--output')options.output=resolve(value);else if(arg==='--timeout-ms')options.timeoutMs=Number(value);else options[arg.slice(2)]=value;
}
assert.ok(Number.isFinite(options.timeoutMs)&&options.timeoutMs>=1000&&options.timeoutMs<=360000,'Global watchdog must be between 1s and 6min');
// Observation only: every context, shader, draw and worker message remains native.
const HARDWARE_REPORT=String.raw`
const ReportCanvas=OffscreenCanvas;
self.OffscreenCanvas=class extends ReportCanvas {
 getContext(kind,...args){const gl=super.getContext(kind,...args);if(kind==='webgl'&&gl){const debug=gl.getExtension('WEBGL_debug_renderer_info');self.postMessage({type:'test-backend',renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),version:gl.getParameter(gl.VERSION),extensions:gl.getSupportedExtensions()});}return gl;}
};
`;
const progress={version:2,current:3,unlocked:4,completed:[0,1,2],bestTimes:[12,14,17,...Array(39).fill(null)],attempts:[2,3,4,5,...Array(38).fill(0)],restarts:[0,1,1,...Array(39).fill(0)]};
const savedSettings={quality:'cinematic',sound:false,haptic:false,dynamicCamera:false,effects:false};
const report={schema:1,status:'running',executedAt:new Date().toISOString(),backend:'Real Chromium application + native workers/WebGL; NVIDIA D3D11 required',coldStart:'Fresh browser process/profile; Chromium shader disk cache disabled. Driver cache is not cleared.',budgets:{lowPrepareMs:preparationTimeout('low'),cinematicPrepareMs:preparationTimeout('cinematic'),frameMs:RENDER_TIMEOUTS.frame,lowMenuMs:65000,globalMs:options.timeoutMs},checks:[],errors:[],snapshots:[]};
mkdirSync(dirname(options.output),{recursive:true});
const save=()=>writeFileSync(options.output,JSON.stringify(report,null,2)+'\n');
const check=(name,condition,details={})=>{assert.ok(condition,name);report.checks.push({name,...details});save();console.log('PASS '+name);};
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),path=resolve(ROOT,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}
  let content=readFileSync(path);if(path===resolve(ROOT,'src/renderer-worker.js'))content=HARDWARE_REPORT+'\n'+content.toString();
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(path)]??'application/octet-stream','cache-control':'no-store'});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browserServer,browser,page,globalTimer,deadline;
const killOwnedBrowser=()=>{const child=browserServer?.process();if(!child?.pid)return;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000});else child.kill('SIGKILL');};
const records=()=>page.evaluate(()=>({at:performance.now(),phase:document.getElementById('app')?.dataset.phase,error:document.getElementById('errorDetail')?.textContent,qualityBusy:document.getElementById('quality')?.getAttribute('aria-busy'),qualityMessage:document.getElementById('startupQualityState')?.textContent,canvas:[document.getElementById('gl')?.width,document.getElementById('gl')?.height],...window.__hardware,settings:localStorage.getItem('roomTiltGame.settings.v2'),progress:localStorage.getItem('roomTiltGame.progress.v2')}));
async function snapshot(label){const data=await records();report.snapshots.push({label,...data});save();return data;}
// Each browser wait is <=30s; all retries share fixed absolute phase/global deadlines.
async function waitFor(label,predicate,arg,timeoutMs){
 const end=Math.min(deadline,Date.now()+timeoutMs);report.activePhase=label;save();
 while(Date.now()<end){
  try{await page.waitForFunction(predicate,arg,{timeout:Math.min(30000,Math.max(1,end-Date.now())),polling:100});return;}
  catch(error){if(error.name!=='TimeoutError')throw error;const observed=await snapshot('waiting: '+label);if(observed.phase==='error')throw Error(observed.error||'Application entered error phase');const failedWorker=observed.workers.find(w=>w.error);if(failedWorker)throw Error('Worker '+failedWorker.id+': '+failedWorker.error);console.log('WAIT '+label+' '+Math.round(observed.at)+'ms');}
 }
 throw Error('Timed out: '+label);
}
async function scenario(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=createRequire(import.meta.url)(options.playwright);
 browserServer=await chromium.launchServer({executablePath:options.browser,headless:true,timeout:30000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-shader-disk-cache']});
 browser=await chromium.connect(browserServer.wsEndpoint());
 const context=await browser.newContext({viewport:{width:800,height:600},deviceScaleFactor:1,reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>report.errors.push({kind:'pageerror',message:String(error)}));
 page.on('console',message=>{if(message.type()==='error')report.errors.push({kind:'console',message:message.text()});});
 await page.addInitScript(({progress,savedSettings})=>{
  localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify(savedSettings));localStorage.setItem('roomTiltGame.progress.v2',JSON.stringify(progress));
  const data=window.__hardware={workers:[],beats:0,maxHeartbeatGapMs:0,preparationBeats:0,maxPreparationHeartbeatGapMs:0,storageWrites:[],lowRepliesDuringPreparation:0,firstLowReplyDuringPreparationAt:null};let previousBeat=performance.now();
  setInterval(()=>{const now=performance.now(),gap=now-previousBeat;previousBeat=now;data.beats++;data.maxHeartbeatGapMs=Math.max(data.maxHeartbeatGapMs,gap);if(data.workers.some(w=>w.mode==='cinematic'&&w.preparingAt&&!w.preparedAt&&!w.terminated)){data.preparationBeats++;data.maxPreparationHeartbeatGapMs=Math.max(data.maxPreparationHeartbeatGapMs,gap);}},50);
  const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage&&key.startsWith('roomTiltGame.'))data.storageWrites.push({at:performance.now(),key,value:String(value)});return setItem.call(this,key,value);};
  const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(path,options){super(path,options);const record=this.record={id:data.workers.length,createdAt:performance.now(),frames:0,replies:0,pending:0,maxPending:0,ready:false,terminated:false,events:[]};data.workers.push(record);
    this.addEventListener('message',({data:message})=>{
     const now=performance.now();
     if(message.type==='test-backend')record.backend=message;
     if(message.type==='preparing')record.preparingAt=now;
     if(message.type==='prepared')record.preparedAt=now;
     if(message.type==='error'){record.error=message.message;record.errorAt=now;}
     if(message.type==='ready'||message.type==='frame'){
      record.quality=message.quality;record.bitmap=[message.bitmap?.width,message.bitmap?.height];record.lastRenderMs=message.renderMs;record.timing=message.timing;
      if(message.type==='ready'){record.ready=true;record.readyAt=now;record.firstRenderMs=message.renderMs;record.firstBitmap=record.bitmap;}
      else{record.pending--;record.replies++;record.lastReplyAt=now;if(record.mode==='low'&&data.workers.some(w=>w.mode==='cinematic'&&w.preparingAt&&!w.preparedAt&&!w.terminated)&&document.getElementById('app')?.dataset.phase==='playing'){data.lowRepliesDuringPreparation++;data.firstLowReplyDuringPreparationAt??=now;}}
      if(record.events.length<2000)record.events.push({type:message.type,at:now,id:message.id,quality:message.quality,bitmap:record.bitmap,renderMs:message.renderMs,timing:message.timing});
     }
    });
   }
   postMessage(packet,...args){if(packet.type==='init'){this.record.mode=packet.quality;this.record.prepareTimeoutMs=packet.prepareTimeoutMs;}if(packet.type==='frame'){this.record.frames++;this.record.pending++;this.record.maxPending=Math.max(this.record.maxPending,this.record.pending);this.record.lastRequestedSize=packet.size;}return super.postMessage(packet,...args);}
   terminate(){this.record.terminatedAt=performance.now();this.record.terminated=true;return super.terminate();}
  };
 },{progress,savedSettings});
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'commit',timeout:30000});
 await waitFor('usable Low menu',()=>['menu','error'].includes(document.getElementById('app')?.dataset.phase),null,65000);
 const low=await snapshot('Low menu');
 check('Low menu becomes usable within 65 seconds',low.phase==='menu'&&low.at<=65000,{firstLowUsableMs:low.workers[0]?.readyAt,menuObservedMs:low.at});
 check('saved preference and progress have not been rewritten at startup',low.settings===JSON.stringify(savedSettings)&&low.progress===JSON.stringify(progress)&&low.storageWrites.length===0);
 await waitFor('saved Cinematic candidate starts',()=>__hardware.workers.some(w=>w.mode==='cinematic'&&w.preparingAt)||document.getElementById('app').dataset.phase==='error',null,12000);
 const beforePlay=await snapshot('before playing');const candidate=beforePlay.workers.find(w=>w.mode==='cinematic');
 check('Cinematic is preparing while Low is the working renderer',candidate&&!candidate.ready&&!candidate.terminated&&beforePlay.workers[0].ready&&!beforePlay.workers[0].terminated&&beforePlay.qualityBusy==='true');
 for(const worker of beforePlay.workers){check('worker '+worker.id+' uses physical NVIDIA D3D11',/NVIDIA.*D3D11/i.test(worker.backend?.renderer??'')&&!/swiftshader|llvmpipe|software/i.test(worker.backend?.renderer??''),{backend:worker.backend});check('worker '+worker.id+' exposes real parallel shader compilation',worker.backend.extensions.includes('KHR_parallel_shader_compile'));}
 await page.locator('#startBtn').click();await waitFor('playing during preparation',()=>document.getElementById('app').dataset.phase==='playing',null,12000);
 await waitFor('Low replies and heartbeat during Cinematic compilation',()=>__hardware.lowRepliesDuringPreparation>=2&&__hardware.preparationBeats>=5,null,20000);
 const playing=await snapshot('playing during preparation');
 check('Low frames and UI heartbeat continue during compilation',playing.lowRepliesDuringPreparation>=2&&playing.preparationBeats>=5&&playing.maxPreparationHeartbeatGapMs<2000,{lowReplies:playing.lowRepliesDuringPreparation,heartbeats:playing.preparationBeats,maxGapMs:playing.maxPreparationHeartbeatGapMs});
 const expected=structuredClone(progress);expected.attempts[expected.current]++;
 check('playing changes only its legitimate attempt counter',playing.settings===JSON.stringify(savedSettings)&&playing.progress===JSON.stringify(expected));
 const remainingCandidate=preparationTimeout('cinematic')+RENDER_TIMEOUTS.frame-Math.max(0,playing.at-candidate.createdAt);
 await waitFor('Cinematic first usable frame and commit',()=>{const w=__hardware.workers.find(w=>w.mode==='cinematic');return w?.ready&&__hardware.workers[0].terminated&&document.getElementById('quality').getAttribute('aria-busy')==='false';},null,Math.max(1,remainingCandidate));
 await waitFor('Cinematic gameplay reply',()=>__hardware.workers.find(w=>w.mode==='cinematic')?.replies>=1,null,RENDER_TIMEOUTS.frame);
 const cinematic=await snapshot('Cinematic committed'),cine=cinematic.workers.find(w=>w.mode==='cinematic'),size=drawingSize(800,600,1,'cinematic',1);
 check('Cinematic commits its real frame at the expected drawing size',cine.quality.mode==='cinematic'&&cine.quality.tier==='cinematic'&&cine.bitmap[0]===size.width&&cine.bitmap[1]===size.height&&cinematic.canvas[0]===size.width&&cinematic.canvas[1]===size.height,{firstCinematicUsableMs:cine.readyAt,prepareMs:cine.preparedAt-cine.createdAt,firstDrawAndDeliveryMs:cine.readyAt-cine.preparedAt,firstRenderMs:cine.firstRenderMs,timing:cine.timing,bitmap:cine.bitmap});
 check('Cinematic adoption preserves preference and best times',cinematic.settings===JSON.stringify(savedSettings)&&cinematic.progress===JSON.stringify(expected));
 await page.locator('#pauseBtn').click();await waitFor('pause',()=>document.getElementById('app').dataset.phase==='paused',null,12000);
 await page.setViewportSize({width:900,height:640});
 const beforeResume=await snapshot('paused after resize'),priorReplies=beforeResume.workers.find(w=>w.mode==='cinematic').replies;
 await page.locator('#resumeBtn').click();await waitFor('resume and resized frame',prior=>{const w=__hardware.workers.find(w=>w.mode==='cinematic');return document.getElementById('app').dataset.phase==='playing'&&w?.replies>prior&&w.bitmap[0]===900&&w.bitmap[1]===640;},priorReplies,RENDER_TIMEOUTS.frame);
 await page.locator('#pauseBtn').click();await waitFor('final pause',()=>document.getElementById('app').dataset.phase==='paused',null,12000);
 const final=await snapshot('final');
 check('resize, pause and resume retain Cinematic without worker loss',final.workers.length===2&&!final.workers[1].terminated&&final.workers.every(w=>!w.error&&w.maxPending<=1)&&final.workers[1].quality.tier==='cinematic');
 check('UI heartbeat stays responsive through the complete Cinematic preparation',final.maxPreparationHeartbeatGapMs<2000&&final.preparationBeats>=Math.max(5,(cine.preparedAt-cine.preparingAt)/250),{preparationBeats:final.preparationBeats,maxGapMs:final.maxPreparationHeartbeatGapMs});
 check('rendering never writes saved settings or changes best times/progress',final.settings===JSON.stringify(savedSettings)&&final.progress===JSON.stringify(expected)&&final.storageWrites.every(w=>w.key!=='roomTiltGame.settings.v2'));
 check('no uncaught application or browser console errors',report.errors.length===0,{errors:report.errors});
 report.metrics={firstLowUsableMs:low.workers[0].readyAt,cinematicPreparationMs:cine.preparedAt-cine.createdAt,firstCinematicFrameMs:cine.readyAt,cinematicFirstRenderMs:cine.firstRenderMs,lowRepliesDuringPreparation:final.lowRepliesDuringPreparation,heartbeats:final.beats,preparationHeartbeats:final.preparationBeats,maxHeartbeatGapMs:final.maxHeartbeatGapMs};report.status='passed';delete report.activePhase;save();
}
try{
 deadline=Date.now()+options.timeoutMs;save();
 const watchdog=new Promise((_,reject)=>{globalTimer=setTimeout(()=>{const error=Error('Global hardware smoke watchdog expired after '+options.timeoutMs+'ms');report.errors.push({kind:'watchdog',message:error.message});save();killOwnedBrowser();reject(error);},options.timeoutMs);});
 await Promise.race([scenario(),watchdog]);
}catch(error){report.status='failed';report.errors.push({kind:'test',message:error.stack??String(error)});process.exitCode=1;console.error(error);}
finally{
 clearTimeout(globalTimer);
 if(page&&!page.isClosed()){let timer;try{await Promise.race([snapshot('cleanup'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('snapshot deadline')),2000);})]);}catch{}finally{clearTimeout(timer);}}
 if(browserServer){let closed=false,timer;try{await Promise.race([browserServer.close().then(()=>{closed=true;}).catch(()=>{}),new Promise(resolve=>{timer=setTimeout(resolve,5000);})]);}finally{clearTimeout(timer);if(!closed)killOwnedBrowser();}}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));save();console.log(options.output);
}
