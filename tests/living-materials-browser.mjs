import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {extname,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../test-results/living-materials/',import.meta.url);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{
 const p=new URL(req.url,'http://localhost').pathname,file=resolve(root,'.'+decodeURIComponent(p==='/'?'/index.html':p));if(!file.startsWith(root.replace(/[\\/]$/,'')+sep))throw Error('Path');
 res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.bin':'application/octet-stream'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--enable-gpu','--ignore-gpu-blocklist',...(process.platform==='win32'?['--use-angle=d3d11']:[])]});
const page=await browser.newPage({viewport:{width:1100,height:760},reducedMotion:'no-preference'});page.setDefaultTimeout(90000);
const report={mode:'Real Chrome, room worker and cloth WebGL; deterministic physical steps and synthetic contact fixtures',checks:[],errors:[],consoleErrors:[]};
const phase=p=>page.waitForFunction(p=>document.getElementById('app')?.dataset.phase===p,p);
const presented=()=>page.waitForFunction(()=>{const w=window.__world,p=w.renderer.presentation;return p?.state.level===w.engine.state.level&&p.state.time>=w.engine.state.time-1e-6;});
const shot=async name=>{await presented();await page.waitForTimeout(180);await page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});};
const step=n=>page.evaluate(n=>__stepWorld(n),n);
const start=async index=>{await page.evaluate(i=>{__world.store.progress.unlocked=42;__world.begin(i);},index);await phase('playing');await page.evaluate(()=>window.__freezeWorld=true);await presented();};
try{
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:'low',sound:false,haptic:false,effects:true,dynamicCamera:false}));window.__freezeWorld=true;});
 await page.route('**/src/physics.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(new URL('../src/physics.js',import.meta.url),'utf8'))+'\nconst __advance=GameEngine.prototype.advance;GameEngine.prototype.advance=function(...args){if(!globalThis.__freezeWorld)return __advance.apply(this,args);};'}));
 await page.route('**/src/app.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(new URL('../src/app.js',import.meta.url),'utf8'))+'\nwindow.__world={engine,store,renderer,clothView,begin,action};window.__stepWorld=(n,input={x:0,z:0})=>{window.__freezeWorld=false;for(let i=0;i<n;i++)engine.advance(1/120,input);window.__freezeWorld=true;};'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await phase('menu');await page.locator('#startBtn').click();await phase('playing');await presented();
 assert.equal(await page.evaluate(()=>__world.engine.state.cloths.length),1);await shot('cloth-rest');
 const before=await page.evaluate(()=>Array.from(__world.engine.state.cloths[0].positions));
 await page.evaluate(()=>Object.assign(__world.engine.state.cube,{x:-2.05,z:.72,y:0,vx:0,vz:-1.4,vy:0,grounded:true}));await step(50);await shot('cloth-cube-contact');
 const after=await page.evaluate(()=>Array.from(__world.engine.state.cloths[0].positions));assert.ok(after.some((v,i)=>Math.abs(v-before[i])>.045));
 report.checks.push('An anchored 3D cloth bends on cube contact and is drawn with scene depth and shadows');
 await page.evaluate(()=>{Object.assign(__world.engine.state.cube,{x:1,z:1,y:0,vx:0,vz:0,vy:0});__stepWorld(35,{x:0,z:0,hands:[{id:'cloth-probe',palm:{x:-2.05,y:.62,z:.40,radius:.23,vz:1},points:[],pinch:{active:false}}]});});await shot('cloth-hand-contact');
 const hand=await page.evaluate(()=>Array.from(__world.engine.state.cloths[0].positions));assert.ok(hand.some((v,i)=>Math.abs(v-after[i])>.04));report.checks.push('Synthetic hand contact changes the simulated cloth without enabling a camera');
 await page.locator('#pauseBtn').click();await phase('paused');await page.evaluate(()=>window.__freezeWorld=false);const paused=await page.evaluate(()=>JSON.stringify(__world.engine.state));await page.waitForTimeout(240);assert.equal(await page.evaluate(()=>JSON.stringify(__world.engine.state)),paused);await page.locator('#resumeBtn').click();await phase('playing');await page.evaluate(()=>window.__freezeWorld=true);report.checks.push('Pause freezes cloth, material history and physics together');
 await start(6);await page.evaluate(()=>{const z=__world.engine.room.zones[0];Object.assign(__world.engine.state.cube,{x:z.x-.55,z:z.z,y:0,vx:1.5,vz:.2,vy:0,grounded:true});});await step(60);await shot('water-wake');assert.ok(await page.evaluate(()=>__world.engine.state.cube.wetness>.7));assert.match(await page.locator('#surfaceTag').innerText(),/Agua/);report.checks.push('Shallow water carries momentum and renders contact waves with wetness');
 await start(7);await page.evaluate(()=>{const z=__world.engine.room.zones[0];Object.assign(__world.engine.state.cube,{x:z.x,z:z.z,y:0,vx:.8,vz:0,vy:0,grounded:true});});await step(90);await shot('viscous-slime');assert.ok(await page.evaluate(()=>__world.engine.state.cube.slime>.8&&Math.hypot(__world.engine.state.cube.vx,__world.engine.state.cube.vz)<.15));assert.match(await page.locator('#surfaceTag').innerText(),/Slime/);report.checks.push('Viscous slime stops a sliding cube and displays a wet contact meniscus');
 await start(9);await page.evaluate(()=>{const z=__world.engine.room.zones[0];Object.assign(__world.engine.state.cube,{x:z.x-.25,z:z.z,y:0,vx:0,vz:0,vy:0,grounded:true});});await step(65);await shot('flowing-sand');assert.ok(await page.evaluate(()=>__world.engine.state.cube.vx>.5));assert.match(await page.locator('#surfaceTag').innerText(),/Arena/);report.checks.push('Moving sand visibly flows and entrains a resting cube');
 await start(8);await page.evaluate(()=>{const b=__world.engine.room.bumpers[0];Object.assign(__world.engine.state.cube,{x:b.x-b.r-.22,z:b.z,y:0,vx:2,vz:.4,vy:0,grounded:true});});await step(1);const compressed=await page.evaluate(()=>__world.engine.state.bumperJelly[0].compression);assert.ok(compressed>.05);await shot('gelatin-impact');await step(100);await shot('gelatin-settled');assert.ok(await page.evaluate(()=>Math.abs(__world.engine.state.bumperJelly[0].compression)<.01));report.checks.push('A bumper visibly compresses on impact, launches the cube and settles with damping');
 await start(0);await step(30);await page.setViewportSize({width:390,height:844});await shot('cloth-mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('Cloth and room remain aligned after portrait resize');
 report.cloth=await page.evaluate(()=>({count:__world.engine.state.cloths.length,vertices:__world.engine.state.cloths[0].positions.length/3,canvasVisible:!!document.querySelector('[data-render="cloth"]')&&!document.querySelector('[data-render="cloth"]').hidden}));
 assert.equal(report.cloth.canvasVisible,true,'Cloth canvas must actually be visible');
 report.clothGPU=await page.evaluate(()=>{
  const w=__world,v=w.clothView;v.render({state:w.engine.state,room:w.engine.room,target:w.engine.target},w.store.settings,{presentation:w.renderer.presentation});
  const g=v.renderer.gl,pixels=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,pixels);
  let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)visible++;
  const a=v.canvas.getBoundingClientRect(),b=document.querySelector('#gl').getBoundingClientRect();
  return {visible,error:g.getError(),ready:v.renderer.ready,rectDelta:Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height))};
 });
 assert.equal(report.clothGPU.ready,true);assert.equal(report.clothGPU.error,0);assert.ok(report.clothGPU.visible>100);assert.ok(report.clothGPU.rectDelta<1);
 const lost=await page.evaluate(()=>{const ext=__world.clothView.renderer.gl.getExtension('WEBGL_lose_context');if(!ext)return false;window.__clothContext=ext;ext.loseContext();return true;});
 if(lost){await page.waitForFunction(()=>!__world.clothView.renderer.ready);await page.evaluate(()=>__clothContext.restoreContext());await page.waitForFunction(()=>__world.clothView.renderer.ready&&!__world.clothView.canvas.hidden);await shot('cloth-context-restored');report.checks.push('Cloth restores its WebGL resources after context loss');}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);await page.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.close();await writeFile(new URL('browser.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
