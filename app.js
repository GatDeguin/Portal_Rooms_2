import {LEVELS} from './levels.js';
import {GameEngine} from './physics.js';
import {InputController} from './input.js';
import {SaveStore} from './storage.js';
import {Renderer} from './renderer.js';
import {UI,SENSOR_MESSAGES} from './ui.js';
import {AudioFeedback} from './audio.js';
import {Feedback} from './feedback.js';

const ui=new UI(LEVELS),app=ui.el('app'),canvas=ui.el('gl');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let storageProblem=false,adapter=null;
try{adapter=window.localStorage;}catch{storageProblem=true;}
const store=new SaveStore(adapter,LEVELS.length,motion.matches,()=>{storageProblem=true;ui.toast('El guardado está bloqueado. Tu progreso se conserva solo durante esta sesión.');});
const engine=new GameEngine(LEVELS,store.settings);engine.reset(store.progress.current);
const audio=new AudioFeedback(()=>store.settings);
const feedback=new Feedback(app,()=>store.settings,motion);
let phase='loading',renderer=null,input=null,raf=0,last=0,transitionTimer=null,finishTransition=null,panelStack=[],dirty=true;
const DIALOGS={menu:'startDialog',paused:'pauseDialog',settings:'settingsDialog',selector:'levelsDialog',victory:'victoryDialog',final:'finalDialog',confirm:'confirmDialog',help:'helpDialog'};

function fail(error){
  phase='error';app.dataset.phase=phase;engine.pause();input?.clear();audio.suspend();clearTimeout(transitionTimer);
  if(raf)cancelAnimationFrame(raf);raf=0;app.classList.remove('switching');ui.error(error);console.error(error);
}
function requestFrame(){if(!raf&&!document.hidden&&phase!=='error')raf=requestAnimationFrame(frame);}
function invalidate(){dirty=true;requestFrame();}
function showPhase(next){
  phase=next;app.dataset.phase=next;
  if(next!=='playing'){engine.pause();input?.clear();ui.closeHint();ui.el('welcomeChip').hidden=true;}
  if(next==='selector'){ui.previewIndex=store.progress.current;ui.chapterFilter=0;ui.levelsGrid(store);}
  if(next==='settings')ui.settings(store.settings,renderer);
  ui.update(engine,store);ui.dialog(DIALOGS[next]??null);invalidate();
}
function pauseGame(){
  if(phase!=='playing'&&phase!=='transition')return;
  clearTimeout(transitionTimer);finishTransition=null;feedback.clear();app.classList.remove('switching');panelStack=[];audio.suspend();showPhase('paused');
}
function resume(){
  if(phase!=='paused'||document.hidden||engine.state.solved)return;
  input.clear();audio.unlock();renderer.quality.resetSamples();showPhase('playing');engine.start();last=performance.now();canvas.focus({preventScroll:true});requestFrame();
}
function openPanel(panel){
  if(phase==='loading'||phase==='error'||phase==='transition')return;
  const previous=phase==='playing'?'paused':phase;panelStack.push(previous);audio.suspend();showPhase(panel);
}
function back(){
  if(!['settings','selector','confirm','help'].includes(phase))return;
  showPhase(panelStack.pop()??'menu');
}
function begin(index,restart=false){
  if(!store.startAttempt(index,restart))return;
  clearTimeout(transitionTimer);input.clear();panelStack=[];engine.settings=store.settings;engine.reset(index);audio.unlock();renderer.quality.resetSamples();
  ui.resetHints();showPhase('transition');ui.intro(engine);app.classList.add('switching');
  const finish=finishTransition=()=>{
    if(phase!=='transition'||document.hidden)return;
    clearTimeout(transitionTimer);finishTransition=null;app.classList.remove('switching');showPhase('playing');engine.start();last=performance.now();canvas.focus({preventScroll:true});ui.welcome(engine);requestFrame();
  };
  if(motion.matches||!store.settings.effects)finish();else transitionTimer=setTimeout(finish,480);
}
function frame(now){
  raf=0;
  if(document.hidden||phase==='error')return;
  try{
    if(phase==='playing'){
      const ms=Math.max(0,now-last);last=now;renderer.sample(ms);
      engine.advance(ms/1000,input.sample(Math.min(ms/1000,.1)));
      for(const event of engine.state.events.splice(0)){
        audio.event(event);feedback.event(event,ui);
        if(event.type==='complete'){
          const result=store.complete(engine.state.level,engine.state.elapsed);ui.victory(engine,store,result);
          const final=store.progress.completed.length===LEVELS.length&&engine.state.level===LEVELS.length-1;
          showPhase(final?'final':'victory');
        }else if(event.type==='goal'&&!engine.state.solved){ui.toast(`Paso ${engine.state.seq} activado. Buscá el siguiente objetivo.`);}
      }
      dirty=true;
    }
    if(dirty){renderer.draw(engine,{...store.settings,effects:store.settings.effects&&!motion.matches,dynamicCamera:store.settings.dynamicCamera&&!motion.matches});ui.update(engine,store);dirty=false;}
    if(phase==='playing')requestFrame();
  }catch(error){fail(error);}
}
async function action(name){
  switch(name){
    case 'start':if(phase==='menu')begin(store.progress.current);break;
    case 'start-gyro':if(phase==='menu'){const permission=input.enableSensors();begin(store.progress.current);await permission;}break;
    case 'pause':if(phase==='playing'||phase==='transition')pauseGame();else if(phase==='paused')resume();else back();break;
    case 'resume':resume();break;
    case 'restart':if(['playing','paused'].includes(phase))begin(engine.state.level,true);break;
    case 'retry':if(['victory','final'].includes(phase))begin(engine.state.level);break;
    case 'next':if(phase==='victory'&&engine.state.solved&&engine.state.level<LEVELS.length-1)begin(engine.state.level+1);break;
    case 'hint':if(phase==='playing')ui.hint(engine.room);break;
    case 'close-hint':ui.closeHint();break;
    case 'help':openPanel('help');break;
    case 'skip-intro':if(phase==='transition')finishTransition?.();break;
    case 'play-preview':if(phase==='selector')begin(ui.previewIndex);break;
    case 'levels':openPanel('selector');break;
    case 'settings':openPanel('settings');break;
    case 'back':back();break;
    case 'menu':clearTimeout(transitionTimer);panelStack=[];audio.suspend();showPhase('menu');break;
    case 'gyro':if(input.sensorEnabled||input.sensorWaiting)input.recalibrate();else await input.enableSensors();break;
    case 'manual':input.disableSensors();break;
    case 'fullscreen':
      try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else ui.toast('Pantalla completa no está disponible en este navegador.');}
      catch{ui.toast('El navegador no permitió la pantalla completa.');}break;
    case 'confirm-reset':openPanel('confirm');break;
    case 'reset-all':if(phase==='confirm'){store.resetProgress();engine.reset(0);panelStack=[];showPhase('menu');ui.toast('Progreso y récords borrados. Tus ajustes se conservaron.');}break;
    case 'reload':location.reload();break;
    case 'safe-quality':store.setSettings({quality:'low'});location.reload();break;
  }
}
function dispatch(name){Promise.resolve(action(name)).catch(error=>ui.toast(error.message??'No se pudo realizar esta acción.'));}

