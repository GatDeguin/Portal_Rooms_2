import {CAMPAIGN_LEVELS as LEVELS,ORIGINAL_COUNT} from './campaign.js';
import {HandGameEngine} from './hand-physics.js';
import {HandTracking} from './hand-tracking.js';
import {InputController} from './input.js';
import {SaveStore} from './storage.js';
import {createRenderer} from './renderer-client.js';
import {UI,SENSOR_MESSAGES} from './ui.js';
import {AudioFeedback} from './audio.js';

const ui=new UI(LEVELS),app=ui.el('app'),canvas=ui.el('gl');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let storageProblem=false,adapter=null;
try{adapter=window.localStorage;}catch{storageProblem=true;}
const store=new SaveStore(adapter,LEVELS.length,motion.matches,()=>{storageProblem=true;ui.toast('El guardado está bloqueado. Tu progreso se conserva solo durante esta sesión.');});
const engine=new HandGameEngine(LEVELS,store.settings);engine.reset(store.progress.current);
const audio=new AudioFeedback(()=>store.settings);
function visualPreferences(){app.classList.toggle('reduced-effects',motion.matches||store.settings.effects===false);}
visualPreferences();
const startupController=new AbortController();
let phase='loading',renderer=null,input=null,hands=null,raf=0,last=0,transitionTimer=null,panelStack=[],dirty=true,sceneDrawn=false,qualityRequest=null;
const DIALOGS={menu:'startDialog',paused:'pauseDialog',settings:'settingsDialog',selector:'levelsDialog',victory:'victoryDialog',final:'finalDialog',confirm:'confirmDialog',help:'helpDialog'};

