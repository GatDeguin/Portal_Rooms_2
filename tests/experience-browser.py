#!/usr/bin/env python3
"""Replay input-only expansion courses through real DOM input handlers and the app.
WebGL is explicitly stubbed; clock scheduling and storage are test adapters.
This validates gameplay/UI integration, not browser rendering or physical sensors.
"""
import argparse,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser import ROOT,STUB,offline_html
OUT=ROOT/'test-results'/'experience'
CLOCK=r"""() => {
  let now=1000,next=1;const callbacks=new Map();
  Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
  window.requestAnimationFrame=fn=>{const id=next++;callbacks.set(id,fn);return id;};
  window.cancelAnimationFrame=id=>callbacks.delete(id);
  window.__stepFrame=ms=>{now+=ms;const pending=[...callbacks.values()];callbacks.clear();for(const fn of pending)fn(now);};
}"""
STORAGE=r"""({id,strongGravity})=>{
  const progress={version:2,current:id-1,unlocked:id,completed:Array.from({length:id-1},(_,i)=>i),bestTimes:Array(42).fill(null),attempts:Array(42).fill(0),restarts:Array(42).fill(0)};
  const settings={strongGravity,sound:false,haptic:false,quality:'low',dynamicCamera:false,effects:false};
  const map=new Map([['roomTiltGame.progress.v2',JSON.stringify(progress)],['roomTiltGame.settings.v2',JSON.stringify(settings)]]);
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}});
}"""
REPLAY=r"""({frames,keyboard,fps})=>{
  const stick=document.getElementById('stickWrap'),rect=stick.getBoundingClientRect(),radius=rect.width*.32,cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
  let held=new Set();
  const codes={KeyA:'a',KeyD:'d',KeyW:'w',KeyS:'s'};
  for(const [x,z] of frames){
    if(keyboard){
      const keys=new Set();if(x<0)keys.add('KeyA');if(x>0)keys.add('KeyD');if(z<0)keys.add('KeyW');if(z>0)keys.add('KeyS');
      for(const code of held)if(!keys.has(code))window.dispatchEvent(new KeyboardEvent('keyup',{code,key:codes[code],bubbles:true}));
      for(const code of keys)if(!held.has(code))window.dispatchEvent(new KeyboardEvent('keydown',{code,key:codes[code],bubbles:true}));
      held=keys;
    }else{
      const magnitude=Math.hypot(x,z),raw=magnitude?(.025+.975*Math.pow(magnitude,1/1.35))*radius/magnitude:0;
      stick.dispatchEvent(new PointerEvent('pointermove',{pointerId:window.__pointerId,pointerType:'mouse',buttons:1,clientX:cx+x*raw,clientY:cy+z*raw,bubbles:true}));
    }
    window.__stepFrame(1000/fps);
  }
  for(const code of held)window.dispatchEvent(new KeyboardEvent('keyup',{code,key:codes[code],bubbles:true}));
  return {phase:document.getElementById('app').dataset.phase,progress:JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')),title:document.getElementById('levelTitle').textContent};
}"""
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--offline',action='store_true');parser.add_argument('--quick',action='store_true');args=parser.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    ids=[23,29,34,42] if args.quick else list(range(23,43))
    source="import {playExpansion} from './tests/helpers/expansion-pilot.mjs';const runs=[];for(const id of "+json.dumps(ids)+")for(const keyboard of [false,true])for(const strongGravity of [true,false]){const r=playExpansion(id,{keyboard,strongGravity});if(!r.solved)throw Error(id+': '+r.failure);runs.push({id,keyboard,strongGravity,fps:r.fps,frames:r.frames,seconds:r.seconds});}console.log(JSON.stringify(runs));"
    runs=json.loads(subprocess.check_output(['node','--input-type=module','-e',source],cwd=ROOT,text=True));checks=[];errors=[]
    report={'mode':'DOM gameplay replay; WebGL explicitly simulated','clock':'controlled requestAnimationFrame; production fixed-step engine and InputController','storage':'in-memory adapter seeded before spawn','sensor_validation':False,'checks':checks,'errors':errors}
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1000,'height':720},reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        html=offline_html()
        for run in runs:
          page.set_viewport_size({'width':1000,'height':720} if run['keyboard'] else {'width':390,'height':844})
          page.goto('about:blank');page.evaluate(CLOCK);page.evaluate(STORAGE,{'id':run['id'],'strongGravity':run['strongGravity']});page.evaluate(STUB)
          # Boot is asynchronous; readiness must not poll the deliberately frozen RAF clock.
          page.set_content(html,wait_until='load');page.wait_for_function("document.getElementById('app').dataset.phase==='menu'",polling=10)
          page.locator('#startBtn').click();page.wait_for_function("document.getElementById('app').dataset.phase==='playing'",polling=10)
          if not run['keyboard']:
            dimensions=page.locator('#gl').bounding_box();assert abs(dimensions['width']/dimensions['height']-16/9)<.01,dimensions
            page.evaluate("document.getElementById('stickWrap').addEventListener('pointerdown',e=>window.__pointerId=e.pointerId,{once:true})")
            box=page.locator('#stickWrap').bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down()
          result=page.evaluate(REPLAY,run)
          if not run['keyboard']:page.mouse.up()
          expected='final' if run['id']==42 else 'victory';assert result['phase']==expected,(run['id'],run['keyboard'],run['strongGravity'],result['phase'])
          index=run['id']-1;assert index in result['progress']['completed'];assert result['progress']['attempts'][index]==1
          seconds=result['progress']['bestTimes'][index];assert seconds and abs(seconds-run['seconds'])<.05,(seconds,run['seconds'])
          item={'room':run['id'],'control':'keyboard DOM' if run['keyboard'] else 'pointer joystick DOM','strongGravity':run['strongGravity'],'viewport':'1000x720' if run['keyboard'] else '390x844 (16:9 playfield)','seconds':seconds,'status':'passed'};checks.append(item);print('PASS',item,flush=True)
        assert not errors,errors;context.close();browser.close()
      report['status']='passed'
    except Exception as error:
      report['status']='failed';report['failure']=str(error);raise
    finally:
      report['count']=len(checks);(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(f'{len(checks)} input-only browser courses passed. WebGL was simulated, not rendered.',flush=True)
if __name__=='__main__':main()
