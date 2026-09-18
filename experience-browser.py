#!/usr/bin/env python3
"""Real HTTP modules/storage, simulated WebGL; verifies presentation, not a GPU.
Engine observation is injected only by a test route. No debug hooks are shipped.
"""
import argparse
import functools
import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser import STUB,offline_html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'experience'
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--chromium',default='/usr/bin/chromium');parser.add_argument('--offline',action='store_true',help='Explicit in-memory storage/import-map fallback for restricted browser networking');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://localhost:{server.server_port}/'
    checks=[];shots=[];errors=[];report={'mode':'UI only; simulated WebGL','transport':'offline import map' if args.offline else 'real static HTTP and relative ES modules','storage':'in-memory adapter' if args.offline else 'browser localStorage','checks':checks,'screenshots':shots,'errors':errors}
    def check(name,condition=True):
        assert condition,name
        checks.append(name);print('PASS',name,flush=True)
    def phase(page,name):page.wait_for_function('(p)=>document.getElementById("app").dataset.phase===p',arg=name)
    def shot(page,name):
        page.wait_for_timeout(550)
        page.screenshot(path=str(OUT/(name+'.png')))
        shots.append(name+'.png')
    def offline_load(page,seed=None):
        page.goto('about:blank')
        page.evaluate(STUB)
        page.evaluate('''seed=>{window.__testStorage=new Map(Object.entries(seed??{}));const map=window.__testStorage;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.get(String(k))??null,setItem:(k,v)=>map.set(String(k),String(v)),removeItem:k=>map.delete(String(k)),clear:()=>map.clear()}});}''',seed)
        page.set_content(offline_html(instrument=True),wait_until='load');phase(page,'menu')
    def reload_page(page):
        if args.offline:offline_load(page,page.evaluate('Object.fromEntries(window.__testStorage)'))
        else:page.reload();phase(page,'menu')
        page.evaluate('window.__addTestBadge()')
    def attach(context,seed=None):
        context.add_init_script(STUB)
        if seed and not args.offline:context.add_init_script("if(!localStorage.getItem('experience-seeded')){for(const [k,v] of Object.entries("+json.dumps(seed)+"))localStorage.setItem(k,JSON.stringify(v));localStorage.setItem('experience-seeded','1');}")
        context.route('**/src/app.js',lambda route:route.fulfill(body=(ROOT/'src/app.js').read_text()+'\nwindow.__engine=engine;window.__feedback=feedback;',content_type='text/javascript'))
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        if args.offline:offline_load(page,{k:json.dumps(v) for k,v in (seed or {}).items()})
        else:page.goto(url);phase(page,'menu')
        page.evaluate('window.__addTestBadge()');return page
    def back(page,parent):page.locator('dialog[open] [data-action=back]').first.click();phase(page,parent)
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1280,'height':900});page=attach(context)
        check('entry loads 14 production modules without a build',page.locator('#homePreview svg').count()==1 and page.title().startswith('Portal Room'))
        shot(page,'desktop-home')
        saved=page.evaluate('localStorage.getItem("roomTiltGame.progress.v2")')
        page.locator('#startLevelsBtn').click();phase(page,'selector')
        page.locator('[data-preview-room="21"]').click()
        check('locked final room can be inspected but cannot be entered',page.locator('#previewTitle').inner_text()=='Final vertical' and page.locator('#previewPlayBtn').is_disabled())
        check('looking at rooms never creates attempts or writes progress',saved==page.evaluate('localStorage.getItem("roomTiltGame.progress.v2")') and page.evaluate('__engine.state.elapsed===0'))
        page.locator('[data-chapter="4"]').click()
        check('chapter filter exposes the eight vertical rooms',page.locator('#levelGrid button').count()==8)
        page.locator('[data-preview-room="14"]').focus();page.keyboard.press('ArrowRight')
        check('keyboard navigation updates the selected preview',page.locator('[data-preview-room="15"]').get_attribute('aria-pressed')=='true')
        page.locator('[data-preview-room="21"]').click();shot(page,'desktop-selector')
        page.locator('[data-chapter="0"]').click();page.locator('[data-preview-room="0"]').click()
        check('reselecting an unlocked room restores the entry button',page.locator('#previewPlayBtn').is_enabled())
        page.locator('#previewPlayBtn').click();phase(page,'playing')
        page.keyboard.press('h');check('first hint opens without pausing the simulation',page.locator('#hintTitle').inner_text()=='Una pista · 1/3' and page.evaluate('__engine.active'))
        page.locator('#moreHintBtn').click();check('second hint gives more specific guidance','2/3' in page.locator('#hintTitle').inner_text())
        page.locator('#moreHintBtn').click();check('third hint finishes the sequence without a dead button','3/3' in page.locator('#hintTitle').inner_text() and page.locator('#moreHintBtn').is_hidden())
        page.locator('[data-action=close-hint]').click();check('hint can be dismissed without changing the run',page.locator('#hintCard').is_hidden())
        page.keyboard.press('Escape');phase(page,'paused');t=page.evaluate('__engine.state.elapsed');shot(page,'desktop-pause')
        page.locator('#pauseDialog [data-action=help]').click();phase(page,'help');shot(page,'desktop-help');back(page,'paused')
        check('help returns to pause with the room timer unchanged',page.evaluate('__engine.state.elapsed')==t)
        page.locator('#pauseDialog [data-action=settings]').click();phase(page,'settings')
        page.locator('#tab-controls').focus();page.keyboard.press('ArrowRight')
        check('settings tabs support arrow navigation and hide inactive panels',page.locator('#tab-scene').get_attribute('aria-selected')=='true' and page.locator('#settings-controls').is_hidden())
        page.keyboard.press('End');check('End selects the Audio tab',page.locator('#tab-audio').get_attribute('aria-selected')=='true')
        page.locator('#volume').evaluate("e=>{e.value='.35';e.dispatchEvent(new Event('input',{bubbles:true}));}")
        check('master volume has a live numeric value and saves the selected value',page.locator('#volumeValue').inner_text()=='35%' and page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).volume") == .35)
        page.locator('#tab-scene').click();page.locator('#effects').uncheck();page.wait_for_timeout(50)
        check('switching off effects cancels transient Web Animations',page.evaluate('__feedback.active.size===0') and page.locator('#app').evaluate("e=>e.classList.contains('effects-off')"))
        shot(page,'desktop-image-settings');page.locator('#closeSettingsBtn').click();phase(page,'paused')
        page.locator('#pauseDialog [data-action=restart]').click();phase(page,'playing')
        check('effects-off restart skips the intro and counts one restart',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.progress.v2')).restarts[0]")==1 and page.locator('#roomIntro').is_hidden())
        page.keyboard.press('h');check('restarting resets the progressive hint sequence','1/3' in page.locator('#hintTitle').inner_text())
        page.keyboard.press('Escape');phase(page,'paused');page.locator('#pauseDialog [data-action=menu]').click();phase(page,'menu')
        check('home CTA reflects the existing attempt','Continuar' in page.locator('#startBtn').inner_text())
        reload_page(page)
        check('reload restores effects and volume choices',page.evaluate("JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).effects===false && JSON.parse(localStorage.getItem('roomTiltGame.settings.v2')).volume===.35"))
        # Five small-screen layouts, including a narrow landscape phone.
        for w,h in [(320,568),(390,844),(430,932),(844,390),(568,320)]:
            page.set_viewport_size({'width':w,'height':h});page.locator('#startDialog').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(100)
            check(f'primary entry is visible without scrolling at {w}x{h}',page.locator('#startBtn').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}'))
            shot(page,f'home-{w}x{h}')
            page.locator('#startLevelsBtn').click();phase(page,'selector');page.locator('[data-preview-room="21"]').click();page.locator('#previewPlayBtn').scroll_into_view_if_needed()
            check(f'locked preview remains inspectable without horizontal overflow at {w}x{h}',page.locator('#previewPlayBtn').is_disabled() and page.locator('#levelsDialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
            if w in [320,390]:shot(page,f'selector-{w}x{h}')
            back(page,'menu');page.locator('#startSettingsBtn').click();phase(page,'settings');page.locator('#tab-controls').click();page.locator('#closeSettingsBtn').scroll_into_view_if_needed()
            check(f'settings back action remains reachable at {w}x{h}',page.locator('#closeSettingsBtn').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}'))
            if w==390:page.locator('#settingsDialog').evaluate('e=>e.scrollTop=0');shot(page,'phone-controls')
            page.locator('#closeSettingsBtn').click();phase(page,'menu')
        page.set_viewport_size({'width':390,'height':844});page.locator('#startBtn').click();phase(page,'playing');page.wait_for_timeout(3800);shot(page,'phone-gameplay')
        check('mobile HUD leaves the middle of the playfield clear',page.locator('.mission').bounding_box()['height']<180 and page.locator('.bottom').bounding_box()['y']>600)
        page.keyboard.press('Escape');phase(page,'paused');page.locator('#pauseDialog [data-action=settings]').click();phase(page,'settings');page.locator('#tab-scene').click();page.locator('#effects').check();page.locator('#closeSettingsBtn').click();phase(page,'paused');page.locator('#pauseDialog [data-action=restart]').click()
        page.evaluate("window.dispatchEvent(new Event('blur'))");phase(page,'paused');page.wait_for_timeout(700)
        check('losing focus during room intro cancels automatic resume',page.evaluate('!__engine.active && __engine.state.elapsed===0') and page.locator('#roomIntro').is_hidden())
        page.locator('#resumeBtn').click();phase(page,'playing');page.locator('#hintBtn').click();page.wait_for_timeout(550)
        check('button ripples remove their DOM nodes after completion',page.locator('.press-ripple').count()==0)
        page.evaluate("(()=>{const t=__engine.target;Object.assign(__engine.state.cube,{x:t.pos[0],z:t.pos[1],y:t.y??0,vx:0,vz:0,vy:0,grounded:true});})()")
        phase(page,'victory');shot(page,'phone-victory');check('victory presents the actual next room lesson',bool(page.locator('#nextRoomLesson').inner_text()))
        context.close()
        # Existing users retain completion and their previous times are explicitly archived.
        progress={'version':2,'current':2,'unlocked':3,'completed':[0,1],'bestTimes':[9.5,13],'attempts':[3,4]}
        archived=browser.new_context(viewport={'width':1100,'height':800});ap=attach(archived,{'roomTiltGame.progress.v2':progress})
        check('prior-course records are explained, not silently compared',ap.locator('#migrationNote').is_visible() and '2 / 22' in ap.locator('#startProgress').inner_text())
        ap.locator('#startLevelsBtn').click();phase(ap,'selector');ap.locator('[data-preview-room="0"]').click()
        check('room inspection distinguishes archived records','archivado' in ap.locator('#previewRecord').inner_text())
        archived.close()
        reduced=browser.new_context(reduced_motion='reduce',viewport={'width':900,'height':720});rp=attach(reduced)
        rp.locator('#startBtn').click();phase(rp,'playing');rp.locator('#hintBtn').click();rp.wait_for_timeout(30)
        check('reduced motion bypasses intro and prevents transient effects',rp.locator('#roomIntro').is_hidden() and rp.evaluate('__feedback.active.size===0') and rp.locator('.press-ripple').count()==0)
        reduced.close();check('no unexpected JavaScript page errors',not errors);browser.close()
      report['status']='passed'
    except Exception as exc:report['status']='failed';report['failure']=str(exc);raise
    finally:
      report['count']=len(checks);(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));server.shutdown()
    print(f'{len(checks)} experience checks passed',flush=True)
if __name__=='__main__':main()
