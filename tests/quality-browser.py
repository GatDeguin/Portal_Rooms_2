#!/usr/bin/env python3
"""Real Chromium + real Worker scheduling; WebGL is explicitly simulated.
Slow compiler work runs synchronously in the worker to reproduce the UI hazard.
This does not validate a GPU, shader output, or physical-device performance.
"""
import base64,json,re,os
from pathlib import Path
from playwright.sync_api import sync_playwright
import browser as flows
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'quality-switch'

DRIVER=r'''
const NativeCanvas=OffscreenCanvas;
self.OffscreenCanvas=class extends NativeCanvas {
  getContext(kind,...args){
    if(kind!=='webgl')return super.getContext(kind,...args);
    const ctx=super.getContext('2d');let n=1;const constants=new Map();
    return new Proxy({}, {get:(_,key)=>{
      if(key==='checkFramebufferStatus')return ()=>{if(!constants.has('FRAMEBUFFER_COMPLETE'))constants.set('FRAMEBUFFER_COMPLETE',n++);return constants.get('FRAMEBUFFER_COMPLETE');};
      if(key==='NO_ERROR')return 0;
      if(key==='getError')return ()=>0;
      if(key==='getExtension')return ()=>null;
      if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
      if(key==='getParameter')return ()=>[8192,8192];
      if(key==='shaderSource')return (shader,source)=>{shader.source=source;};
      if(key==='compileShader')return shader=>{
        if(shader.source.includes('#define STEPS 176'))throw Error('Fallo de compilación simulado');
        const ms=shader.source.includes('#define STEPS 136')?350:shader.source.includes('#define STEPS 112')?1600:0;
        const end=performance.now()+ms;while(performance.now()<end){};
      };
      if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>true;
      if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'';
      if(key==='getAttribLocation')return ()=>0;
      if(key==='getUniformLocation')return (_,name)=>name;
      if(key.startsWith('create'))return ()=>({});
      if(key==='drawArrays')return ()=>{ctx.fillRect(0,0,this.width,this.height);};
      if(key===key.toUpperCase()){if(!constants.has(key))constants.set(key,n++);return constants.get(key);}
      return ()=>{};
    }});
  }
};
'''
def data_url(source):return 'data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
def worker_module(name,cache):
    if name in cache:return cache[name]
    src=(ROOT/'src'/name).read_text()
    src=re.sub(r"from (['\"])\./([^'\"]+)\1",lambda m:'from '+json.dumps(worker_module(m[2],cache)),src)
    if name=='renderer-worker.js':src=DRIVER+'\n'+src
    cache[name]=data_url(src);return cache[name]
def html():
    url=worker_module('renderer-worker.js',{})
    imports={}
    for path in (ROOT/'src').glob('*.js'):
        src=path.read_text()
        src=src.replace("new URL('./renderer-worker.js',import.meta.url)",json.dumps(url))
        if path.name=='renderer-client.js':src=src.replace('RENDER_TIMEOUTS.frame','1000').replace('preparationTimeout(tier??quality)','1000')
        src=re.sub(r"from (['\"])\./([^'\"]+)\1",r"from 'portal/\2'",src)
        imports['portal/'+path.name]=data_url(src)
    text=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="./styles/game.css">','<style>'+(ROOT/'styles/game.css').read_text()+'</style>')
    return text.replace('<script type="module" src="./src/app.js"></script>','<script type="importmap">'+json.dumps({'imports':imports})+'</script><script type="module">import "portal/app.js";</script>')
