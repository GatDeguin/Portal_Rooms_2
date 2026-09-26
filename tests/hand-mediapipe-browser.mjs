/** Online integration: real MediaPipe + real WebGL. Uses synthetic camera frames;
 * never requests the user's physical webcam. Google example photo is fetched at runtime.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const {chromium}=createRequire(import.meta.url)(arg('--playwright','playwright'));
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(arg('--output',resolve(root,'test-results/hand-mediapipe')));
await mkdir(out,{recursive:true});
const report={mode:'Real MediaPipe/WebGL; Chrome fake camera then an official hand image streamed through canvas; no physical webcam',checks:[],errors:[],console:[]};
const server=createServer(async(req,res)=>{
  try{
    const path=resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0])));
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    const body=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
const check=(name,value=true)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS',name);};
const pixels=()=>{const c=document.getElementById('handWorld'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n;};
try{
  browser=await chromium.launch({executablePath:arg('--browser',undefined),headless:true,args:['--enable-gpu',...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--ignore-gpu-blocklist','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const page=await browser.newPage({viewport:{width:1100,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(70000);
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:'low',sound:false,haptic:false,effects:false,dynamicCamera:false})));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>document.getElementById('app').dataset.phase==='menu');
  await page.evaluate(async()=>{const {HandTracking}=await import('./src/hand-tracking.js');const enable=HandTracking.prototype.enable;HandTracking.prototype.enable=function(...args){window.__hands=this;return enable.apply(this,args);};});
  await page.locator('#startHandsBtn').click();
  await page.waitForFunction(()=>window.__hands?.enabled&&document.getElementById('app').dataset.phase==='playing');
  await page.waitForFunction(()=>__hands.lastInference>0&&document.getElementById('handVideo').currentTime>.5);
  check('native camera stream starts and real MediaPipe performs inference');
  await page.keyboard.press('Escape');await page.locator('#pauseDialog [data-action=settings]').click();await page.locator('#settingsDialog [data-action=hands-off]').click();
  await page.evaluate(async()=>{
    const image=new Image();image.crossOrigin='anonymous';image.src='https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/woman_hands.jpg';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');
    window.__paintHands=true;const paint=()=>{ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);if(__paintHands)ctx.drawImage(image,0,0);};paint();window.__paintTimer=setInterval(paint,40);
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>canvas.captureStream(25)});
  });
  await page.locator('[data-action=hands]').click();await page.waitForFunction(()=>__hands.baseline&&__hands.latest.length>0);
  check('real model detects hands and completes calibration');
  await page.locator('#closeSettingsBtn').click();await page.locator('#resumeBtn').click();
  await page.waitForFunction(()=>document.getElementById('handFeedback').dataset.state==='open');
  check('21-joint hands reach the world renderer',await page.evaluate(()=>__hands.sample().every(h=>h.joints.length===21)));
  check('visible hand pixels are drawn over the room',await page.evaluate(pixels)>250);
  check('hand overlay does not intercept pointer input',await page.locator('#handWorld').evaluate(c=>getComputedStyle(c).pointerEvents==='none'));
  await page.screenshot({path:resolve(out,'hands-in-room.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);
  check('portrait hand overlay follows viewport',await page.locator('#handWorld').evaluate(c=>c.clientWidth===390&&c.clientHeight===844));
  check('portrait view still draws the detected hands',await page.evaluate(pixels)>250);
  await page.screenshot({path:resolve(out,'hands-portrait.png')});
  await page.evaluate(()=>window.__paintHands=false);await page.waitForFunction(()=>__hands.latest.length===0&&document.getElementById('handFeedback').dataset.state==='searching');
  check('losing the hand clears its drawing',await page.evaluate(pixels)===0);
  await page.evaluate(()=>window.__paintHands=true);await page.waitForFunction(()=>__hands.latest.length>0);
  await page.keyboard.press('Escape');check('pause hides the interaction guide',await page.locator('#handWorld').isHidden()&&await page.locator('#handFeedback').isHidden());
  await page.waitForFunction(()=>!document.getElementById('handMenuCursor').hidden&&document.getElementById('handMenuLayer').matches(':popover-open'));
  check('real detected hand controls a visible cursor above the pause menu',await page.locator('#handMenuCursor').isVisible());
  await page.screenshot({path:resolve(out,'hand-menu-real.png')});
  await page.locator('#pauseDialog [data-action=settings]').click();await page.locator('#settingsDialog [data-action=hands-off]').click();
  check('disable releases the camera and removes the guide',await page.evaluate(()=>!__hands.enabled&&document.getElementById('handVideo').srcObject===null));
  check('no uncaught browser errors',report.errors.length===0);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);process.exitCode=1;console.error(error);}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));}
