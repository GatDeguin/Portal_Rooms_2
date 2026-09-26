#!/usr/bin/env python3
"""Real Web Audio and PCM rendering; UI fixture explicitly stubs only WebGL.
No speakers, microphone, physical camera or subjective listening claim.
"""
import base64,json,os,struct,wave
from playwright.sync_api import sync_playwright
from browser import ROOT,load_page,INSTRUMENT
OUT=ROOT/'test-results'/'audio'
SETUP="""async()=>{const {AudioFeedback}=await import('portal/audio.js');const unlock=AudioFeedback.prototype.unlock;AudioFeedback.prototype.unlock=function(...args){window.__audio=this;return unlock.apply(this,args);};}"""
RENDER=r"""async({kind,theme=0,mono=false,mix='full'})=>{
 const {SoundRack}=await import('portal/audio-synth.js');const {createAudioGraph,AudioFeedback}=await import('portal/audio.js');
 const {THEMES,scoreStep}=await import('portal/audio-score.js');
 const seconds=kind==='music'?28:kind==='stress'?6:3.5,ctx=new OfflineAudioContext(2,Math.ceil(32000*seconds),32000),graph=createAudioGraph(ctx),rack=new SoundRack(ctx,graph.buses,graph.sends);
 graph.master.gain.value=1;graph.output.channelCount=mono?1:2;
 if(mix==='night'){graph.compressor.threshold.value=-27;graph.compressor.ratio.value=8;graph.compressor.attack.value=.001;graph.output.gain.value=.4;}
 const a=new AudioFeedback(()=>({sound:true,volume:1,musicVolume:.48,ambienceVolume:.5,effectsVolume:.85,haptic:false,audioMix:mix,audioMono:mono}));
 Object.assign(a,{context:ctx,graph,master:graph.master,rack,chapter:theme,wanted:true});
 // Only the real-time eligibility gate is bypassed: OfflineAudioContext has no
 // user gesture and is suspended while constructing the actual production graph.
 Object.defineProperty(a,'audible',{value:true});
 if(kind==='music'){
   graph.buses.music.gain.value=.48;graph.sends.music.gain.value=.48;
   const interval=30/THEMES[theme].bpm;
   for(let step=0;step*interval<seconds-7;step++)for(const note of scoreStep(theme,step,{playing:true,intensity:.65}))rack.note({...note,time:step*interval});
 }else if(kind==='stress'){
   for(let i=0;i<160;i++)rack.impact(['wood','ice','carpet','platform'][i%4],1,i%2?.72:-.72,i*.012);
 }else if(kind==='silence'){}else if(kind.startsWith('material:'))rack.impact(kind.split(':')[1],.75,.6,.02);
 else a.event({type:kind,power:.8,x:2},{surface:'wood',targetType:4});
 const admitted=rack.voices.size,buffer=await ctx.startRendering(),l=buffer.getChannelData(0),r=buffer.getChannelData(1);
 let peak=0,energy=0,diff=0,mean=0,finite=true,edge=0;const active=Math.min(l.length,32000*2);
 for(let i=0;i<l.length;i++){peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));energy+=l[i]*l[i]+r[i]*r[i];diff+=(l[i]-r[i])**2;mean+=l[i];if(!Number.isFinite(l[i]+r[i]))finite=false;if(i)edge=Math.max(edge,Math.abs(l[i]-l[i-1]));}
 const pcm=new Int16Array(l.length*2);for(let i=0;i<l.length;i++){pcm[2*i]=Math.round(Math.max(-1,Math.min(1,l[i]))*32767);pcm[2*i+1]=Math.round(Math.max(-1,Math.min(1,r[i]))*32767);}
 let binary='';const bytes=new Uint8Array(pcm.buffer);for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 graph.dispose();rack.clear();
 return {kind,theme,mono,mix,peak,rms:Math.sqrt(energy/(l.length*2)),stereo:Math.sqrt(diff/l.length),mean:mean/l.length,edge,finite,admitted,remaining:rack.voices.size,pcm:btoa(binary),rate:32000};
}"""

