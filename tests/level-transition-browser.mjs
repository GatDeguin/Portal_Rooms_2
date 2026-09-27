import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {extname,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../test-results/level-transitions/',import.meta.url);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root.replace(/[\\/]$/,'')+sep))throw Error('Path');
 const body=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.bin':'application/octet-stream'})[extname(file)]||'application/octet-stream');res.end(body);
}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--enable-gpu','--ignore-gpu-blocklist',...(process.platform==='win32'?['--use-angle=d3d11']:[])]});
const report={mode:'Real Chrome WebGL + real worker, deterministic presentation clock and test completion fixture',checks:[],errors:[],consoleErrors:[]};
const page=await browser.newPage({viewport:{width:1100,height:760},reducedMotion:'no-preference'});page.setDefaultTimeout(90000);
const phase=async p=>page.waitForFunction(p=>document.getElementById('app')?.dataset.phase===p,p);
const shot=async name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
try{
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:'low',sound:false,haptic:false,effects:true,dynamicCamera:false}));window.__freezeSceneAnimation=true;});
 await page.route('**/src/app.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(new URL('../src/app.js',import.meta.url),'utf8'))+'\nwindow.__sceneProbe={engine,store,levelTransition,begin,action,renderer};'}));
 await page.route('**/src/level-transition.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(new URL('../src/level-transition.js',import.meta.url),'utf8'))+'\nconst advance=LevelTransition.prototype.advance;LevelTransition.prototype.advance=function(...args){return globalThis.__freezeSceneAnimation?this.done:advance.apply(this,args);};'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await phase('menu');
 await page.locator('#startBtn').click();await phase('transition');
 await page.evaluate(()=>__sceneProbe.levelTransition.elapsed=380);await page.waitForTimeout(350);await shot('entry-mid');
 assert.equal(await page.evaluate(()=>__sceneProbe.engine.state.elapsed),0);assert.equal(await page.evaluate(()=>__sceneProbe.engine.active),false);
 await page.locator('#pauseBtn').click();await phase('paused');const paused=await page.evaluate(()=>__sceneProbe.levelTransition.elapsed);await page.waitForTimeout(130);assert.equal(await page.evaluate(()=>__sceneProbe.levelTransition.elapsed),paused);
 await page.locator('#resumeBtn').click();await phase('transition');await page.evaluate(()=>window.__freezeSceneAnimation=false);await phase('playing');
 assert.equal(await page.evaluate(()=>__sceneProbe.levelTransition.sample()),null);report.checks.push('Entry animates, pauses/resumes, then starts physics from an unchanged attempt clock');
 await page.evaluate(()=>{window.__freezeSceneAnimation=true;const e=__sceneProbe.engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vy:0,vz:0,grounded:true});});await phase('completing');
 assert.equal(await page.locator('#victoryDialog').isVisible(),false);
 assert.equal(await page.evaluate(()=>__sceneProbe.store.progress.completed.includes(0)),true);
 const completedTime=await page.evaluate(()=>__sceneProbe.engine.state.elapsed);await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');assert.equal(await page.evaluate(()=>__sceneProbe.engine.state.elapsed),completedTime);
 await page.evaluate(()=>__sceneProbe.levelTransition.elapsed=450);await page.waitForTimeout(350);await shot('completion-mid');
 await page.locator('#pauseBtn').click();await phase('paused');await page.locator('#resumeBtn').click();await phase('completing');
 // Hold an actual worker response so the animation ends while the renderer is busy.
 await page.evaluate(()=>{const w=__sceneProbe.renderer.current.worker;window.__receiveFrame=w.onmessage;w.onmessage=e=>{if(e.data.type==='frame'&&!window.__heldFrame)window.__heldFrame=e;else __receiveFrame(e);};});
 await page.waitForFunction(()=>!!window.__heldFrame);
 await page.evaluate(()=>window.__freezeSceneAnimation=false);await phase('victory');
 assert.equal(await page.evaluate(()=>__sceneProbe.renderer.queued?.scene.transition?.scale),0,'The final disappearance frame must survive the victory dialog');
 await page.evaluate(()=>{const w=__sceneProbe.renderer.current.worker;w.onmessage=__receiveFrame;__receiveFrame(__heldFrame);});
 await page.waitForFunction(()=>!__sceneProbe.renderer.current.busy);
 report.checks.push('A delayed real worker response cannot discard the final disappearance frame');
 assert.equal(await page.evaluate(()=>__sceneProbe.engine.state.elapsed),completedTime);report.checks.push('Completion persists immediately, blocks input/time, pauses/resumes even with solved state, then shows victory');
 await page.evaluate(()=>window.__freezeSceneAnimation=true);await page.locator('#nextBtn').click();await phase('transition');assert.equal(await page.evaluate(()=>__sceneProbe.engine.state.level),1);assert.equal(await page.evaluate(()=>__sceneProbe.engine.state.elapsed),0);
 await page.emulateMedia({reducedMotion:'reduce'});await phase('playing');assert.equal(await page.evaluate(()=>__sceneProbe.levelTransition.sample()),null);report.checks.push('Next level has a fresh entrance; reduced motion cancels it cleanly');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const portal=await page.evaluate(()=>{const p=__sceneProbe;const i=p.engine.levels.findIndex(r=>r.target?.type===4&&!r.sequence);p.store.progress.unlocked=p.engine.levels.length;window.__freezeSceneAnimation=true;p.begin(i);return i;});assert.ok(portal>=0);
 await phase('transition');await page.evaluate(()=>__sceneProbe.levelTransition.elapsed=450);await page.waitForTimeout(350);await shot('portal-entry-mid');
 await page.evaluate(()=>window.__freezeSceneAnimation=false);await phase('playing');
 await page.evaluate(()=>{window.__freezeSceneAnimation=true;const e=__sceneProbe.engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vy:0,vz:0,grounded:true});});await phase('completing');
 await page.evaluate(()=>__sceneProbe.levelTransition.elapsed=450);await page.waitForTimeout(350);await shot('portal-completion-mid');
 await page.evaluate(()=>{__sceneProbe.store.setSettings({effects:false});});await phase('victory');
 report.checks.push('Wall portal and cube visibly animate; disabling effects finishes without trapping the victory flow');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.close();await writeFile(new URL('browser.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
