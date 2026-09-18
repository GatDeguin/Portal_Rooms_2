import {formatTime,clamp} from './math.js';
import {CHAPTERS} from './levels.js';
import {chapterFor,previewSVG,hintFor,sequenceSteps,escapeHTML} from './presentation.js';
const SURFACES={wood:'Madera',carpet:'Alfombra',ice:'Hielo · anticipá el freno',brake:'Freno · soltá el impulso',boost:'Impulso · seguí las flechas',ramp:'Rampa · mantené el centro',platform:'Plataforma',air:'En el aire · corregí suave'};
export const SENSOR_MESSAGES={manual:'Sensores desactivados. Teclado, arrastre y stick disponibles.',active:'Inclinación activa. Recalibrá para usar otra posición cómoda.',calibrating:'Mantené el teléfono quieto un instante para calibrar.',unavailable:'Sensores no disponibles. Se requiere HTTPS y un dispositivo compatible.',denied:'Permiso no concedido. Podés seguir con los controles manuales.',timeout:'No llegaron lecturas estables. Usá los controles manuales o recalibrá.'};
export class UI {
  constructor(levels){this.levels=levels;this.nodes=new Map();this.dialogs=[...document.querySelectorAll('dialog')];this.hintIndex=0;this.previewIndex=0;this.chapterFilter=0;this.homeKey='';this.stepKey='';this.pauseKey='';
    for(const dialog of this.dialogs)dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
      if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1),current=document.activeElement;
      if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(current===last||!dialog.contains(current))){event.preventDefault();first.focus();}
    });
  }
  el(id){if(!this.nodes.has(id))this.nodes.set(id,document.getElementById(id));return this.nodes.get(id);}
  text(id,text){const node=this.el(id),value=String(text);if(node&&node.textContent!==value)node.textContent=value;}
  dialog(id){const desired=id?this.el(id):null;for(const d of this.dialogs)if(d.open&&d!==desired)d.close();if(desired&&!desired.open){desired.showModal();desired.scrollTop=0;}this.el('roomIntro').hidden=this.el('app').dataset.phase!=='transition';}
  toast(message){this.text('toast',message);this.el('toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{this.el('toast').hidden=true;},3600);}
  resetHints(){this.hintIndex=0;this.closeHint();clearTimeout(this.welcomeTimer);this.el('welcomeChip').hidden=true;}
  closeHint(){this.el('hintCard').hidden=true;}
  hint(room){const hint=hintFor(room,this.hintIndex++);this.text('hintTitle',`${hint.label} · ${hint.index+1}/3`);this.text('hintText',hint.text);this.el('moreHintBtn').hidden=hint.index===2;this.el('hintCard').hidden=false;}
  intro(engine){const room=engine.room,chapter=chapterFor(room);this.text('introChapter',`CAPÍTULO ${chapter.id} · ${chapter.name}`);this.text('introNumber',String(room.id).padStart(2,'0'));this.text('introName',room.name);this.text('introLesson',room.lesson);this.el('roomIntro').hidden=false;}
  welcome(engine){this.text('welcomeChip',`${engine.room.lesson} · H: pista`);this.el('welcomeChip').hidden=false;clearTimeout(this.welcomeTimer);this.welcomeTimer=setTimeout(()=>{this.el('welcomeChip').hidden=true;},3400);}
  update(engine,store){
    const s=engine.state,p=store.progress,l=engine.room,i=s.level;
    this.text('levelTitle',l.name);this.text('levelPill',`SALA ${String(i+1).padStart(2,'0')} / ${this.levels.length}`);this.text('objective',l.objective);this.text('sequenceLabel',l.sequence?`PASO ${s.seq+1}/${l.sequence.length}`:'');
    this.text('roomTime',formatTime(s.elapsed));this.text('bestTime',formatTime(p.bestTimes[i]));this.text('attempts',p.attempts[i]);
    this.el('campaignProgress').max=this.levels.length;this.el('campaignProgress').value=p.completed.length;this.text('campaignText',`${p.completed.length} / ${this.levels.length}`);
    this.text('surfaceTag',SURFACES[s.surface]??'Madera');this.el('app').dataset.surface=s.surface;this.text('gravityValues',`X ${s.gravity.x.toFixed(2)} · Z ${s.gravity.z.toFixed(2)}`);
    const strength=Math.hypot(s.gravity.x,s.gravity.z),angle=Math.atan2(s.gravity.z,s.gravity.x)*180/Math.PI+90;
    this.el('gravityArrow').setAttribute('transform',`rotate(${angle} 32 32)`);this.el('gravityArrow').style.opacity=String(strength<.02?.3:Math.max(.55,strength));
    this.el('gravityCompass').setAttribute('aria-label',`Gravedad horizontal ${s.gravity.x.toFixed(1)}, vertical ${s.gravity.z.toFixed(1)}`);
    this.el('goalHold').hidden=engine.target.type!==3||s.cube.hold<=0||s.solved;this.el('holdProgress').value=clamp(s.cube.hold/.55,0,1);
    this.el('app').classList.toggle('compact-hud',store.settings.compactHUD);this.el('app').classList.toggle('effects-off',store.settings.effects===false);
    const stepKey=`${i}:${s.seq}:${s.solved}`;
    if(this.stepKey!==stepKey){this.stepKey=stepKey;this.el('stepTrack').innerHTML=sequenceSteps(l,s.seq,s.solved).map(step=>`<span class="step-pill ${step.status}" style="--step-color:${step.color}" ${step.status==='active'?'aria-current="step"':''} title="${step.label}"><b>${step.status==='complete'?'✓':step.index+1}</b><span>${step.label}</span><span class="sr-only"> ${step.status==='complete'?'completado':step.status==='active'?'actual':'pendiente'}</span></span>`).join('');}
    this.text('pauseInfo',`${l.name} · ${formatTime(s.elapsed)} · Intento ${p.attempts[i]} · ${p.restarts[i]} reinicios`);
    this.text('pauseLesson',l.lesson);this.text('pauseBriefing',l.briefing);
    if(this.pauseKey!==i){this.pauseKey=i;this.el('pausePreview').innerHTML=previewSVG(l,{prefix:'pause'});}
    const homeKey=`${p.current}:${p.completed.join(',')}:${p.attempts[p.current]}`;
    if(this.homeKey!==homeKey){this.homeKey=homeKey;const room=this.levels[p.current],chapter=chapterFor(room);
      this.text('startProgress',`${p.completed.length} / ${this.levels.length} RESUELTAS`);this.text('startBtn',`${p.attempts[p.current]?'Continuar en':'Entrar a'} la sala ${String(p.current+1).padStart(2,'0')} →`);
      this.text('homeChapter',`0${chapter.id} / ${chapter.name}`);this.text('homeRoomNumber',`${String(p.current+1).padStart(2,'0')} / 22`);this.text('homeRoomName',room.name);this.text('homeLesson',room.lesson);this.el('homePreview').innerHTML=previewSVG(room,{prefix:'home'});
      this.el('homeChapters').innerHTML=CHAPTERS.map(ch=>{const rooms=this.levels.filter(l=>l.chapter===ch.id),done=rooms.filter(l=>p.completed.includes(l.id-1)).length;return `<span title="${ch.name}: ${done}/${rooms.length}" style="--chapter:${ch.color};--completion:${done/rooms.length*100}%"><i></i><span class="sr-only">${ch.name}: ${done}/${rooms.length}</span></span>`;}).join('');
    }
    this.el('migrationNote').hidden=!store.courseMigrated;
  }
  settings(settings,renderer){
    for(const input of document.querySelectorAll('[data-setting]')){const value=settings[input.dataset.setting];if(input.type==='checkbox')input.checked=value;else input.value=value;}
    this.text('sensitivityValue',`${settings.sensitivity.toFixed(1)}×`);this.text('deadZoneValue',`${(settings.deadZone*100).toFixed(1)}%`);this.text('smoothingValue',`${Math.round(settings.smoothing*1000)} ms`);this.text('volumeValue',`${Math.round((settings.volume??.65)*100)}%`);
    this.text('qualityActual',`Render: ${renderer?.description()??'No disponible'}. La calidad modifica efectos y resolución, nunca la física.`);
  }
  settingsTab(name){if(!['controls','scene','audio'].includes(name))return;for(const tab of document.querySelectorAll('[data-settings-tab]')){const chosen=tab.dataset.settingsTab===name;tab.setAttribute('aria-selected',String(chosen));tab.tabIndex=chosen?0:-1;this.el(`settings-${tab.dataset.settingsTab}`).hidden=!chosen;}}
  saved(persistent){this.text('settingsSaved',persistent?'Ajustes guardados en este navegador':'Ajustes conservados solo en esta sesión');this.el('settingsSaved').classList.remove('saved-flash');void this.el('settingsSaved').offsetWidth;this.el('settingsSaved').classList.add('saved-flash');}
  sensor(status){this.text('sensorStatus',SENSOR_MESSAGES[status]??SENSOR_MESSAGES.manual);this.text('controlMode',status==='active'?'Inclinación activa':status==='calibrating'?'Calibrando…':'Control manual');}
  levelsGrid(store){
    const grid=this.el('levelGrid'),p=store.progress;grid.replaceChildren();this.text('levelsSummary',`${p.completed.length} ${p.completed.length===1?'completada':'completadas'} · ${p.unlocked} ${p.unlocked===1?'desbloqueada':'desbloqueadas'} · Cada sala enseña algo distinto.`);
    this.el('chapterTabs').innerHTML=[{id:0,name:'Todas'},...CHAPTERS].map(ch=>`<button class="chapter-tab" data-chapter="${ch.id}" aria-pressed="${this.chapterFilter===ch.id}">${ch.id?`0${ch.id} `:''}${ch.name}</button>`).join('');
    for(const [i,level] of this.levels.entries()){
      if(this.chapterFilter&&level.chapter!==this.chapterFilter)continue;
      const b=document.createElement('button');b.className='level-card';b.dataset.previewRoom=i;b.dataset.locked=String(i>=p.unlocked);b.setAttribute('aria-pressed',String(i===this.previewIndex));
      if(p.completed.includes(i))b.classList.add('completed');if(i===p.current)b.setAttribute('aria-current','step');
      b.innerHTML=`<span class="level-number">${String(i+1).padStart(2,'0')}<span class="level-status" aria-hidden="true">${p.completed.includes(i)?'✓':i>=p.unlocked?'◇':'↗'}</span></span><span class="level-name">${escapeHTML(level.name)}</span><span class="level-record">${i>=p.unlocked?'Vista previa':p.bestTimes[i]===null?'Por explorar':formatTime(p.bestTimes[i])}</span>`;
      b.setAttribute('aria-label',`Vista previa de sala ${i+1}: ${level.name}${i>=p.unlocked?'. Entrada bloqueada.':''}`);grid.append(b);
    }
    this.preview(store,this.previewIndex);
  }
  filterChapter(id,store){this.chapterFilter=clamp(Math.trunc(id)||0,0,4);if(this.chapterFilter&&this.levels[this.previewIndex].chapter!==this.chapterFilter)this.previewIndex=this.levels.findIndex(l=>l.chapter===this.chapterFilter);this.levelsGrid(store);}
  preview(store,index){
    this.previewIndex=clamp(Math.trunc(index)||0,0,this.levels.length-1);const i=this.previewIndex,l=this.levels[i],p=store.progress,ch=chapterFor(l),locked=i>=p.unlocked;
    for(const b of this.el('levelGrid').querySelectorAll('[data-preview-room]'))b.setAttribute('aria-pressed',String(Number(b.dataset.previewRoom)===i));
    this.text('previewChapter',`0${ch.id} / ${ch.name}`);this.text('previewNumber',String(l.id).padStart(2,'0'));this.text('previewTitle',l.name);this.text('previewBriefing',l.briefing);this.el('selectedPreview').innerHTML=previewSVG(l,{prefix:'selected'});
    this.el('previewMechanics').innerHTML=l.mechanics.map(m=>`<span>${escapeHTML(m)}</span>`).join('');this.text('previewRecord',p.bestTimes[i]!==null?`Tu récord: ${formatTime(p.bestTimes[i])}`:p.legacyBestTimes?.[i]!=null?`Anterior: ${formatTime(p.legacyBestTimes[i])} · archivado`:'Un nuevo recorrido, una nueva marca.');
    this.text('previewLocked',locked?`Completá la sala ${i} para desbloquear esta entrada.`:'El cronómetro empieza al entrar, no al mirar.');this.el('previewPlayBtn').disabled=locked;this.text('previewPlayBtn',locked?'Entrada bloqueada':`Entrar a la sala ${String(i+1).padStart(2,'0')} →`);
  }
  victory(engine,store,result){
    const s=engine.state,p=store.progress,i=s.level;this.text('victoryEyebrow',result.record?'NUEVO RÉCORD PERSONAL':'EXPERIMENTO RESUELTO');this.text('victoryRoom',`Sala ${i+1} · ${engine.room.name}`);this.text('victoryTime',formatTime(s.elapsed));this.text('victoryBest',formatTime(p.bestTimes[i]));this.text('victoryAttempts',p.attempts[i]);this.text('victoryRestarts',p.restarts[i]);
    const next=this.levels[i+1];this.el('nextBtn').hidden=!next;this.el('nextBtn').closest('.menu-grid').previousElementSibling.hidden=!next;this.text('nextRoomTitle',next?`${String(i+2).padStart(2,'0')} / ${next.name}`:'');this.text('nextRoomLesson',next?.lesson??'');
    const records=p.bestTimes.filter(t=>Number.isFinite(t));this.text('finalSummary',`Última sala: ${formatTime(s.elapsed)} · ${records.length} récords del circuito actual · ${p.attempts.reduce((a,b)=>a+b,0)} intentos en total.`);
    this.el('finalChapters').innerHTML=CHAPTERS.map(ch=>`<span style="--chapter:${ch.color}"><b>✓</b> ${ch.name}</span>`).join('');
  }
  error(error){this.dialog(null);this.el('loading').hidden=true;this.el('graphicsError').hidden=false;this.text('errorDetail',error?.message??String(error));}
}