input=new InputController({canvas,stick:ui.el('stickWrap'),thumb:ui.el('stick'),getSettings:()=>store.settings,isPlaying:()=>phase==='playing'&&!document.hidden,
  onAction:dispatch,onSensor:status=>{ui.sensor(status);if(status!=='manual')ui.toast(SENSOR_MESSAGES[status]);}});
for(const dialog of ui.dialogs)dialog.addEventListener('cancel',e=>{e.preventDefault();if(phase==='paused')resume();else back();});
document.addEventListener('click',e=>{
  const roomButton=e.target.closest('[data-preview-room]');
  if(roomButton&&phase==='selector'){ui.preview(store,Number(roomButton.dataset.previewRoom));return;}
  const chapter=e.target.closest('[data-chapter]');if(chapter&&phase==='selector'){ui.filterChapter(Number(chapter.dataset.chapter),store);return;}
  const tab=e.target.closest('[data-settings-tab]');if(tab&&phase==='settings'){ui.settingsTab(tab.dataset.settingsTab);return;}
  const button=e.target.closest('[data-action]');if(button&&!button.disabled)dispatch(button.dataset.action);
});
document.addEventListener('input',e=>{
  const element=e.target,key=element.dataset.setting;if(!key)return;
  const value=element.type==='checkbox'?element.checked:element.type==='range'?Number(element.value):element.value;
  store.setSettings({[key]:value});engine.settings=store.settings;
  if(key==='quality')renderer?.setQuality(store.settings.quality);
  if(key==='volume')audio.refresh();
  if(key==='effects'&&!value)feedback.clear();
  if(key==='sound'){audio.refresh();if(value){audio.unlock();audio.tone(520);}}
  ui.settings(store.settings,renderer);ui.saved(Boolean(adapter)&&!store.failed);ui.update(engine,store);invalidate();
});
document.addEventListener('keydown',e=>{
  if(phase==='transition'&&e.key==='Enter'){e.preventDefault();finishTransition?.();return;}
  if(phase==='settings'&&e.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
    e.preventDefault();const tabs=[...document.querySelectorAll('[data-settings-tab]')],index=tabs.indexOf(e.target);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    ui.settingsTab(tabs[next].dataset.settingsTab);tabs[next].focus();
  }
  if(phase==='selector'&&e.target.matches('[data-preview-room]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();const buttons=[...ui.el('levelGrid').querySelectorAll('button')],index=buttons.indexOf(e.target),columns=getComputedStyle(ui.el('levelGrid')).gridTemplateColumns.split(' ').length;
    const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key],next=Math.max(0,Math.min(buttons.length-1,index+step));buttons[next].focus();buttons[next].click();
  }
});
window.addEventListener('resize',()=>{if(renderer&&!renderer.lost){renderer.resize();invalidate();}});
window.addEventListener('blur',()=>{input.clear();pauseGame();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){feedback.clear();pauseGame();engine.pause();input.clear();audio.suspend();if(raf)cancelAnimationFrame(raf);raf=0;}
  else{last=performance.now();renderer?.quality.resetSamples();invalidate();}
});
window.addEventListener('pagehide',()=>{pauseGame();if(raf)cancelAnimationFrame(raf);raf=0;audio.suspend();});
window.addEventListener('pageshow',()=>{if(phase!=='loading')invalidate();});
motion.addEventListener?.('change',e=>{if(e.matches){feedback.clear();store.setSettings({dynamicCamera:false,effects:false});engine.settings=store.settings;ui.settings(store.settings,renderer);invalidate();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
try{
  renderer=new Renderer(canvas,{quality:store.settings.quality,onContextLost:()=>fail(new Error('Se perdió el contexto WebGL. El progreso guardado no se elimina al recargar.'))});
  ui.el('loading').hidden=true;ui.sensor('manual');showPhase('menu');
  if(storageProblem)ui.toast('No se puede guardar en este navegador. Esta sesión funciona en memoria.');
}catch(error){fail(error);}