function fail(error){
  cancelQuality();renderer?.destroy();hands?.disable();
  phase='error';app.dataset.phase=phase;engine.pause();input?.clear();audio.suspend();clearTimeout(transitionTimer);
  if(raf)cancelAnimationFrame(raf);raf=0;app.classList.remove('switching');ui.error(error);console.error(error);
}
function requestFrame(){if(!raf&&!document.hidden&&phase!=='error')raf=requestAnimationFrame(frame);}
function invalidate(){dirty=true;requestFrame();}
function showPhase(next){
  if(next!=='settings'&&(!qualityRequest?.startup||phase==='settings'))cancelQuality();
  if(next!=='playing')renderer?.pause?.();
  phase=next;app.dataset.phase=next;
  if(next!=='playing'){engine.pause();input?.clear();}
  if(next==='selector')ui.levelsGrid(store);
  if(next==='settings')ui.settings(store.settings,renderer);
  ui.update(engine,store);renderer?.resize();ui.dialog(DIALOGS[next]??null);invalidate();
}
function pauseGame(){
  if(phase!=='playing'&&phase!=='transition')return;
  clearTimeout(transitionTimer);app.classList.remove('switching');panelStack=[];audio.suspend();showPhase('paused');
}
function resume(){
  if(phase!=='paused'||document.hidden||engine.state.solved)return;
  if(renderer?.recovering){ui.toast('El render se está recuperando. Esperá un momento para seguir.');return;}
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
  if(renderer?.recovering){ui.toast('El render se está recuperando. Esperá un momento para seguir.');return;}
  if(!store.startAttempt(index,restart))return;
  clearTimeout(transitionTimer);input.clear();panelStack=[];engine.settings=store.settings;engine.reset(index);audio.unlock();renderer.quality.resetSamples();
  showPhase('transition');app.classList.add('switching');
  const finish=()=>{
    if(phase!=='transition'||document.hidden)return;
    app.classList.remove('switching');showPhase('playing');engine.start();last=performance.now();canvas.focus({preventScroll:true});requestFrame();
  };
  if(motion.matches)finish();else transitionTimer=setTimeout(finish,180);
}
function frame(now){
  raf=0;
  if(document.hidden||phase==='error')return;
  try{
    if(phase==='playing'){
      const ms=Math.max(0,now-last);last=now;renderer.sample(ms);
      const controls=input.sample(Math.min(ms/1000,.1));controls.hands=hands?.sample()??[];
      engine.advance(ms/1000,controls);
      for(const event of engine.state.events.splice(0)){
        audio.event(event);
        if(event.type==='complete'){
          const result=store.complete(engine.state.level,engine.state.elapsed);ui.victory(engine,store,result);
          const final=store.progress.completed.length===LEVELS.length&&engine.state.level===LEVELS.length-1;
          showPhase(final?'final':'victory');
        }else if(event.type==='goal'&&!engine.state.solved){ui.toast(`Paso ${engine.state.seq} activado. Buscá el siguiente objetivo.`);}
      }
      dirty=true;
    }
    if(dirty){
      if(!sceneDrawn||phase==='playing'||phase==='transition'){renderer.draw(engine,store.settings);sceneDrawn=true;}
      ui.update(engine,store);dirty=false;
    }
    if(phase==='playing')requestFrame();
  }catch(error){fail(error);}
}
async function action(name){
  switch(name){
    case 'start':if(phase==='menu')begin(store.progress.current);break;
    case 'start-expansion':if(phase==='menu'&&store.progress.unlocked>ORIGINAL_COUNT)begin(ORIGINAL_COUNT);break;
    case 'play-preview':if(phase==='selector'&&ui.previewIndex<store.progress.unlocked)begin(ui.previewIndex);break;
    case 'help':openPanel('help');break;
    case 'start-gyro':if(phase==='menu'){const permission=input.enableSensors();begin(store.progress.current);await permission;}break;
    case 'start-hands':if(phase==='menu'&&await hands.enable())begin(store.progress.current);break;
    case 'pause':if(phase==='playing'||phase==='transition')pauseGame();else if(phase==='paused')resume();else back();break;
    case 'resume':resume();break;
    case 'restart':if(['playing','paused'].includes(phase))begin(engine.state.level,true);break;
    case 'retry':if(['victory','final'].includes(phase))begin(engine.state.level);break;
    case 'next':if(phase==='victory'&&engine.state.solved&&engine.state.level<LEVELS.length-1)begin(engine.state.level+1);break;
    case 'hint':if(['playing','paused'].includes(phase))ui.toast(engine.room.hint);break;
    case 'levels':openPanel('selector');break;
    case 'settings':openPanel('settings');break;
    case 'back':back();break;
    case 'menu':clearTimeout(transitionTimer);panelStack=[];audio.suspend();showPhase('menu');break;
    case 'gyro':if(input.sensorEnabled||input.sensorWaiting)input.recalibrate();else await input.enableSensors();break;
    case 'manual':input.disableSensors();break;
    case 'hands':await hands.enable();break;
    case 'hands-calibrate':if(hands.enabled)hands.recalibrate();else await hands.enable();break;
    case 'hands-off':hands.disable();break;
    case 'fullscreen':
      try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else ui.toast('Pantalla completa no está disponible en este navegador.');}
      catch{ui.toast('El navegador no permitió la pantalla completa.');}break;
    case 'confirm-reset':openPanel('confirm');break;
    case 'reset-all':if(phase==='confirm'){store.resetProgress();engine.reset(0);panelStack=[];showPhase('menu');ui.toast('Progreso y récords borrados. Tus ajustes se conservaron.');}break;
    case 'cancel-quality':cancelQuality();break;
    case 'reload':location.reload();break;
    case 'safe-quality':store.setSettings({quality:'low'});location.reload();break;
  }
}
function dispatch(name){Promise.resolve(action(name)).catch(error=>ui.toast(error.message??'No se pudo realizar esta acción.'));}

input=new InputController({canvas,stick:ui.el('stickWrap'),thumb:ui.el('stick'),getSettings:()=>store.settings,isPlaying:()=>phase==='playing'&&!document.hidden,
  onAction:dispatch,onSensor:status=>{ui.sensor(status);if(status!=='manual')ui.toast(SENSOR_MESSAGES[status]);}});
hands=new HandTracking({video:ui.el('handVideo'),overlay:ui.el('handCanvas'),panel:ui.el('handPreview'),status:ui.el('handStatus'),
  isActive:()=>!document.hidden&&['menu','transition','playing','settings'].includes(phase),
  onStatus:(kind,message)=>{if(kind==='error')ui.toast(message);}});