def main():
 OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[];renders=[]
 def check(name,ok=True):assert ok,name;checks.append(name);print('PASS',name,flush=True)
 def phase(p,value):p.wait_for_function('(v)=>document.getElementById("app").dataset.phase===v',arg=value)
 def slider(p,key,value):
  p.locator('#'+key).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));}',value);p.wait_for_timeout(150)
 def render(p,kind,**kwargs):
  result=p.evaluate(RENDER,{'kind':kind,**kwargs});pcm=base64.b64decode(result.pop('pcm'))
  name=kind.replace(':','-')+('-'+str(kwargs['theme']+1) if 'theme' in kwargs else '')+('-mono' if kwargs.get('mono') else '')+('-night' if kwargs.get('mix')=='night' else '')
  with wave.open(str(OUT/(name+'.wav')),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(result['rate']);f.writeframes(pcm)
  renders.append(result);return result
 report={'mode':'Real AudioContext/OfflineAudioContext; WebGL stub for DOM flows','checks':checks,'renders':renders,'errors':errors}
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--disable-gpu','--disable-software-rasterizer'])
   page=browser.new_page(viewport={'width':1200,'height':900},reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
   load_page(page,True);phase(page,'menu');page.evaluate(INSTRUMENT);page.evaluate(SETUP)
   check('audio graph is not allocated before interaction',page.evaluate('!window.__audio'))
   page.locator('#startSettingsBtn').click();page.locator('#tab-audio').click();page.wait_for_function('__audio.context?.state==="running"');page.wait_for_timeout(300)
   check('first interaction starts one audio context and a menu score',page.evaluate('__audio.rack.voices.size>0&&__audio.phase==="settings"'))
   for key,value in [('volume',.3),('musicVolume',.24),('ambienceVolume',.2),('effectsVolume',.6)]:
    slider(page,key,value);saved=page.evaluate('(k)=>JSON.parse(localStorage.getItem("roomTiltGame.settings.v2"))[k]',key)
    check(key+' updates its value and persists',abs(saved-value)<1e-6 and page.locator('#'+key+'Value').inner_text()==f'{round(value*100)}%')
   page.locator('#audioMono').check();page.locator('#audioMix').select_option('night');page.wait_for_timeout(180)
   check('mono and night mix apply to the output graph',page.evaluate('__audio.graph.output.channelCount===1&&Math.abs(__audio.graph.compressor.ratio.value-8)<.01'))
   page.locator('#audioPreviewBtn').click();page.wait_for_timeout(60)
   check('preview plays the production effects and guards repeated requests',page.evaluate('__audio.rack.voices.size>4&&!__audio.preview()'))
   page.screenshot(path=str(OUT/'audio-settings-desktop.png'))
   page.locator('#closeSettingsBtn').click();phase(page,'menu');page.wait_for_timeout(100)
   check('leaving settings cancels pending preview cues',page.evaluate('![...__audio.rack.voices].some(v=>v.group==="preview"&&!v.disposed)'))
   page.locator('#startSettingsBtn').click();page.locator('#tab-audio').click()
   page.locator('#sound').uncheck();page.wait_for_timeout(120)
   check('mute stops voices and scheduler, and suspends the context',page.evaluate('__audio.master.gain.value===0&&__audio.rack.voices.size===0&&__audio.timer===null&&__audio.context.state==="suspended"'))
   slider(page,'volume',.4);check('adjusting a muted mix does not restart audio',page.evaluate('__audio.master.gain.value===0&&__audio.context.state==="suspended"'))
   page.locator('#sound').check();page.wait_for_timeout(180)
   check('unmute restores selected master gain without a new context',page.evaluate('Math.abs(__audio.master.gain.value-.4)<.001&&__audio.context.state==="running"'))
   slider(page,'musicVolume',0);page.wait_for_timeout(200)
   check('zero music leaves effects available and stops musical voices',page.evaluate('![...__audio.rack.voices].some(v=>v.group==="music")&&__audio.graph.buses.effects.gain.value>0'))
   page.locator('#closeSettingsBtn').click();page.locator('#startBtn').click();phase(page,'playing');page.wait_for_function('Boolean(window.__engine)');page.keyboard.down('ArrowRight');page.wait_for_timeout(450);page.keyboard.up('ArrowRight')
   check('motion produces surface foley',page.evaluate('Boolean(__audio.world.rolling)'))
   page.keyboard.press('Escape');phase(page,'paused');page.wait_for_timeout(200)
   check('pause removes world foley while keeping menu audio running',page.evaluate('!__audio.world.rolling&&__audio.context.state==="running"'))
   frozen=page.evaluate('__engine.state.elapsed');page.wait_for_timeout(250);check('the audio scheduler does not advance paused physics',page.evaluate('__engine.state.elapsed')==frozen)
   page.evaluate('window.dispatchEvent(new Event("blur"))');page.wait_for_timeout(160)
   check('focus loss stops all sound even inside menus',page.evaluate('__audio.context.state==="suspended"&&__audio.rack.voices.size===0&&__audio.timer===null'))
   page.locator('#resumeBtn').click();phase(page,'playing');page.wait_for_function('__audio.context.state==="running"&&__audio.timer!==null',timeout=5000)
   check('explicit resume restores audio after focus loss',page.evaluate('__audio.context.state==="running"&&__audio.timer!==null'))
   # Production observer receives controlled world fixtures; no input/physics rewrite.
   page.evaluate('()=>{__engine.pause();__audio.previous=null;__audio.update(__engine);__engine.handGrab="fixture";__audio.update(__engine);}')
   check('actual hand-grab state triggers an audible cue',page.evaluate('__audio.lastEvents.has("grab")'))
   page.evaluate('__engine.handGrab=null;__audio.update(__engine)');check('release has a separate cue',page.evaluate('__audio.lastEvents.has("release")'))
   page.keyboard.press('Escape');phase(page,'paused');page.locator('#pauseDialog [data-action=settings]').click();page.locator('#tab-audio').click()
   for _ in range(8):
    page.locator('#sound').uncheck();page.locator('#sound').check()
   page.wait_for_timeout(200);check('rapid off/on cannot strand the context or multiply voices',page.evaluate('__audio.context.state==="running"&&__audio.rack.voices.size<=56'))
   page.set_viewport_size({'width':390,'height':844});page.locator('#audioPreviewBtn').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'audio-settings-mobile.png'))
   check('audio controls fit the mobile dialog width',page.locator('#settings-audio').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
   page.locator('#sound').uncheck();page.wait_for_timeout(100)
   for kind in ['material:wood','material:carpet','material:ice','material:platform','material:ramp','material:brake','material:boost','jump','bumper','goal','complete','final','grab','release','ui','hover','enter']:
    r=render(page,kind);check(kind+' renders finite, audible PCM without clipping',r['finite'] and .0001<r['rms']<.25 and r['peak']<.96)
   for theme in range(8):
    r=render(page,'music',theme=theme);check(f'chapter {theme+1} has audible stereo music within headroom',r['finite'] and .001<r['rms']<.2 and r['peak']<.8 and r['stereo']>.0001)
   silent=render(page,'silence');check('an idle graph is digitally silent',silent['peak']==0)
   mono=render(page,'material:wood',mono=True);check('mono renders the complete signal identically to both channels',mono['stereo']<1e-7 and mono['rms']>.001)
   night=render(page,'material:platform',mix='night');natural=next(r for r in renders if r['kind']=='material:platform' and r['mix']=='full')
   check('night mix reduces loud impact peaks',night['peak']<natural['peak'])
   stress=render(page,'stress');check('collision storms stay below the voice budget and output ceiling',stress['admitted']<=56 and stress['peak']<.96 and stress['remaining']==0)
   check('browser reports no unexpected errors',not errors)
   browser.close()
 finally:(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
 print(f'{len(checks)} audio checks passed')
if __name__=='__main__':main()
