/** Repeatable UI cost probe. No claim about hardware GPU performance. */
import {chromium, CHROME_PATH} from '../tests/helpers/browser-runtime.mjs';
import fs from 'node:fs/promises';
const label=process.argv[2]??'after',out='test-results/motion';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:CHROME_PATH,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({sound:false,quality:'low',effects:true,dynamicCamera:false}));
    window.__longTasks=[];
    new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Reproduce the same checkout's pre-change UI without mixing older catalogs.
  const baseline=process.env.PORTAL_MOTION_BASELINE_DIR;
  if(baseline)await page.route(/\/(src\/(app|ui)\.js|styles\/game\.css)(\?.*)?$/,async route=>{
    const pathname=new URL(route.request().url()).pathname.replace(/^\//,'');
    const body=await fs.readFile(`${baseline}/${pathname}`,'utf8');
    await route.fulfill({contentType:pathname.endsWith('.css')?'text/css':'text/javascript',body});
  });
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  await page.goto(process.env.PORTAL_TEST_URL??'http://127.0.0.1:8080');
  await page.waitForSelector('#startDialog[open]');
  await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  await page.screenshot({path:`${out}/${label}-home.png`});
  const data=await page.evaluate(async()=>{
    const {UI}=await import('/src/ui.js');let ui;
    const original=UI.prototype.dialog;
    UI.prototype.dialog=function(...args){ui=this;return original.apply(this,args);};
    document.querySelector('#startSettingsBtn').click();
    await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));
    const frames=[],actions=[];let running=true,previous;
    function tick(t){if(previous!==undefined)frames.push(t-previous);previous=t;if(running)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);
    const start=performance.now();window.__longTasks=[];
    for(let i=0;i<20;i++){
      const t=performance.now();
      ui.settingsTab(i%2?'controls':'scene');
      actions.push(performance.now()-t);
      await new Promise(resolve=>setTimeout(resolve,35));
    }
    await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));
    await new Promise(resolve=>requestAnimationFrame(resolve));running=false;
    const settle=document.getAnimations().filter(a=>a.playState==='running').length;
    const percentile=(list,p)=>[...list].sort((a,b)=>a-b)[Math.min(list.length-1,Math.floor(list.length*p))]??0;
    return {elapsed:performance.now()-start,frames:frames.length,frameMedianMs:percentile(frames,.5),frameP95Ms:percentile(frames,.95),framesOver34Ms:frames.filter(n=>n>34).length,actionP95Ms:percentile(actions,.95),longTasks:window.__longTasks.filter(t=>t.start>=start),runningAnimationsAfterSettle:settle};
  });
  await page.screenshot({path:`${out}/${label}-settings.png`});
  const metrics=await cdp.send('Performance.getMetrics');
  const report={label,date:new Date().toISOString(),browser:await browser.version(),node:process.version,viewport:{width:1280,height:900},baseline:baseline?'Original app/UI/CSS supplied through test routes':null,renderer:'Actual startup WebGL via SwiftShader; paused scene during UI measurement',scenario:'20 alternating controls/scene tabs at 35 ms; all final animations settled',data,errors,metrics:metrics.metrics};
  await fs.writeFile(`${out}/${label}-performance.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {await browser.close();}
