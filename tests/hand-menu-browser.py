#!/usr/bin/env python3
"""Menu gestures through the real tracking/DOM path with synthetic landmarks.
WebGL, model inference and camera are explicit test adapters; no physical webcam.
"""
import json,os
from playwright.sync_api import sync_playwright
from browser import ROOT,load_page,INSTRUMENT
OUT=ROOT/'test-results'/'hand-menu'
SETUP=r"""async()=>{
 const {HandTracking}=await import('portal/hand-tracking.js');const enable=HandTracking.prototype.enable;
 HandTracking.prototype.enable=function(...args){window.__tracker=this;return enable.apply(this,args);};
 window.__frame={landmarks:[]};window.__detections=0;
 HandTracking.prototype.load=async function(){this.landmarker={detectForVideo:()=>{__detections++;return __frame;},close(){}};};
 const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');
 setInterval(()=>{ctx.fillStyle=Date.now()%80<40?'#123':'#345';ctx.fillRect(0,0,32,32);},40);
 Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>c.captureStream(25)},configurable:true});
 window.__aimPoint=(px,py,pressed=false)=>{
   const x=1-(.1+.8*px/innerWidth),y=.1+.8*py/innerHeight,d=pressed?.005:.06;
   const points=Array.from({length:21},(_,i)=>({x:x+(i%4-1.5)*.025,y:y+.1+Math.floor(i/4)*.015,z:0}));
   points[0]={x,y:y+.24,z:0};points[5]={x:x-.07,y:y+.13,z:0};points[9]={x,y:y+.11,z:0};points[13]={x:x+.04,y:y+.12,z:0};points[17]={x:x+.08,y:y+.14,z:0};
   points[4]={x:x-d,y,z:0};points[8]={x:x+d,y,z:0};__frame={landmarks:[points],handednesses:[[{categoryName:'Right',score:1}]]};
 };
 window.__aim=(selector,pressed=false)=>{const r=document.querySelector(selector).getBoundingClientRect();__aimPoint(r.x+r.width/2,r.y+r.height/2,pressed);};
}"""
def main():
 OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[];report={'mode':'Real tracking processor and DOM; synthetic inference/camera, WebGL stub','checks':checks,'errors':errors}
 def check(name,ok=True):assert ok,name;checks.append(name);print('PASS',name,flush=True)
 def phase(page,value):page.wait_for_function('(p)=>document.getElementById("app").dataset.phase===p',arg=value)
 def aim(page,selector,pressed=False):page.evaluate('([s,p])=>__aim(s,p)',[selector,pressed])
 def click(page,selector):
  page.locator(selector).scroll_into_view_if_needed();aim(page,selector)
  page.wait_for_function('(s)=>document.querySelector(s).classList.contains("hand-target")',arg=selector)
  page.wait_for_function('__tracker.latest.some(h=>!h.pinch.active)');aim(page,selector,True)
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--disable-gpu','--disable-software-rasterizer'])
   page=browser.new_page(viewport={'width':1100,'height':800},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
   load_page(page,True);phase(page,'menu');page.evaluate(INSTRUMENT);page.evaluate(SETUP)
   page.locator('#startHandsBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)');page.evaluate('__tracker.baseline={scale:.14,y:.69}')
   page.keyboard.press('Escape');phase(page,'paused');aim(page,'#resumeBtn');page.wait_for_timeout(500)
   check('hand cursor remains visible over the native pause dialog',page.locator('#handMenuCursor').is_visible())
   check('hand target is highlighted',page.locator('#resumeBtn').evaluate('e=>e.classList.contains("hand-target")'))
   check('the cursor is in the top layer above the modal',page.locator('#handMenuLayer').evaluate('e=>e.matches(":popover-open")&&e.parentElement.id==="pauseDialog"'))
   before=page.evaluate('({time:__engine.state.elapsed,draws:__glCalls.draws,detections:__detections})');page.wait_for_timeout(200)
   check('menus keep tracking without advancing physics or redrawing the room',page.evaluate('(b)=>__engine.state.elapsed===b.time&&__glCalls.draws===b.draws&&__detections>b.detections',before))
   page.screenshot(path=str(OUT/'pause-hand.png'))
   click(page,'#resumeBtn');phase(page,'playing');check('pinch resumes gameplay and removes menu cursor',page.locator('#handMenuCursor').is_hidden())
   page.evaluate('()=>{const t=__engine.target;__engine.state.elapsed=12;Object.assign(__engine.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true});}');phase(page,'victory')
   aim(page,'#nextBtn',True);page.wait_for_timeout(350)
   check('a held gameplay pinch cannot dismiss level completion',page.locator('#app').get_attribute('data-phase')=='victory')
   aim(page,'#nextBtn');page.wait_for_function('document.getElementById("nextBtn").classList.contains("hand-target")')
   page.screenshot(path=str(OUT/'victory-hand.png'))
   click(page,'#nextBtn');phase(page,'playing');check('pinch on Next starts exactly the next level',page.evaluate('__engine.state.level')==1)
   page.wait_for_timeout(300);check('holding the pinch does not skip another level',page.evaluate('__engine.state.level')==1)
   page.keyboard.press('Escape');phase(page,'paused');click(page,'#pauseDialog [data-action=settings]');phase(page,'settings')
   page.wait_for_function('document.getElementById("handMenuLayer").parentElement.id==="settingsDialog"')
   check('cursor follows the newly opened dialog',page.locator('#handMenuLayer').evaluate('e=>e.parentElement.id==="settingsDialog"'))
   click(page,'#tab-audio');page.wait_for_function('!document.getElementById("settings-audio").hidden')
   before=page.locator('#sound').is_checked();click(page,'#sound');page.wait_for_function('(old)=>document.getElementById("sound").checked!==old',arg=before)
   check('pinch toggles a setting exactly once',page.locator('#sound').is_checked()!=before);page.wait_for_timeout(200);check('held pinch does not toggle it back',page.locator('#sound').is_checked()!=before)
   page.locator('#volume').scroll_into_view_if_needed();r=page.locator('#volume').bounding_box();page.evaluate('([x,y])=>__aimPoint(x,y,false)',[r['x']+r['width']*.2,r['y']+r['height']/2]);page.wait_for_timeout(250)
   page.evaluate('([x,y])=>__aimPoint(x,y,true)',[r['x']+r['width']*.2,r['y']+r['height']/2]);page.wait_for_timeout(200)
   page.evaluate('([x,y])=>__aimPoint(x,y,true)',[r['x']+r['width']*.8,r['y']+r['height']/2]);page.wait_for_timeout(250)
   check('holding a pinch drags a range setting',float(page.locator('#volume').input_value())>=.7)
   aim(page,'#tab-audio');page.wait_for_timeout(120)
   click(page,'#tab-scene');page.wait_for_function('!document.getElementById("settings-scene").hidden');old=page.locator('#quality').input_value();click(page,'#quality');page.wait_for_function('(old)=>document.getElementById("quality").value!==old',arg=old)
   check('pinch can choose the next graphics setting',page.locator('#quality').input_value()!=old)
   page.evaluate('()=>{window.__fullscreenRequests=0;document.documentElement.requestFullscreen=async()=>{__fullscreenRequests++;throw new DOMException("gesture required","NotAllowedError");};}')
   click(page,'#fullscreenBtn');page.wait_for_timeout(160)
   check('fullscreen explains its physical-click requirement instead of dispatching a failing gesture',page.evaluate('__fullscreenRequests===0') and 'Enter' in page.locator('#handMenuHint').inner_text())
   click(page,'#closeSettingsBtn');phase(page,'paused')
   aim(page,'#resumeBtn');page.wait_for_timeout(150);page.evaluate('__frame={landmarks:[]}');page.wait_for_function('document.getElementById("handMenuCursor").hidden')
   check('lost tracking removes the pointer and button highlight',not page.locator('.hand-target').count())
   aim(page,'#resumeBtn',True);page.wait_for_timeout(250);check('a returning closed pinch cannot resume by itself',page.locator('#app').get_attribute('data-phase')=='paused')
   aim(page,'#resumeBtn');page.wait_for_timeout(120);page.evaluate('Object.defineProperty(document,"hasFocus",{configurable:true,value:()=>false})')
   page.wait_for_function('document.getElementById("handMenuCursor").hidden');aim(page,'#resumeBtn',True);page.wait_for_timeout(80);page.evaluate('delete document.hasFocus');page.wait_for_timeout(200)
   check('regaining focus with a held pinch cannot click a menu',page.locator('#app').get_attribute('data-phase')=='paused')
   click(page,'#pauseDialog [data-action=menu]');phase(page,'menu')
   click(page,'#startSettingsBtn');phase(page,'settings');click(page,'[data-action=confirm-reset]');phase(page,'confirm')
   aim(page,'#confirmResetBtn',True);page.wait_for_timeout(200);check('held pinch cannot confirm destructive reset in a new dialog',page.locator('#app').get_attribute('data-phase')=='confirm' and page.evaluate('JSON.parse(localStorage.getItem("roomTiltGame.progress.v2")).unlocked')>=2)
   click(page,'#confirmDialog [data-action=back]');phase(page,'settings');click(page,'#closeSettingsBtn');phase(page,'menu')
   page.set_viewport_size({'width':390,'height':844});click(page,'#startLevelsBtn');phase(page,'selector')
   check('all chapter filters fit horizontally for hand navigation',page.locator('#chapterTabs').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
   last=page.locator('#chapterTabs [data-chapter]').last.get_attribute('data-chapter');click(page,f'#chapterTabs [data-chapter="{last}"]')
   page.wait_for_function('(id)=>document.querySelector(`[data-chapter="${id}"]`).getAttribute("aria-pressed")==="true"',arg=last)
   check('a pinch can select the last chapter on mobile',True)
   click(page,'#levelsDialog [data-action=back]');phase(page,'menu');click(page,'#startSettingsBtn');phase(page,'settings')
   click(page,'#tab-controls');page.wait_for_function('!document.getElementById("settings-controls").hidden')
   page.evaluate('document.getElementById("settingsDialog").scrollTop=0');r=page.locator('#settingsDialog').bounding_box()
   page.evaluate('([x,y])=>__aimPoint(x,y,false)',[r['x']+r['width']/2,r['y']+r['height']-8]);page.wait_for_function('document.getElementById("settingsDialog").scrollTop>100')
   check('edge scrolling continues past controls in a tall mobile menu',page.locator('#settingsDialog').evaluate('e=>e.scrollTop>100'))
   page.screenshot(path=str(OUT/'mobile-hand-menu.png'))
   click(page,'#tab-controls');page.wait_for_function('!document.getElementById("settings-controls").hidden');click(page,'#settingsDialog [data-action=hands-off]');page.wait_for_function('!__tracker.enabled')
   check('disabling the camera removes gesture controls',page.locator('#handMenuCursor').is_hidden() and not page.locator('.hand-target').count())
   check('no uncaught browser errors',not errors);report['status']='passed';browser.close()
 except Exception as e:report['status']='failed';report['failure']=str(e);raise
 finally:(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
