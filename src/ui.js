import {formatTime,clamp} from './math.js';
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
    this.text('startProgress',`${p.completed.length} / ${this.levels.length} RESUELTAS`);
    this.text('startBtn',`${p.current?'Continuar en':'Entrar a'} la sala ${String(p.current+1).padStart(2,'0')} →`);
    this.text('pauseInfo',`${l.name} · ${formatTime(s.elapsed)} · Intento ${p.attempts[i]} · ${p.restarts[i]} reinicios`);
  }
  settings(settings,renderer){
    for(const input of document.querySelectorAll('[data-setting]')){
      const value=settings[input.dataset.setting];if(input.type==='checkbox')input.checked=value;else input.value=value;
    }
    this.text('sensitivityValue',`${settings.sensitivity.toFixed(1)}×`);this.text('deadZoneValue',`${(settings.deadZone*100).toFixed(1)}%`);this.text('smoothingValue',`${Math.round(settings.smoothing*1000)} ms`);
    this.text('qualityActual',`Render: ${renderer?.description()??'No disponible'}. Automática adapta efectos y resolución; la física no cambia.`);
  }
  sensor(status){this.text('sensorStatus',SENSOR_MESSAGES[status]??SENSOR_MESSAGES.manual);this.text('controlMode',status==='active'?'Inclinación activa':status==='calibrating'?'Calibrando…':'Control manual');}
  levelsGrid(store){
    const grid=this.el('levelGrid'),p=store.progress;grid.replaceChildren();
    this.text('levelsSummary',`${p.completed.length} de ${this.levels.length} completadas · ${p.unlocked} desbloqueadas.`);
    this.levels.forEach((level,i)=>{
      const button=document.createElement('button');button.className='level-card';button.dataset.room=i;button.disabled=i>=p.unlocked;
      if(p.completed.includes(i))button.classList.add('completed');if(i===p.current)button.setAttribute('aria-current','step');
      const number=document.createElement('span');number.className='level-number';number.textContent=String(i+1).padStart(2,'0')+(p.completed.includes(i)?' ✓':'');
      const name=document.createElement('span');name.className='level-name';name.textContent=level.name;
      const record=document.createElement('span');record.className='level-record';record.textContent=button.disabled?'Bloqueada':p.bestTimes[i]===null?'Sin récord':formatTime(p.bestTimes[i]);
      button.append(number,name,record);button.setAttribute('aria-label',`Sala ${i+1}: ${level.name}. ${record.textContent}`);grid.append(button);
    });
  }
  victory(engine,store,result){
    const s=engine.state,p=store.progress,i=s.level;
    this.text('victoryEyebrow',result.record?'NUEVO RÉCORD PERSONAL':'EXPERIMENTO RESUELTO');this.text('victoryRoom',`Sala ${i+1} · ${engine.room.name}`);
    this.text('victoryTime',formatTime(s.elapsed));this.text('victoryBest',formatTime(p.bestTimes[i]));this.text('victoryAttempts',p.attempts[i]);this.text('victoryRestarts',p.restarts[i]);
    const records=p.bestTimes.filter(t=>Number.isFinite(t));this.text('finalSummary',`Última sala: ${formatTime(s.elapsed)} · ${records.length} récords registrados · ${p.attempts.reduce((a,b)=>a+b,0)} intentos en total.`);
  }
  error(error){this.dialog(null);this.el('loading').hidden=true;this.el('graphicsError').hidden=false;this.text('errorDetail',error?.message??String(error));}
}
