#!/usr/bin/env python3
"""App regressions: DOM events, real Web Audio gain, synthetic camera MediaStreams.
WebGL and the MediaPipe inference boundary are simulated; no physical webcam.
"""
import json,os
from playwright.sync_api import sync_playwright
from browser import ROOT,load_page
OUT=ROOT/'test-results'/'review-regressions'
INSTRUMENT=r"""async()=>{
 const {AudioFeedback}=await import('portal/audio.js');
 const unlock=AudioFeedback.prototype.unlock;
 AudioFeedback.prototype.unlock=function(...args){window.__audio=this;return unlock.apply(this,args);};
 const {HandView}=await import('portal/hand-view.js');const render=HandView.prototype.render;HandView.prototype.render=function(...args){window.__viewEngine=args[1];return render.apply(this,args);};
 const {HandTracking}=await import('portal/hand-tracking.js');
 const enable=HandTracking.prototype.enable;
 HandTracking.prototype.enable=function(...args){window.__tracker=this;return enable.apply(this,args);};
 window.__cameraRequests=0;window.__streams=[];
 window.__delayModel=()=>{window.__modelGate=new Promise(resolve=>window.__finishModel=resolve);};
 window.__delayModel();
 HandTracking.prototype.load=async function(){await window.__modelGate;this.landmarker={detectForVideo:()=>({landmarks:[]}),close(){}};};
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#123456';ctx.fillRect(0,0,32,32);
 setInterval(()=>{ctx.fillStyle=Date.now()%100<50?'#123456':'#234567';ctx.fillRect(0,0,32,32);},40);
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
   window.__cameraRequests++;const stream=canvas.captureStream(30);window.__streams.push(stream);return stream;
 }}});
}"""
def main():
    OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[]
    report={'mode':'DOM + real Web Audio + synthetic MediaStream; WebGL/MediaPipe simulated','checks':checks,'errors':errors}
    def check(name,condition=True):
        assert condition,name
        checks.append(name);print('PASS',name,flush=True)
    def phase(page,value):page.wait_for_function('(phase)=>document.getElementById("app").dataset.phase===phase',arg=value)
    def volume(page,value):page.locator('#volume').evaluate('(e,value)=>{e.value=String(value);e.dispatchEvent(new Event("input",{bubbles:true}));}',value)
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--disable-gpu','--disable-software-rasterizer'])
        context=browser.new_context(viewport={'width':1100,'height':760},reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        load_page(page,True);phase(page,'menu');page.evaluate(INSTRUMENT)
        page.locator('#startHandsBtn').click()
        check('model loading status is visible inside the home dialog',page.locator('#startHandStatus').is_visible() and 'MediaPipe' in page.locator('#startHandStatus').inner_text())
        check('pending hand start cannot be submitted twice',page.locator('#startHandsBtn').is_disabled())
        page.locator('#cancelHandsBtn').click();page.evaluate('__finishModel()');page.wait_for_function('__tracker.activation===null')
        check('home cancel prevents a late camera request',page.evaluate('__cameraRequests===0'))
        page.evaluate("()=>{window.__normalCamera=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('device busy','NotReadableError');};}")
        page.locator('#startHandsBtn').click();page.wait_for_function('document.getElementById("startHandStatus")?.dataset.state==="error"')
        check('camera failure remains visible in the menu with a retry action',page.locator('#startHandStatus').is_visible() and 'ocupada' in page.locator('#startHandStatus').inner_text() and page.locator('#startHandsBtn').is_enabled())
        page.locator('#startSettingsBtn').click()
        check('camera error remains visible when opening settings',page.locator('#settingsHandStatus').is_visible() and 'ocupada' in page.locator('#settingsHandStatus').inner_text())
        page.locator('#closeSettingsBtn').click();page.evaluate('navigator.mediaDevices.getUserMedia=__normalCamera;__delayModel()')
        page.locator('#startBtn').click();phase(page,'playing');page.keyboard.press('Escape');phase(page,'paused')
        page.locator('#pauseDialog [data-action=settings]').click();page.locator('#tab-audio').click()
        for value in [0,.2,1]:
            volume(page,value)
            observed=page.evaluate('({slider:+document.getElementById("volume").value,label:document.getElementById("volumeValue").textContent,saved:JSON.parse(localStorage.getItem("roomTiltGame.settings.v2")).volume,gain:__audio.master.gain.value})')
            check(f'volume {value} updates slider, percentage, save and audio gain',observed['slider']==value and observed['label']==f'{round(value*100)}%' and observed['saved']==value and abs(observed['gain']-value)<1e-6)
        page.locator('#sound').uncheck();volume(page,.35);check('muted audio stays silent when volume changes',page.evaluate('__audio.master.gain.value')==0)
        page.locator('#sound').check();check('unmute restores selected volume',abs(page.evaluate('__audio.master.gain.value')-.35)<1e-6)
        page.screenshot(path=str(OUT/'volume-fixed.png'))
        page.locator('#closeSettingsBtn').click();page.locator('#resumeBtn').click();phase(page,'playing');page.wait_for_function('__audio.context.state==="running"')
        check('resuming applies the selected volume',abs(page.evaluate('__audio.master.gain.value')-.35)<1e-6)
        load_page(page,True,reload=True);phase(page,'menu');page.evaluate(INSTRUMENT)
        page.locator('#startSettingsBtn').click();page.locator('#tab-audio').click()
        check('reload restores volume in the visible control',page.locator('#volume').input_value()=='0.35' and page.locator('#volumeValue').inner_text()=='35%')
        page.locator('#tab-controls').click();page.locator('[data-action=hands]').click();page.locator('#settingsDialog [data-action=hands-off]').click();page.evaluate('__finishModel()')
        page.wait_for_function('__tracker.activation===null');page.wait_for_timeout(80)
        check('cancel during model loading opens no camera',page.evaluate('__cameraRequests===0&&!__tracker.enabled&&document.getElementById("handVideo").srcObject===null'))
        page.evaluate('__delayModel()');page.evaluate('document.querySelector("[data-action=hands]").click();document.querySelector("[data-action=hands]").click();')
        page.evaluate('__finishModel()');page.wait_for_function('__tracker.enabled')
        check('double activation opens one real synthetic MediaStream',page.evaluate('__cameraRequests===1&&__streams[0].getTracks()[0].readyState==="live"'))
        page.locator('#settingsDialog [data-action=hands-off]').click();check('disable stops every created camera track',page.evaluate('__streams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))&&!__tracker.enabled'))
        page.locator('#closeSettingsBtn').click();phase(page,'menu');page.evaluate('__delayModel()')
        before=page.evaluate('JSON.parse(localStorage.getItem("roomTiltGame.progress.v2")).attempts[0]')
        page.evaluate('document.getElementById("startHandsBtn").click();document.getElementById("startHandsBtn").click();');page.evaluate('__finishModel()');phase(page,'playing')
        check('double hand-start creates exactly one gameplay attempt',page.evaluate('JSON.parse(localStorage.getItem("roomTiltGame.progress.v2")).attempts[0]')==before+1)
        page.wait_for_function('window.__viewEngine&&window.__tracker.enabled')
        page.evaluate("""()=>{
          const c=__viewEngine.state.cube,pinch={x:c.x,y:c.y+.24,z:c.z,active:true};
          const joints=Array.from({length:21},(_,i)=>({x:c.x+(i%4-1.5)*.12,y:c.y+.3+Math.floor(i/4)*.1,z:c.z}));joints[4]={...pinch};joints[8]={...pinch};
          const hand={id:'test:1',pinch,palm:{x:c.x,y:c.y+1,z:c.z,radius:.19},points:[],joints};
          window.__syntheticHands=[hand];window.__normalSample=__tracker.sample;__tracker.sample=()=>__syntheticHands;
        }""")
        page.wait_for_function('__viewEngine.handGrab==="test:1"&&document.getElementById("handFeedback").dataset.state==="grab"')
        check('physical cube grab is explained by visible feedback',page.locator('#handFeedback').is_visible() and 'Cubo agarrado' in page.locator('#handFeedback').inner_text())
        check('world hand is actually painted',page.evaluate('(()=>{const c=document.getElementById("handWorld");return c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);})()'))
        page.screenshot(path=str(OUT/'hand-grab.png'))
        for width,height in [(1100,760),(390,844),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            separated=page.evaluate("""()=>{
              const goal=document.getElementById('goalHold'),hidden=goal.hidden;goal.hidden=false;
              const a=goal.getBoundingClientRect(),b=document.getElementById('handFeedback').getBoundingClientRect();goal.hidden=hidden;
              return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;
            }""")
            check(f'hand feedback does not overlap goal stability at {width}x{height}',separated)
        page.set_viewport_size({'width':1100,'height':760})
        page.evaluate('__syntheticHands[0].pinch.active=false');page.wait_for_function('__viewEngine.handGrab===null&&document.getElementById("handFeedback").dataset.state==="open"')
        check('releasing the pinch changes the feedback back to open', 'Mano abierta' in page.locator('#handFeedback').inner_text())
        page.evaluate('()=>{__tracker.statusKind="active";__tracker.statusMessage="Pinza detectada";__syntheticHands=[];}')
        page.wait_for_function('document.getElementById("handFeedback").dataset.state==="searching"')
        check('lost tracking cannot retain a stale pinch message','Pinza' not in page.locator('#handFeedback').inner_text())
        check('lost tracking clears every hand pixel',page.evaluate('(()=>{const c=document.getElementById("handWorld");return !c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);})()'))
        page.evaluate('()=>{__tracker.sample=__normalSample;}')
        page.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}))');phase(page,'paused')
        check('pagehide stops the synthetic camera stream',page.evaluate('__streams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))'))
        page.evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))')
        page.locator('#pauseDialog [data-action=menu]').click();phase(page,'menu');page.evaluate('__delayModel()');page.locator('#startHandsBtn').click()
        page.locator('#startSettingsBtn').click();phase(page,'settings');page.evaluate('__finishModel()');page.wait_for_function('__tracker.enabled')
        check('late camera activation cannot start a room behind settings',page.locator('#app').get_attribute('data-phase')=='settings')
        page.locator('#settingsDialog [data-action=hands-off]').click()
        check('no uncaught page errors',not errors);context.close();browser.close();report['status']='passed'
    except Exception as error:
      report['status']='failed';report['failure']=str(error)
      try:report['state']=page.evaluate('({phase:document.getElementById("app").dataset.phase,status:document.getElementById("handStatus").textContent,requests:window.__cameraRequests,enabled:window.__tracker?.enabled,video:document.getElementById("handVideo").readyState})')
      except Exception:pass
      raise
    finally:(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
