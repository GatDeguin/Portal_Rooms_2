/** UI contract tests. GL stub isolates navigation; real render evidence is separate. */
import {chromium,CHROME_PATH} from './helpers/browser-runtime.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const OUT=process.env.PORTAL_TEST_OUT??'test-results/motion',BASE=process.env.PORTAL_TEST_URL??'http://127.0.0.1:8080';
const stub=(await fs.readFile('tests/browser.py','utf8')).match(/STUB=r"""([\s\S]*?)"""/)[1];
await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:CHROME_PATH,headless:true});
const checks=[],errors=[];
async function fresh(mode='normal',options={}){
  const context=await browser.newContext({viewport:options.viewport??{width:1280,height:900},reducedMotion:mode==='reduced'?'reduce':'no-preference',hasTouch:options.touch??false});
  await context.addInitScript(stub);
  await context.addInitScript(({mode})=>{
    window.Worker=undefined;
    if(mode==='unsupported')Element.prototype.animate=undefined;
    localStorage.setItem('roomTiltGame.settings.v2',JSON.stringify({sound:false,haptic:false,quality:'low',effects:mode!=='off',dynamicCamera:false}));
    localStorage.setItem('roomTiltGame.progress.v2',JSON.stringify({version:2,current:0,unlocked:8,completed:[],bestTimes:Array(62).fill(null),attempts:Array(62).fill(0),restarts:Array(62).fill(0)}));
    window.__unhandled=[];window.addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)));
    window.__rafPending=new Set();const raf=window.requestAnimationFrame,cancel=window.cancelAnimationFrame;
    window.requestAnimationFrame=fn=>{const id=raf(t=>{window.__rafPending.delete(id);fn(t);});window.__rafPending.add(id);return id;};
    window.cancelAnimationFrame=id=>{window.__rafPending.delete(id);cancel(id);};
  },{mode});
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE);await page.waitForSelector('#startDialog[open]',{timeout:30000});
  await page.evaluate(async()=>{
    const {UI}=await import('/src/ui.js');
    const original=UI.prototype.dialog;
    UI.prototype.dialog=function(...args){window.__ui=this;return original.apply(this,args);};
    const {HandMenu}=await import('/src/hand-menu.js'),highlight=HandMenu.prototype.highlight;
    HandMenu.prototype.highlight=function(...args){window.__handMenu=this;return highlight.apply(this,args);};
  });
  return {context,page};
}
const click=(page,selector)=>page.locator(selector).evaluate(el=>el.click());
const phase=(page,value)=>page.waitForFunction(v=>document.querySelector('#app').dataset.phase===v,value);
const settle=page=>page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
async function check(name,fn){if(process.env.PORTAL_MOTION_FILTER&&!name.includes(process.env.PORTAL_MOTION_FILTER))return;try{const detail=await fn();checks.push({name,status:'passed',...detail});console.log('PASS',name);}catch(e){checks.push({name,status:'failed',error:e.stack});console.error('FAIL',name,e.message);}}
async function withPage(mode,fn,options){const {context,page}=await fresh(mode,options);try{return await fn(page);}finally{await context.close();}}
try {
  for(const mode of ['normal','reduced','off','unsupported'])await check(`entry persists attempts before presentation settles: ${mode}`,()=>withPage(mode,async page=>{
    const state=await page.evaluate(()=>{
      document.querySelector('#startBtn').click();
      return {phase:document.querySelector('#app').dataset.phase,focus:document.activeElement.id,attempts:JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).attempts[0]};
    });
    assert.equal(state.attempts,1);assert.equal(state.phase,['reduced','off'].includes(mode)?'playing':'transition');
    await phase(page,'playing');assert.equal(await page.evaluate(()=>document.activeElement.id),'gl');
    await page.keyboard.press('Escape');await phase(page,'paused');
    await click(page,'#pauseDialog [data-action="restart"]');await phase(page,'playing');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).attempts[0]),2);
  }));
  await check('nested panel back restores the invoking control',()=>withPage('normal',async page=>{
    await page.locator('#startSettingsBtn').focus();await click(page,'#startSettingsBtn');
    await page.locator('#settingsDialog [data-action="confirm-reset"]').focus();
    await click(page,'#settingsDialog [data-action="confirm-reset"]');await click(page,'#confirmDialog [data-action="back"]');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'confirm-reset');
    const visible=await page.evaluate(()=>{const r=document.activeElement.getBoundingClientRect(),d=document.querySelector('#settingsDialog').getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom;});
    assert.equal(visible,true,'restored focus must also be visible inside the scrollable dialog');
    await click(page,'#closeSettingsBtn');assert.equal(await page.evaluate(()=>document.activeElement.id),'startSettingsBtn');
    assert.equal(await page.locator('dialog[open]').count(),1);
  }));
  await check('filter preserves room node identity and selected content',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');
    await page.evaluate(()=>window.__card=document.querySelector('[data-preview-room="7"]'));
    await click(page,'[data-chapter="2"]');
    assert.equal(await page.evaluate(()=>window.__card===document.querySelector('[data-preview-room="7"]')),true);
    await click(page,'[data-preview-room="7"]');assert.equal(await page.textContent('#previewNumber'),'08');
    assert.equal(await page.getAttribute('[data-preview-room="7"]','aria-pressed'),'true');
    await click(page,'[data-chapter="0"]');
    assert.equal(await page.evaluate(()=>window.__card===document.querySelector('[data-preview-room="7"]')),true);
    await click(page,'[data-preview-room="41"]');assert.equal(await page.locator('#previewPlayBtn').isDisabled(),true);
    assert.equal(await page.textContent('#previewNumber'),'42');
  }));
  await check('refreshing a retained room preserves the hand target highlight',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');await settle(page);
    const state=await page.evaluate(()=>{
      const card=document.querySelector('[data-preview-room="0"]'),menu=window.__handMenu;
      menu.highlight(card);document.querySelector('[data-chapter="0"]').click();menu.highlight(card);
      return {identity:menu.target===card,highlight:card.classList.contains('hand-target')};
    });
    assert.deepEqual(state,{identity:true,highlight:true});
    return {fixture:'Production HandMenu highlight and DOM refresh; target supplied without webcam inference'};
  }));
  await check('selection border changes synchronously without a second apparent selected room',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');await settle(page);
    const result=await page.evaluate(()=>{
      document.querySelector('[data-preview-room="7"]').click();
      const color=getComputedStyle(document.querySelector('[data-preview-room="7"]')).borderTopColor;
      return {color,matching:[...document.querySelectorAll('.level-card')].filter(el=>getComputedStyle(el).borderTopColor===color).map(el=>el.dataset.previewRoom)};
    });
    assert.deepEqual(result.matching,['7'],'the new selected border must be unique from the first rendered style');
  }));
  for(const time of [0,90,175])await check(`reversing modal at ${time} ms discards stale presentation`,()=>withPage('normal',async page=>{
    await page.locator('#startSettingsBtn').focus();await click(page,'#startSettingsBtn');
    await page.evaluate(time=>{const a=window.__ui.motion.active.get(document.querySelector('#settingsDialog'));assertAnimation(a);a.pause();a.currentTime=time;function assertAnimation(a){if(!a)throw Error('Expected a modal animation to interrupt');}},time);
    await click(page,'#closeSettingsBtn');await click(page,'#startLevelsBtn');
    await settle(page);
    assert.equal(await page.locator('dialog[open]').getAttribute('id'),'levelsDialog');
    assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#settingsDialog')).transform),'none');
    assert.deepEqual(await page.evaluate(()=>window.__unhandled),[]);
  }));
  await check('reduced motion change during animation settles immediately and can resume',()=>withPage('normal',async page=>{
    await click(page,'#startSettingsBtn');
    await page.evaluate(()=>{const a=window.__ui.motion.active.get(document.querySelector('#settingsDialog'));a.pause();a.currentTime=90;});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#app').classList.contains('reduced-effects'));
    assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#settingsDialog')).transform),'none');
    await click(page,'#tab-scene');assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#effects'),'::after').transitionDuration),'0s');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('reduced-effects'));
    await click(page,'#tab-audio');assert.ok(await page.evaluate(()=>window.__ui.motion.active.size>0));
    await settle(page);assert.deepEqual(await page.evaluate(()=>window.__unhandled),[]);
  }));
  await check('effects preference disables a pending transition without changing navigation',()=>withPage('normal',async page=>{
    await click(page,'#startSettingsBtn');await click(page,'#tab-scene');
    await page.evaluate(()=>{const input=document.querySelector('#effects');input.checked=false;input.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);
    await click(page,'#tab-controls');assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);
    await click(page,'#closeSettingsBtn');assert.equal(await page.locator('dialog[open]').getAttribute('id'),'startDialog');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).effects),false);
  }));
  await check('20 navigation cycles keep one modal, bounded nodes and no animation or rAF leak',()=>withPage('normal',async page=>{
    const before=await page.locator('*').count();
    for(let i=0;i<20;i++){
      await click(page,'#startLevelsBtn');await click(page,'[data-chapter="2"]');await click(page,'[data-preview-room="7"]');
      await click(page,'[data-chapter="0"]');await click(page,'#levelsDialog [data-action="back"]');
      await click(page,'#startSettingsBtn');await click(page,'#tab-scene');await click(page,'#tab-controls');await click(page,'#closeSettingsBtn');
      assert.equal(await page.locator('dialog[open]').count(),1);
    }
    await settle(page);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    const after=await page.locator('*').count(),state=await page.evaluate(()=>({active:window.__ui.motion.active.size,raf:window.__rafPending.size,cards:window.__ui.levelCards.size,returns:window.__ui.returnFocus.size,unhandled:window.__unhandled}));
    assert.deepEqual({...state,returns:undefined},{active:0,raf:0,cards:62,returns:undefined,unhandled:[]});
    assert.ok(state.returns<=2);assert.ok(after-before<500,'only a bounded lazy selector collection is added');
    return {cycles:20,beforeNodes:before,afterNodes:after,...state};
  }));
  await check('fast selection and filter reversal settle on latest room without duplicates',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');
    const result=await page.evaluate(()=>{
      for(const chapter of [2,0,3,0,2,0])document.querySelector(`[data-chapter="${chapter}"]`).click();
      for(const room of [7,41,0,12,3,7])document.querySelector(`[data-preview-room="${room}"]`).click();
      return {number:document.querySelector('#previewNumber').textContent,selected:[...document.querySelectorAll('.level-card[aria-pressed="true"]')].map(el=>el.dataset.previewRoom),svg:document.querySelector('#selectedPreview title').textContent};
    });
    assert.equal(result.number,'08');assert.deepEqual(result.selected,['7']);assert.match(result.svg,/8/);
    await settle(page);assert.equal(await page.locator('.level-card').count(),62);
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.level-card')].every(el=>getComputedStyle(el).transform==='none')),true);
    assert.deepEqual(await page.evaluate(()=>window.__unhandled),[]);
  }));
  await check('expanding a chapter filter makes every new visible room immediately clickable',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');await settle(page);await click(page,'[data-chapter="2"]');await settle(page);
    const obstructed=await page.evaluate(()=>{
      document.querySelector('[data-chapter="0"]').click();
      return [...document.querySelectorAll('.level-card')].slice(0,9).map(el=>{
        const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.level-card');
        return hit===el?null:{room:el.dataset.previewRoom,hit:hit?.dataset.previewRoom};
      }).filter(Boolean);
    });
    assert.deepEqual(obstructed,[],'retained moving cards must not cover newly available room controls');
  }));
  await check('resize and scroll during filter settle into the actual layout',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');await settle(page);await click(page,'[data-chapter="2"]');
    const targets=await page.evaluate(()=>[...window.__ui.motion.active.keys()].map(el=>el.dataset.previewRoom??el.id));
    assert.ok(targets.includes('7'),'nearby retained room must animate its position');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>window.__ui.motion.active.size===0);
    await click(page,'[data-chapter="0"]');await page.locator('#levelsDialog').evaluate(el=>{el.scrollTop=200;});
    await settle(page);
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.level-card')].every(el=>getComputedStyle(el).transform==='none')),true);
    assert.equal(await page.locator('dialog[open]').count(),1);return {animatedTargetsBeforeResize:targets};
  }));
  await check('filter recovers focus if its focused room disappears',()=>withPage('normal',async page=>{
    await click(page,'#startLevelsBtn');await page.locator('[data-preview-room="0"]').focus();await click(page,'[data-chapter="2"]');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.chapter),'2');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')?.id),'levelsDialog');
  }));
  await check('visibility interruption clears transient motion and preserves paused state',()=>withPage('normal',async page=>{
    await click(page,'#startBtn');await page.keyboard.press('Escape');await phase(page,'paused');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.evaluate(()=>window.__ui.motion.active.size),0);assert.equal(await page.getAttribute('#app','data-phase'),'paused');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
    await click(page,'#resumeBtn');await phase(page,'playing');
  }));
  await check('touch viewport, long text and CSS zoom keep controls usable',()=>withPage('normal',async page=>{
    await page.tap('#startSettingsBtn');await page.tap('#tab-scene');
    await page.evaluate(()=>document.documentElement.style.zoom='1.25');
    await page.locator('#tab-controls').scrollIntoViewIfNeeded();await page.tap('#tab-controls');
    const geometry=await page.locator('#settingsDialog').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,scroll:el.scrollHeight>el.clientHeight}));
    assert.equal(geometry.overflow,false);
    await page.locator('#closeSettingsBtn').scrollIntoViewIfNeeded();await page.tap('#closeSettingsBtn');
    await page.locator('#startLevelsBtn').scrollIntoViewIfNeeded();await page.tap('#startLevelsBtn');
    await page.evaluate(()=>document.querySelector('#previewBriefing').textContent='Contenido largo para comprobar la lectura y el desplazamiento. '.repeat(12));
    assert.equal(await page.locator('#levelsDialog').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
    assert.equal(await page.locator('#levelsDialog').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true,'zoomed dialog must remain within the visible viewport');
    await page.locator('#levelsDialog [data-action="back"]').scrollIntoViewIfNeeded();await page.tap('#levelsDialog [data-action="back"]');
    await page.locator('#startBtn').scrollIntoViewIfNeeded();await page.tap('#startBtn');await phase(page,'playing');await page.tap('#pauseBtn');await phase(page,'paused');
    return {viewport:{width:390,height:844},cssZoom:1.25,longContent:'Preview briefing expanded to twelve sentences',...geometry};
  },{viewport:{width:390,height:844},touch:true}));
  await check('victory is persisted before check animation; reduced change leaves a full check',()=>withPage('normal',async page=>{
    await page.evaluate(async()=>{const {GameEngine}=await import('/src/physics.js');const reset=GameEngine.prototype.reset;GameEngine.prototype.reset=function(...args){window.__engine=this;return reset.apply(this,args);};});
    await click(page,'#startBtn');await phase(page,'playing');
    await page.evaluate(()=>{const e=window.__engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true,support:-1});});
    await phase(page,'victory');
    const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).completed);assert.ok(persisted.includes(0));
    assert.equal(await page.locator('#nextBtn').isDisabled(),false);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__ui.motion.active.size===0);
    assert.equal(await page.locator('.victory-mark path').evaluate(el=>getComputedStyle(el).strokeDashoffset),'0px');
    await click(page,'#nextBtn');await phase(page,'playing');
    return {fixture:'cube placed on actual target; completion event and persistence use production engine, not a traversal playtest'};
  }));
} finally {
  await fs.writeFile(`${OUT}/contracts.json`,JSON.stringify({mode:'DOM with declared WebGL stub',browser:await browser.version(),checks,errors},null,2));
  await browser.close();if(errors.length||checks.some(c=>c.status==='failed'))process.exitCode=1;
}