def main():
    OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[]
    def check(name,condition=True):
        assert condition,name
        checks.append(name);print('PASS',name,flush=True)
    report={'backend':'Chromium with real worker and simulated slow WebGL driver','checks':checks,'errors':errors}
    try:
      with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer'])
        page=b.new_page(viewport={'width':1100,'height':760});page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('about:blank');page.evaluate('''() => {
          const map=new Map([['roomTiltGame.settings.v2',JSON.stringify({quality:'low'})]]);
          Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}});
          window.__heartbeat=0;setInterval(()=>window.__heartbeat++,10);window.__frames=0;
          const original=Worker.prototype.postMessage;Worker.prototype.postMessage=function(data,...args){if(data.type==='frame')window.__frames++;return original.call(this,data,...args);};
        }''')
        # Legacy main-thread renderer gets a GL double too, so RED fails on behavior, not lack of WebGL.
        page.evaluate(flows.STUB);page.set_content(html(),wait_until='load')
        page.wait_for_function("document.getElementById('app').dataset.phase==='menu'")
        page.locator('#startSettingsBtn').click();page.locator('#tab-scene').click()
        before=page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')");frames=page.evaluate('__frames');heart=page.evaluate('__heartbeat')
        page.locator('#quality').select_option('high')
        page.wait_for_function("document.getElementById('quality').getAttribute('aria-busy')==='true'",timeout=1500)
        page.wait_for_timeout(120);check('menu timers advance while the worker compiler is occupied',page.evaluate('__heartbeat')>heart+5)
        page.locator('#tab-controls').click();check('other settings tabs remain actionable during compilation',page.locator('#settings-controls').is_visible())
        page.locator('#closeSettingsBtn').click();page.wait_for_timeout(450)
        check('leaving settings cancels the candidate without changing the saved quality',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality")=='low')
        page.locator('#startSettingsBtn').click();page.locator('#tab-scene').click();page.locator('#quality').select_option('high')
        page.wait_for_function("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='high'")
        check('successful preparation saves exactly the chosen quality');check('quality changes do not touch progress',before==page.evaluate("localStorage.getItem('roomTiltGame.progress.v2')"))
        check('menu changes validate candidates without starting a continuous frame loop',frames==page.evaluate('__frames'))
        page.locator('#quality').select_option('cinematic');page.wait_for_function("document.getElementById('quality').getAttribute('aria-busy')==='false'")
        check('failed compilation restores the previous choice',page.locator('#quality').input_value()=='high' and page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality")=='high')
        page.locator('#quality').select_option('medium');page.wait_for_timeout(1200)
        check('a stuck compiler times out and leaves the menu usable',page.locator('#quality').input_value()=='high' and page.locator('#closeSettingsBtn').is_enabled())
        page.locator('#quality').select_option('medium');page.locator('#quality').select_option('low')
        page.wait_for_function("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='low'")
        page.wait_for_timeout(250);check('rapid choices cannot apply a superseded quality',page.locator('#quality').input_value()=='low')
        page.locator('#quality').select_option('high');page.locator('#cancelQualityBtn').click()
        check('explicit cancellation keeps the last working choice',page.locator('#quality').input_value()=='low')
        page.screenshot(path=str(OUT/'menu-quality-recovered.png'))
        page.locator('#closeSettingsBtn').click();page.locator('#startBtn').click();page.wait_for_function("document.getElementById('app').dataset.phase==='playing'")
        page.keyboard.down('ArrowRight');page.wait_for_timeout(150);page.keyboard.up('ArrowRight');page.keyboard.press('Escape')
        page.wait_for_function("document.getElementById('app').dataset.phase==='paused'");check('play and pause still work after cancelled and failed changes')
        page.set_viewport_size({'width':390,'height':844});page.locator('#pauseDialog [data-action=settings]').click();page.locator('#tab-scene').click()
        page.locator('#quality').select_option('high');page.wait_for_function("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='high'")
        page.screenshot(path=str(OUT/'phone-quality.png'));check('phone settings can apply quality and retain a back action',page.locator('#closeSettingsBtn').is_enabled())
        # Startup must not retry a failed, heavy worker quality on the menu thread.
        fallback=b.new_page();fallback.on('pageerror',lambda e:errors.append(str(e)));fallback.goto('about:blank')
        fallback.evaluate("""() => {const map=new Map([['roomTiltGame.settings.v2',JSON.stringify({quality:'cinematic'})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}});}""")
        fallback.evaluate(flows.STUB);fallback.set_content(html(),wait_until='load')
        fallback.wait_for_function("document.getElementById('app').dataset.phase==='menu'")
        fallback.locator('#startSettingsBtn').click();fallback.locator('#tab-scene').click()
        check('failed saved quality boots visibly in low while preserving the saved preference',fallback.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='cinematic'") and 'Baja' in fallback.locator('#qualityActual').inner_text() and 'preferencia' in fallback.locator('#qualityState').inner_text())
        fallback.close()
        # Exercise the main-thread KHR path independently of the worker path.
        parallel=b.new_page();parallel.on('pageerror',lambda e:errors.append(str(e)));parallel.goto('about:blank')
        parallel.evaluate("""() => {window.Worker=undefined;window.__busyCompiler=false;window.__beats=0;setInterval(()=>window.__beats++,10);const map=new Map([['roomTiltGame.settings.v2',JSON.stringify({quality:'low'})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}});}""")
        parallel.evaluate(flows.STUB)
        parallel.evaluate("""() => {const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(type!=='webgl')return gl;return new Proxy(gl,{get:(g,key)=>{if(key==='getExtension')return name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:37297}:g.getExtension(name);if(key==='getProgramParameter')return (p,param)=>{if(!p.shaders?.some(s=>s.source?.includes('#define STEPS')))return true;if(param===37297)return !window.__busyCompiler;if(window.__busyCompiler)throw Error('blocking link query');return true;};if(key==='getShaderParameter')return shader=>{if(!shader.source?.includes('#define STEPS'))return true;if(window.__busyCompiler)throw Error('blocking shader query');return true;};return g[key];}});};}""")
        parallel.set_content(html(),wait_until='load');parallel.wait_for_function("document.getElementById('app').dataset.phase==='menu'")
        parallel.locator('#startSettingsBtn').click();parallel.locator('#tab-scene').click();parallel.evaluate('window.__busyCompiler=true')
        heart=parallel.evaluate('__beats');parallel.locator('#quality').select_option('high');parallel.wait_for_timeout(130)
        check('KHR fallback keeps the main-thread menu responsive while shaders are pending',parallel.evaluate('__beats')>heart+5)
        parallel.evaluate('window.__busyCompiler=false');parallel.wait_for_function("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='high'")
        check('KHR fallback commits only after compilation completes');parallel.close()
        blocked_worker=b.new_page();blocked_worker.on('pageerror',lambda e:errors.append(str(e)));blocked_worker.goto('about:blank')
        blocked_worker.evaluate("""() => {window.Worker=function(){throw Error('Worker blocked by CSP test');};const map=new Map([['roomTiltGame.settings.v2',JSON.stringify({quality:'high'})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))}});}""")
        blocked_worker.evaluate(flows.STUB);blocked_worker.set_content(html(),wait_until='load');blocked_worker.wait_for_function("document.getElementById('app').dataset.phase==='menu'")
        check('lack of worker support alone does not erase the saved quality',blocked_worker.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).quality==='high'"));blocked_worker.close()
        check('no unexpected page errors',not errors);b.close()
      report['status']='passed'
    except Exception as e:report['status']='failed';report['failure']=str(e);raise
    finally:(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