for(const dialog of ui.dialogs)dialog.addEventListener('cancel',e=>{e.preventDefault();if(phase==='paused')resume();else back();});
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-settings-tab]');if(tab){ui.settingsTab(tab.dataset.settingsTab);return;}
  const chapter=e.target.closest('[data-chapter]');
  if(chapter&&phase==='selector'){ui.chapterFilter=Number(chapter.dataset.chapter);ui.levelsGrid(store);return;}
  const roomButton=e.target.closest('[data-preview-room]');
  if(roomButton&&phase==='selector'){ui.previewRoom(Number(roomButton.dataset.previewRoom),store);return;}
  const button=e.target.closest('[data-action]');if(button&&!button.disabled)dispatch(button.dataset.action);
});
function cancelQuality(){
  if(!qualityRequest)return;
  qualityRequest.abort();qualityRequest=null;
  ui.qualityStatus(null,'Cambio cancelado. Se conserva la calidad anterior.');ui.settings(store.settings,renderer);
}
async function applyQuality(value,{startup=false}={}){
  if(!renderer||(!startup&&phase!=='settings'))return;
  cancelQuality();const controller=new AbortController();controller.startup=startup;qualityRequest=controller;
  const label={medium:'Media',high:'Alta',cinematic:'Cinemática'}[value]??value;
  ui.qualityStatus(value,startup?`Preparando ${label}. Mientras tanto, render en Baja. Tu preferencia guardada se conserva.`:'Preparando la calidad gráfica… Podés cancelar o volver sin esperar.');
  ui.settings(store.settings,renderer);
  try{
    await renderer.requestQuality(value,{signal:controller.signal});
    if(qualityRequest!==controller||controller.signal.aborted)return;
    if(!startup)store.setSettings({quality:value});engine.settings=store.settings;
    renderer.quality.resetSamples();last=performance.now();
    ui.qualityStatus(null,'Calidad lista. Se mostrará al volver a la partida.');
  }catch(error){
    if(qualityRequest!==controller)return;
    ui.qualityStatus(null,error.name==='AbortError'?'Cambio cancelado. Se conserva la calidad anterior.':`${error.message} ${startup?'Continúa en Baja; la preferencia guardada y tu progreso se conservan.':'La selección guardada no cambió.'}`);
  }finally{
    if(qualityRequest===controller){qualityRequest=null;ui.settings(store.settings,renderer);invalidate();}
  }
}
// A native select fires input while navigating options. Compile only the committed change.
document.addEventListener('change',e=>{if(e.target.dataset.setting==='quality')void applyQuality(e.target.value);});
ui.el('cancelQualityBtn').addEventListener('click',cancelQuality);
document.addEventListener('input',e=>{
  const element=e.target,key=element.dataset.setting;if(!key||key==='quality')return;
  const value=element.type==='checkbox'?element.checked:element.type==='range'?Number(element.value):element.value;
  store.setSettings({[key]:value});engine.settings=store.settings;visualPreferences();
  if(key==='sound'){audio.refresh();if(value){audio.unlock();audio.tone(520);}}
  ui.settings(store.settings,renderer);ui.update(engine,store);invalidate();
});
document.addEventListener('keydown',e=>{
  const tab=e.target.closest?.('[data-settings-tab]');if(!tab)return;
  const tabs=[...document.querySelectorAll('[data-settings-tab]')],index=tabs.indexOf(tab);
  const next=e.key==='ArrowRight'?(index+1)%tabs.length:e.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;
  if(next>=0){e.preventDefault();e.stopPropagation();ui.settingsTab(tabs[next].dataset.settingsTab,true);}
});
window.addEventListener('resize',()=>{if(renderer&&!renderer.lost){renderer.resize();invalidate();}});
window.addEventListener('blur',()=>{input.clear();pauseGame();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelQuality();renderer?.pause?.();pauseGame();engine.pause();input.clear();audio.suspend();if(raf)cancelAnimationFrame(raf);raf=0;}
  else{last=performance.now();renderer?.quality.resetSamples();invalidate();}
});
window.addEventListener('pagehide',event=>{if(phase==='loading')startupController.abort();hands?.disable();if(!event.persisted)renderer?.destroy();cancelQuality();renderer?.pause?.();pauseGame();if(raf)cancelAnimationFrame(raf);raf=0;audio.suspend();});
window.addEventListener('pageshow',event=>{if(event.persisted&&phase==='loading'&&startupController.signal.aborted){location.reload();return;}if(phase!=='loading')invalidate();});
motion.addEventListener?.('change',e=>{if(e.matches){store.setSettings({dynamicCamera:false});engine.settings=store.settings;}visualPreferences();ui.settings(store.settings,renderer);invalidate();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
try{
  renderer=await createRenderer(canvas,{signal:startupController.signal,quality:store.settings.quality,engine,settings:store.settings,onWarning:message=>{pauseGame();ui.qualityStatus(null,message);ui.toast(message);},onContextLost:error=>fail(error??new Error('Se perdió el contexto WebGL. El progreso guardado no se elimina al recargar.'))});
  ui.el('loading').hidden=true;ui.sensor('manual');showPhase('menu');
  if(renderer.startupQuality)void applyQuality(renderer.startupQuality,{startup:true});
  if(renderer.warning){ui.qualityStatus(null,renderer.warning);ui.toast(renderer.warning);}
  if(storageProblem)ui.toast('No se puede guardar en este navegador. Esta sesión funciona en memoria.');
}catch(error){if(error.name!=='AbortError')fail(error);}
