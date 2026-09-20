#!/usr/bin/env python3
"""Browser flows. --ui-only stubs GL explicitly; it is not a WebGL-render test.
The offline import map loads the delivered modules without HTTP navigation.
Storage and orientation APIs are test adapters, not physical-device validation.
"""
import argparse,os
import base64
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'browser'
STUB=r"""
(() => {
 const original=HTMLCanvasElement.prototype.getContext;let next=1;const constants=new Map();window.__glCalls={draws:0,programs:0};
 const timer={TIME_ELAPSED_EXT:37300,QUERY_RESULT_AVAILABLE_EXT:37301,QUERY_RESULT_EXT:37302,GPU_DISJOINT_EXT:37303,createQueryEXT:()=>({}),beginQueryEXT(){},endQueryEXT(){},deleteQueryEXT(){},getQueryObjectEXT:(q,p)=>p===37301?true:1000000};
 const gl=new Proxy({}, {get:(_,key)=>{
  if(key==='checkFramebufferStatus')return ()=>gl.FRAMEBUFFER_COMPLETE;
  if(key==='shaderSource')return (shader,source)=>shader.source=source;
  if(key==='attachShader')return (program,shader)=>(program.shaders??=[]).push(shader);
  if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
  if(key==='getParameter')return p=>p===37303?false:[16384,16384];
  if(key==='NO_ERROR')return 0;
  if(key==='getError')return ()=>0;
  if(key==='getExtension')return name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:37297}:name==='EXT_disjoint_timer_query'?timer:null;
  if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
  if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'';
  if(key==='getAttribLocation')return ()=>0;
  if(key==='getUniformLocation')return (_p,name)=>name;
  if(key==='createProgram')return ()=>{window.__glCalls.programs++;return {};};
  if(key.startsWith('create'))return ()=>({});
  if(key==='drawArrays')return ()=>window.__glCalls.draws++;
  if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,next++);return constants.get(key);}
  return ()=>{};
 }});
 HTMLCanvasElement.prototype.getContext=function(type,options){return type==='webgl'?gl:original.call(this,type,options);};
 window.__addTestBadge=()=>{
  for(const dialog of document.querySelectorAll('dialog')){const badge=document.createElement('p');badge.textContent='PRUEBA DE INTERFAZ · WebGL simulado';badge.style.cssText='font:9px monospace;color:#ffd28a;margin:0 0 12px;letter-spacing:.03em';dialog.prepend(badge);}
  const badge=document.createElement('div');badge.textContent='PRUEBA DE INTERFAZ · WebGL simulado';badge.style.cssText='position:fixed;top:50%;left:8px;z-index:99;pointer-events:none;font:9px monospace;color:#ffd28a;background:#111c;padding:6px;border-radius:5px';document.body.append(badge);
 };
})();
"""
INSTRUMENT="""async () => {const {GameEngine}=await import('portal/physics.js');const original=GameEngine.prototype.advance;GameEngine.prototype.advance=function(...args){window.__engine=this;return original.apply(this,args);};}"""
SENSORS="""() => {Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});class SensorEvent extends Event {constructor(type,init={}){super(type,init);this.beta=init.beta??null;this.gamma=init.gamma??null;}}SensorEvent.requestPermission=()=>Promise.resolve('granted');window.DeviceOrientationEvent=SensorEvent;}"""
def offline_html():
    imports={}
    for path in (ROOT/'src').glob('*.js'):
        source=re.sub(r"from (['\"])\./([^'\"]+)\1",r"from 'portal/\2'",path.read_text())
        imports['portal/'+path.name]='data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
    html=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="./styles/game.css">','<style>'+(ROOT/'styles/game.css').read_text()+'</style>')
    return html.replace('<script type="module" src="./src/app.js"></script>','<script type="importmap">'+json.dumps({'imports':imports})+'</script><script type="module">import "portal/app.js";</script>')
