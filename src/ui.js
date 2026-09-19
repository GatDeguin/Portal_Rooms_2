import {formatTime,clamp} from './math.js';
import {CHAPTERS,ORIGINAL_COUNT,chapterForRoom,originalComplete,offerExpansion} from './campaign.js';
import {previewSVG,mechanicsFor,TARGET_NAMES} from './campaign-view.js';
const SURFACES={wood:'Madera',carpet:'Alfombra',ice:'Hielo',brake:'Freno viscoso',boost:'Impulso',ramp:'Rampa',platform:'Plataforma',air:'En el aire'};
export const SENSOR_MESSAGES={manual:'Sensores desactivados. Teclado, arrastre y stick disponibles.',active:'Inclinación activa. Recalibrá para usar otra posición cómoda.',calibrating:'Mantené el teléfono quieto un instante para calibrar.',unavailable:'Sensores no disponibles. Se requiere HTTPS y un dispositivo compatible.',denied:'Permiso no concedido. Podés seguir con los controles manuales.',timeout:'No llegaron lecturas estables. Usá los controles manuales o recalibrá.'};
export class UI {
  constructor(levels){this.levels=levels;this.nodes=new Map();this.dialogs=[...document.querySelectorAll('dialog')];this.lastFocus=null;
    for(const dialog of this.dialogs)dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
      if(!items.length){event.preventDefault();return;}
      const first=items[0],last=items.at(-1),current=document.activeElement;
      if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(current===last||!dialog.contains(current))){event.preventDefault();first.focus();}
    });
    this.chapterFilter=0;this.previewIndex=null;this.homeKey='';this.stepKey='';
    this.text('levelsTitle',`Un viaje en ${levels.length} salas.`);
    this.text('finalCount',`${levels.length} / ${levels.length}`);
  }
  el(id){if(!this.nodes.has(id))this.nodes.set(id,document.getElementById(id));return this.nodes.get(id);}
  text(id,text){const node=this.el(id),value=String(text);if(node&&node.textContent!==value)node.textContent=value;}
  dialog(id){
    const desired=id?this.el(id):null;
    for(const dialog of this.dialogs)if(dialog.open&&dialog!==desired)dialog.close();
    if(desired&&!desired.open){this.lastFocus=document.activeElement;desired.showModal();desired.scrollTop=0;}
  }
  toast(message){this.text('toast',message);this.el('toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{this.el('toast').hidden=true;},3300);}
  update(engine,store){
    const s=engine.state,p=store.progress,l=engine.room,i=s.level;
    this.text('levelTitle',l.name);this.text('levelPill',`SALA ${String(i+1).padStart(2,'0')} / ${this.levels.length}`);
    this.text('objective',l.objective);this.text('sequenceLabel',l.sequence?`PASO ${s.seq+1}/${l.sequence.length}`:'');
    this.text('roomTime',formatTime(s.elapsed));this.text('bestTime',formatTime(p.bestTimes[i]));this.text('attempts',p.attempts[i]);
    this.el('campaignProgress').max=this.levels.length;this.el('campaignProgress').value=p.completed.length;this.text('campaignText',`${p.completed.length} / ${this.levels.length}`);
    this.text('surfaceTag',SURFACES[s.surface]??'Madera');this.text('gravityValues',`X ${s.gravity.x.toFixed(2)} · Z ${s.gravity.z.toFixed(2)}`);
    const strength=Math.hypot(s.gravity.x,s.gravity.z),angle=Math.atan2(s.gravity.z,s.gravity.x)*180/Math.PI+90;
    this.el('gravityArrow').setAttribute('transform',`rotate(${angle} 32 32)`);this.el('gravityArrow').style.opacity=String(strength<.02?.2:Math.max(.5,strength));
    this.el('gravityCompass').setAttribute('aria-label',`Gravedad horizontal ${s.gravity.x.toFixed(1)}, vertical ${s.gravity.z.toFixed(1)}`);
    this.el('goalHold').hidden=engine.target.type!==3||s.cube.hold<=0||s.solved;this.el('holdProgress').value=clamp(s.cube.hold/.55,0,1);
    this.el('app').classList.toggle('compact-hud',store.settings.compactHUD);
    this.el('app').classList.toggle('expansion-room',l.id>ORIGINAL_COUNT);
    this.text('startProgress',`${p.completed.length} / ${this.levels.length} RESUELTAS`);
    this.text('startBtn',`${p.current?'Continuar en':'Entrar a'} la sala ${String(p.current+1).padStart(2,'0')} →`);
    this.text('pauseInfo',`${l.name} · ${formatTime(s.elapsed)} · Intento ${p.attempts[i]} · ${p.restarts[i]} reinicios`);
    this.campaignUpdate(engine,store);
  }
  settingsTab(key,focus=false){
    const tabs=[...document.querySelectorAll('[data-settings-tab]')];
    if(!tabs.some(tab=>tab.dataset.settingsTab===key))return;
    for(const tab of tabs){
      const selected=tab.dataset.settingsTab===key;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      const panel=this.el(tab.getAttribute('aria-controls'));if(panel)panel.hidden=!selected;
      if(selected&&focus)tab.focus();
    }
  }
  settings(settings,renderer){
    for(const input of document.querySelectorAll('[data-setting]')){
      const value=input.dataset.setting==='quality'&&this.pendingQuality?this.pendingQuality:settings[input.dataset.setting];if(input.type==='checkbox')input.checked=value;else input.value=value;
    }
    this.text('sensitivityValue',`${settings.sensitivity.toFixed(1)}×`);this.text('deadZoneValue',`${(settings.deadZone*100).toFixed(1)}%`);this.text('smoothingValue',`${Math.round(settings.smoothing*1000)} ms`);
    this.text('qualityActual',`Render: ${renderer?.description()??'No disponible'}. Automática adapta efectos y resolución; la física no cambia.`);
  }
  qualityStatus(mode,message){
    this.pendingQuality=mode;
    this.el('quality').setAttribute('aria-busy',String(mode!==null));
    this.el('cancelQualityBtn').hidden=mode===null;
    this.text('qualityState',message);
  }
  sensor(status){this.text('sensorStatus',SENSOR_MESSAGES[status]??SENSOR_MESSAGES.manual);this.text('controlMode',status==='active'?'Inclinación activa':status==='calibrating'?'Calibrando…':'Control manual');}
  campaignUpdate(engine,store){
    const p=store.progress,l=engine.room,s=engine.state;
    this.el('startExpansionBtn').hidden=!offerExpansion(p);
    this.el('migrationNote').hidden=!originalComplete(p);
    this.text('migrationNote',p.completed.length===this.levels.length?'Completaste el circuito original y la expansión. Tus récords están guardados.':'Circuito original completado. Tus salas, tiempos e intentos se conservan; hay 20 nuevos desafíos.');
    const homeKey=`${p.current}:${p.completed.join(',')}:${p.attempts[p.current]}`;
    if(homeKey!==this.homeKey){
      this.homeKey=homeKey;const room=this.levels[p.current],chapter=chapterForRoom(room.id);
      this.text('homeChapter',`${chapter.roman} · ${chapter.name}`);this.text('homeRoomNumber',`${String(room.id).padStart(2,'0')} / ${this.levels.length}`);
      this.text('homeRoomName',room.name);this.text('homeLesson',room.lesson??room.objective);
      this.el('homePreview').innerHTML=previewSVG(room,{prefix:'home'});
      const done=new Set(p.completed),nodes=CHAPTERS.filter(c=>c.first<=this.levels.length).map(c=>{
        const span=document.createElement('span'),count=Array.from({length:c.last-c.first+1},(_,j)=>j+c.first-1).filter(i=>done.has(i)).length;
        span.textContent=c.roman;span.className=count===c.last-c.first+1?'chapter-dot complete':'chapter-dot';span.title=`${c.name}: ${count}/${c.last-c.first+1}`;span.setAttribute('aria-label',span.title);return span;
      });
      this.el('homeChapters').replaceChildren(...nodes);this.el('finalChapters').replaceChildren(...nodes.map(n=>n.cloneNode(true)));
    }
    const stepKey=`${l.id}:${s.seq}:${s.solved}`;
    if(stepKey!==this.stepKey){
      this.stepKey=stepKey;const steps=(l.sequence??[l.target]).map((t,i)=>{
        const span=document.createElement('span');span.className=`objective-step type-${t.type}${s.solved||i<s.seq?' complete':i===s.seq?' active':''}`;
        span.textContent=String(i+1);span.title=`${TARGET_NAMES[t.type]} · ${s.solved||i<s.seq?'completado':i===s.seq?'actual':'pendiente'}`;span.setAttribute('aria-label',span.title);return span;
      });
      this.el('stepTrack').replaceChildren(...steps);this.el('pausePreview').innerHTML=previewSVG(l,{prefix:'pause'});
      this.text('pauseLesson',l.lesson??l.name);this.text('pauseBriefing',l.objective);
    }
  }
  levelsGrid(store){
    const grid=this.el('levelGrid'),p=store.progress,tabs=this.el('chapterTabs');grid.replaceChildren();
    if(!tabs.childElementCount){
      for(const c of [{id:0,roman:'Todas',name:'Todas las salas'},...CHAPTERS]){
        const button=document.createElement('button');button.dataset.chapter=c.id;button.textContent=c.id?`${c.roman} · ${c.name}`:c.roman;button.type='button';tabs.append(button);
      }
    }
    for(const b of tabs.children)b.setAttribute('aria-pressed',String(Number(b.dataset.chapter)===this.chapterFilter));
    const list=this.levels.map((l,i)=>({l,i})).filter(({l})=>!this.chapterFilter||chapterForRoom(l.id).id===this.chapterFilter);
    this.text('levelsSummary',`${p.completed.length} de ${this.levels.length} completadas · ${p.unlocked} desbloqueadas · ${list.length} en esta vista.`);
    if(!list.some(({i})=>i===this.previewIndex))this.previewIndex=list.some(({i})=>i===p.current)?p.current:list[0]?.i??0;
    for(const {l:level,i} of list){
      const button=document.createElement('button');button.className='level-card';button.dataset.previewRoom=i;button.type='button';
      const locked=i>=p.unlocked;if(locked)button.classList.add('locked');if(p.completed.includes(i))button.classList.add('completed');
      const number=document.createElement('span');number.className='level-number';number.textContent=String(i+1).padStart(2,'0')+(p.completed.includes(i)?' ✓':'');
      const name=document.createElement('span');name.className='level-name';name.textContent=level.name;
      const record=document.createElement('span');record.className='level-record';record.textContent=locked?'Bloqueada · ver plano':p.bestTimes[i]===null?'Sin récord':formatTime(p.bestTimes[i]);
      button.append(number,name,record);button.setAttribute('aria-label',`Ver sala ${i+1}: ${level.name}. ${record.textContent}`);grid.append(button);
    }
    this.previewRoom(this.previewIndex,store);
  }
  previewRoom(index,store){
    if(!Number.isInteger(index)||index<0||index>=this.levels.length)return;
    this.previewIndex=index;const room=this.levels[index],chapter=chapterForRoom(room.id),locked=index>=store.progress.unlocked;
    for(const card of this.el('levelGrid').children){const selected=Number(card.dataset.previewRoom)===index;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));}
    this.text('previewChapter',`${chapter.roman} · ${chapter.name}`);this.text('previewNumber',String(room.id).padStart(2,'0'));
    this.text('previewTitle',room.name);this.text('previewBriefing',room.objective);this.text('previewMechanics',mechanicsFor(room).join(' · '));
    this.text('previewRecord',store.progress.bestTimes[index]===null?'Sin récord personal':`Tu mejor marca: ${formatTime(store.progress.bestTimes[index])}`);
    this.text('previewLocked',locked?`Completá la sala ${index} para desbloquearla.`:room.lesson??room.hint);
    this.el('previewPlayBtn').disabled=locked;this.text('previewPlayBtn',locked?'Sala bloqueada':`Entrar a la sala ${String(room.id).padStart(2,'0')} →`);
    this.el('selectedPreview').innerHTML=previewSVG(room,{prefix:'selected'});
  }
  victory(engine,store,result){
    const s=engine.state,p=store.progress,i=s.level;
    const originalEnd=i===ORIGINAL_COUNT-1&&originalComplete(p)&&this.levels.length>ORIGINAL_COUNT;
    this.text('victoryEyebrow',originalEnd?'CIRCUITO ORIGINAL COMPLETADO':result.record?'NUEVO RÉCORD PERSONAL':'EXPERIMENTO RESUELTO');
    this.text('victoryTitle',originalEnd?'Un nuevo dominio te espera.':'Encontraste el equilibrio.');
    this.text('victoryRoom',`Sala ${i+1} · ${engine.room.name}`);
    this.text('nextBtn',originalEnd?'Entrar a la sala 23 →':'Siguiente sala →');
    const next=this.levels[i+1];this.text('nextRoomTitle',next?`Sala ${i+2} · ${next.name}`:'Campaña completada');this.text('nextRoomLesson',next?.lesson??next?.objective??'Volvé a tus salas favoritas para mejorar tus tiempos.');
    this.text('victoryTime',formatTime(s.elapsed));this.text('victoryBest',formatTime(p.bestTimes[i]));this.text('victoryAttempts',p.attempts[i]);this.text('victoryRestarts',p.restarts[i]);
    const records=p.bestTimes.filter(t=>Number.isFinite(t));this.text('finalSummary',`Última sala: ${formatTime(s.elapsed)} · ${records.length} récords registrados · ${p.attempts.reduce((a,b)=>a+b,0)} intentos en total.`);
  }
  error(error){this.dialog(null);this.el('loading').hidden=true;this.el('graphicsError').hidden=false;this.text('errorDetail',error?.message??String(error));}
}
