/** Temporal screenshots of the real WebGL scene; animations paused at known times. */
import {chromium,CHROME_PATH} from './helpers/browser-runtime.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const OUT='test-results/motion/visual';await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:CHROME_PATH,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[],externalRequests=[];
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({quality:'low',sound:false,dynamicCamera:false,effects:true}));
    localStorage.setItem('roomTiltGame.progress.v2',JSON.stringify({version:2,current:0,unlocked:8,completed:[],bestTimes:Array(62).fill(null),attempts:Array(62).fill(0),restarts:Array(62).fill(0)}));
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))externalRequests.push(r.url());});
  await page.goto(process.env.PORTAL_TEST_URL??'http://127.0.0.1:8080');await page.waitForSelector('#startDialog[open]');
  await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  await page.evaluate(async()=>{
    const {UI}=await import('/src/ui.js'),{GameEngine}=await import('/src/physics.js');
    const dialog=UI.prototype.dialog,reset=GameEngine.prototype.reset;
    UI.prototype.dialog=function(...args){window.__ui=this;return dialog.apply(this,args);};
    GameEngine.prototype.reset=function(...args){window.__engine=this;return reset.apply(this,args);};
  });
  const click=selector=>page.locator(selector).evaluate(el=>el.click());
  const snapshot=async(name,time)=>{
    const animations=await page.evaluate(time=>{
      const active=[...window.__ui.motion.active.entries()];
      for(const [,a] of active){a.pause();a.currentTime=time;}
      return active.map(([el,a])=>({target:el.id||el.dataset.previewRoom||el.tagName,duration:a.effect.getTiming().duration,time:a.currentTime}));
    },time);
    await page.screenshot({path:`${OUT}/${name}.png`,animations:'allow'});
    checks.push({name,time,animations});
  };
  await click('#startSettingsBtn');await snapshot('dialog-start',0);await snapshot('dialog-mid',90);await snapshot('dialog-final',180);
  await page.evaluate(()=>window.__ui.motion.cancelAll());
  await click('#closeSettingsBtn');await click('#startLevelsBtn');await page.evaluate(()=>window.__ui.motion.cancelAll());
  await click('[data-chapter="2"]');await snapshot('filter-mid',110);
  assert.ok(await page.evaluate(()=>[...window.__ui.motion.active.keys()].some(el=>el.matches('.level-card'))),'A nearby existing room must actually receive layout continuity');
  await page.evaluate(()=>window.__ui.motion.cancelAll());
  await click('[data-preview-room="7"]');await snapshot('preview-mid',70);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.querySelector('#levelsDialog').scrollTop=9999);await snapshot('selector-mobile',0);
  await click('#levelsDialog [data-action="back"]');await page.setViewportSize({width:1280,height:900});
  await click('#startBtn');await page.waitForFunction(()=>document.querySelector('#app').dataset.phase==='playing');
  await page.evaluate(()=>window.__ui.motion.cancelAll());await page.screenshot({path:`${OUT}/playing.png`});
  await page.evaluate(()=>{const e=window.__engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true,support:-1});});
  await page.waitForSelector('#victoryDialog[open]');await snapshot('victory-mid',120);await snapshot('victory-final',240);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__ui.motion.active.size===0);await page.screenshot({path:`${OUT}/victory-reduced.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
} finally {
  await fs.writeFile(`${OUT}/report.json`,JSON.stringify({browser:await browser.version(),renderer:'Real WebGL startup via SwiftShader; software renderer, no hardware certification',fixtures:'Victory capture uses placement on actual target; not route traversal',checks,errors,externalRequests},null,2));
  await browser.close();
}