def load_page(page,ui_only,reload=False,blocked=False,fallback=False):
    seed=page.evaluate('window.__testStorage ? Object.fromEntries(window.__testStorage) : {}') if reload else {}
    page.goto('about:blank')
    if blocked:page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}})")
    else:page.evaluate("""seed=>{window.__testStorage=new Map(Object.entries(seed));const map=window.__testStorage;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>map.get(String(key))??null,setItem:(key,value)=>map.set(String(key),String(value)),removeItem:key=>map.delete(String(key)),clear:()=>map.clear()}});} """,seed)
    page.evaluate(SENSORS)
    if fallback:page.evaluate("HTMLCanvasElement.prototype.getContext=()=>null")
    elif ui_only:page.evaluate(STUB)
    page.set_content(offline_html(),wait_until='load')
    if ui_only and not fallback:page.evaluate('window.__addTestBadge?.()')
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--ui-only',action='store_true');parser.add_argument('--chromium',default=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'));args=parser.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    checks=[];errors=[];shots=[]
    def check(name,condition=True):
        assert condition,name
        checks.append(name);print('PASS',name,flush=True)
    def shot(page,name):page.screenshot(path=str(OUT/f'{name}.png'),animations='disabled');shots.append(name+'.png')
    def phase(page,value):page.wait_for_function('(p)=>document.getElementById("app").dataset.phase===p',arg=value,timeout=12000)
    def observe(page):page.on('pageerror',lambda error:errors.append(str(error)))
    report={'mode':'ui-only' if args.ui_only else 'webgl','checks':checks,'screenshots':shots,'errors':errors,'transport':'offline import map','storage':'in-memory adapter','sensors':'synthetic orientation and permissions','goal_checks':'UI state fixtures, not route completion evidence'}
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']+(['--disable-gpu','--disable-software-rasterizer'] if args.ui_only else ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']))
        report['browser_webgl_available']=None
        if not args.ui_only:
            probe=browser.new_page();report['browser_webgl_available']=probe.evaluate("() => Boolean(document.createElement('canvas').getContext('webgl'))");probe.close()
        if not args.ui_only and not report['browser_webgl_available']:raise RuntimeError('WebGL unavailable. Run --ui-only explicitly; do not count it as renderer validation.')
        context=browser.new_context(viewport={'width':1100,'height':760});page=context.new_page();observe(page);load_page(page,args.ui_only);phase(page,'menu');page.evaluate(INSTRUMENT)
        check('start screen is actionable and contains 42-room progress',page.locator('#startBtn').is_visible() and '42' in page.locator('#startProgress').inner_text());shot(page,'desktop-start')
        for _ in range(12):
            page.keyboard.press('Tab');assert page.evaluate('document.getElementById("startDialog").contains(document.activeElement)')
        check('native start dialog contains keyboard focus')
        page.locator('#startLevelsBtn').click();phase(page,'selector');check('selector previews 42 rooms but keeps 41 locked',page.locator('#levelGrid button').count()==42 and page.locator('#levelGrid .locked').count()==41)
        saved=page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')")
        page.locator('[data-chapter="5"]').click();check('chapter V filters five expansion rooms',page.locator('#levelGrid button').count()==5)
        page.locator('[data-preview-room="26"]').click();check('locked preview does not start a run or mutate progress',page.locator('#previewPlayBtn').is_disabled() and page.locator('#previewTitle').inner_text()=='Tríptico de inercia' and saved==page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')"))
        shot(page,'expansion-selector-desktop');page.locator('[data-chapter="0"]').click()
        page.locator('[data-preview-room="0"]').click();check('unlocked room has explicit play action',not page.locator('#previewPlayBtn').is_disabled())
        page.locator('#levelsDialog [data-action=back]').first.click();phase(page,'menu');page.locator('#startBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)')
        initial=page.evaluate('__engine.state.cube.x');page.keyboard.down('ArrowRight');page.wait_for_timeout(250);page.keyboard.up('ArrowRight');page.wait_for_timeout(250)
        check('holding a movement key moves the cube',page.evaluate('__engine.state.cube.x')>initial);check('keyup releases gravity without requiring a pointer event',abs(page.evaluate('__engine.state.gravity.x'))<.03);shot(page,'desktop-playing')
        page.keyboard.press('Escape');phase(page,'paused');page.wait_for_timeout(100)
        frozen=page.evaluate('JSON.stringify({t:__engine.state.time,x:__engine.state.cube.x,z:__engine.state.cube.z})');draws=page.evaluate('window.__glCalls?.draws??0');page.wait_for_timeout(250)
        check('pause freezes physics and room clock',frozen==page.evaluate('JSON.stringify({t:__engine.state.time,x:__engine.state.cube.x,z:__engine.state.cube.z})'))
        if args.ui_only:check('renderer has no continuous draw loop while paused',draws==page.evaluate('__glCalls.draws'))
        page.locator('#pauseDialog [data-action=settings]').click();phase(page,'settings');page.locator('#sensitivity').evaluate("e=>{e.value='1.7';e.dispatchEvent(new Event('input',{bubbles:true}));}");page.locator('#invertX').check()
        page.locator('#tab-controls').focus();page.keyboard.press('ArrowRight')
        check('keyboard tab navigation exposes scene settings',page.locator('#quality').is_visible() and page.locator('#tab-scene').get_attribute('aria-selected')=='true')
        physics=page.evaluate('JSON.stringify(__engine.state)');progress=page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')")
        page.locator('#quality').select_option('cinematic')
        page.wait_for_function("document.getElementById('quality').getAttribute('aria-busy')==='false'")
        check('cinematic is selectable and saved',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='cinematic'") and 'Cinemática' in page.locator('#qualityActual').inner_text())
        page.locator('#effects').uncheck()
        check('effects preference persists and reduces DOM animation',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).effects===false && document.getElementById('app').classList.contains('reduced-effects')"))
        check('changing graphics does not mutate simulation or progress',physics==page.evaluate('JSON.stringify(__engine.state)') and progress==page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')"))
        shot(page,'cinematic-settings-ui-only')
        page.locator('#effects').check();page.locator('#quality').select_option('low')
        page.wait_for_function("document.getElementById('quality').getAttribute('aria-busy')==='false'")
        page.locator('#tab-controls').click()
        check('sensitivity, inversion and quality persist',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).sensitivity===1.7 && JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).invertX && JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='low'"))
        page.locator('#enableGyroBtn').click();page.evaluate("() => {for(let i=0;i<12;i++)window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:3,gamma:1}));}");check('valid stable samples activate and calibrate the sensors','Inclinación activa' in page.locator('#sensorStatus').inner_text())
        page.locator('#manualBtn').click();check('manual mode disables sensors explicitly','desactivados' in page.locator('#sensorStatus').inner_text());page.evaluate("DeviceOrientationEvent.requestPermission=()=>Promise.resolve('denied')");page.locator('#enableGyroBtn').click();page.wait_for_function("document.getElementById('sensorStatus').textContent.includes('no concedido')");check('denied sensor permission leaves a manual-control path')
        page.set_viewport_size({'width':390,'height':844});page.locator('#settingsDialog').evaluate('e=>e.scrollTop=0');shot(page,'phone-settings');page.locator('#closeSettingsBtn').click();phase(page,'paused');page.locator('#resumeBtn').click();phase(page,'playing')
        check('resume does not create a new attempt',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).attempts[0]")==1)
        page.evaluate("() => {const e=window.__engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true});}");phase(page,'victory');shot(page,'room-victory')
        check('victory records a time and unlocks the next room',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).unlocked===2 && JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).bestTimes[0]>0"));page.wait_for_timeout(400);check('victory waits for an explicit next-room action',page.locator('#victoryDialog').is_visible());page.locator('#nextBtn').click();phase(page,'playing');check('next room starts the correct room',page.evaluate('__engine.state.level')==1)
        page.keyboard.press('Escape');phase(page,'paused');page.locator('#pauseDialog [data-action=menu]').click();phase(page,'menu');load_page(page,args.ui_only,reload=True);phase(page,'menu');page.evaluate(INSTRUMENT)
        check('reload restores earned progress and settings',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).unlocked===2 && JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='low'"))
        for width,height in [(320,568),(844,390),(390,844)]:
            page.set_viewport_size({'width':width,'height':height});page.locator('#startDialog').evaluate('e=>e.scrollTop=0');rect=page.locator('#startDialog').bounding_box();assert rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=width+.1 and rect['y']+rect['height']<=height+.1
            page.locator('#startSettingsBtn').scroll_into_view_if_needed();page.locator('#startSettingsBtn').click();phase(page,'settings');page.locator('#closeSettingsBtn').scroll_into_view_if_needed();box=page.locator('#closeSettingsBtn').bounding_box();assert 0<=box['y'] and box['y']+box['height']<=height
            page.locator('#closeSettingsBtn').click();phase(page,'menu');page.locator('#startDialog').evaluate('e=>e.scrollTop=0');shot(page,f'menu-{width}x{height}');check(f'menu and settings remain reachable at {width}x{height}')
        page.locator('#startLevelsBtn').click();phase(page,'selector');shot(page,'room-selector');page.locator('#levelsDialog [data-action=back]').first.click();phase(page,'menu')
        page.evaluate("""async()=>{const {SaveStore}=await import('portal/storage.js');const s=new SaveStore(localStorage,22);for(let i=0;i<22;i++)s.complete(i,20+i);s.select(21);}""");load_page(page,args.ui_only,reload=True);phase(page,'menu');page.evaluate(INSTRUMENT)
        check('legacy 22/22 save offers expansion without changing current selection',page.locator('#startExpansionBtn').is_visible() and page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).current===21"))
        page.locator('#startBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)')
        for step in range(4):
            page.evaluate("() => {const e=window.__engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true,hold:0});}")
            if step<3:page.wait_for_function('(step)=>__engine.state.seq>step',arg=step,timeout=12000)
        phase(page,'victory');check('room 22 is an original-circuit milestone, not the campaign ending','ORIGINAL' in page.locator('#victoryEyebrow').inner_text() and '23' in page.locator('#nextBtn').inner_text());shot(page,'original-circuit-complete')
        page.locator('#nextBtn').click();phase(page,'playing');check('original circuit continues into expansion room 23',page.evaluate('__engine.state.level')==22)
        page.keyboard.press('Escape');phase(page,'paused');page.locator('#pauseDialog [data-action=menu]').click();phase(page,'menu')
        page.evaluate("""async()=>{const {SaveStore}=await import('portal/storage.js');const s=new SaveStore(localStorage,42);for(let i=0;i<42;i++)s.complete(i,20+i);s.select(41);}""");load_page(page,args.ui_only,reload=True);phase(page,'menu');page.evaluate(INSTRUMENT);page.locator('#startBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)')
        # These assignments isolate UI transitions. Actual routes are independently validated by recorded inputs.
        for step in range(4):
            page.evaluate("() => {const e=window.__engine,t=e.target;Object.assign(e.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true,hold:0});}")
            if step<3:page.wait_for_function('(step)=>__engine.state.seq>step',arg=step,timeout=12000)
        phase(page,'final');shot(page,'campaign-complete');check('final screen reflects 42 rooms and preserves all records',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).completed.length===42 && JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).unlocked===42") and '42' in page.locator('#finalCount').inner_text())
        page.locator('#finalDialog [data-action=menu]').click();phase(page,'menu');page.locator('#startSettingsBtn').click();phase(page,'settings');page.locator('#settingsDialog [data-action=confirm-reset]').click();phase(page,'confirm');page.locator('#confirmDialog [data-action=back]').click();phase(page,'settings');check('reset confirmation can be cancelled without losing progress',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).unlocked")==42)
        page.locator('#settingsDialog [data-action=confirm-reset]').click();phase(page,'confirm');page.locator('#confirmResetBtn').click();phase(page,'menu');check('confirmed reset keeps preferences but removes progress',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).unlocked===1 && JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='low'"))
        page.locator('#startBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)');page.evaluate("window.dispatchEvent(new Event('blur'))");phase(page,'paused');check('losing focus pauses instead of continuing unseen');page.locator('#resumeBtn').click();phase(page,'playing');page.evaluate("document.getElementById('gl').dispatchEvent(new Event('webglcontextlost',{cancelable:true}))");phase(page,'error');check('context loss stops the game and exposes recovery',page.locator('#graphicsError').is_visible());shot(page,'context-loss');context.close()
        mobile=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);touch=mobile.new_page();observe(touch);load_page(touch,args.ui_only);phase(touch,'menu');touch.locator('#startBtn').click();phase(touch,'playing')
        cdp=mobile.new_cdp_session(touch);rect=touch.locator('#stickWrap').bounding_box();x=rect['x']+rect['width']/2;y=rect['y']+rect['height']/2
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':11}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+23,'y':y,'id':11}]});value=touch.locator('#stick').evaluate('e=>e.style.transform')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x+23,'y':y,'id':11},{'x':x-15,'y':y,'id':22}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[{'x':x-15,'y':y,'id':22}]});check('second touch cannot take over or release the first joystick touch',touch.locator('#stick').evaluate('e=>e.style.transform')==value)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});check('joystick returns to neutral after its owner releases',touch.locator('#stick').evaluate('e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return m.m41===0&&m.m42===0;}'));shot(touch,'phone-playing');mobile.close()
        reduced=browser.new_context(viewport={'width':900,'height':640},reduced_motion='reduce');rp=reduced.new_page();observe(rp);load_page(rp,args.ui_only);phase(rp,'menu');rp.locator('#startSettingsBtn').click();phase(rp,'settings');check('reduced motion disables dynamic camera by default',not rp.locator('#dynamicCamera').is_checked());reduced.close()
        blocked=browser.new_context();bp=blocked.new_page();observe(bp);load_page(bp,args.ui_only,blocked=True);phase(bp,'menu');bp.locator('#startBtn').click();phase(bp,'playing');check('game starts when browser storage access throws');blocked.close()
        fallback=browser.new_context();fp=fallback.new_page();observe(fp);load_page(fp,False,fallback=True);phase(fp,'error');check('WebGL initialization failure has a readable fallback',fp.locator('#graphicsError').is_visible());shot(fp,'webgl-unavailable');fallback.close()
        check('no unexpected JavaScript page errors',not errors);browser.close()
      report['status']='passed'
    except Exception as error:
      report['status']='failed';report['failure']=str(error);raise
    finally:
      report['count']=len(checks);(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(f'{len(checks)} checks passed; mode={report["mode"]}',flush=True)
if __name__=='__main__':main()
