import {clamp} from './math.js';
import {movingAt,activeTarget} from './geometry.js';
import {CHAPTERS} from './levels.js';
export const TARGET_NAMES={1:'Placa verde',2:'Placa azul',3:'Aro de estabilidad',4:'Portal'};
export const TARGET_COLORS={1:'#72e7a9',2:'#85baff',3:'#f2cf76',4:'#8cead9'};
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chapterFor = room => CHAPTERS.find(c=>c.id===room.chapter)??CHAPTERS[0];
export function hintFor(room,index=0){const n=clamp(Number.isFinite(index)?Math.trunc(index):0,0,2);return {index:n,text:room.hints?.[n]??room.hint,label:['Una pista','Un poco más','El recorrido'][n]};}
export function sequenceSteps(room,sequence=0,solved=false){return (room.sequence??[room.target]).map((target,index)=>({index,label:TARGET_NAMES[target.type],color:TARGET_COLORS[target.type],status:solved||index<sequence?'complete':index===sequence?'active':'pending'}));}
/** Accurate map from the same room data used by the simulation. No decorative fake routes. */
export function previewSVG(room,{prefix='preview',time=0}={}){
  const id=`${prefix}-${room.id}`.replace(/[^a-zA-Z0-9_-]/g,''),f=n=>Number(n).toFixed(3);
  const rect=(o,attrs)=>`<rect x="${f(o.x-o.w/2)}" y="${f(o.z-o.d/2)}" width="${f(o.w)}" height="${f(o.d)}" ${attrs}/>`;
  const circle=(o,attrs)=>`<circle cx="${f(o.x)}" cy="${f(o.z)}" r="${f(o.r)}" ${attrs}/>`;
  const parts=[`<svg class="room-preview" viewBox="-3.6 -3.8 7.2 7.5" role="img" aria-labelledby="${id}-title"><title id="${id}-title">Sala ${room.id}: ${escapeHTML(room.name)}. Plano orientativo; arriba está el fondo de la sala.</title>`,
    `<defs><pattern id="${id}-grid" width=".5" height=".5" patternUnits="userSpaceOnUse"><path d="M .5 0 H 0 V .5" fill="none" stroke="#9eafb5" stroke-opacity=".1" stroke-width=".012"/></pattern><pattern id="${id}-ramp" width=".14" height=".14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.14" stroke="#ecbd79" stroke-opacity=".35" stroke-width=".03"/></pattern></defs>`,
    `<rect x="-3.23" y="-3.23" width="6.46" height="6.46" rx=".16" fill="#141e24" stroke="#76858b" stroke-opacity=".5" stroke-width=".025"/><rect x="-3.2" y="-3.2" width="6.4" height="6.4" fill="url(#${id}-grid)"/><text x="0" y="-3.46" text-anchor="middle" fill="#93a3ab" font-size=".15" letter-spacing=".08">FONDO</text>`,
    '<rect x="-2.08" y="-.49" width="4.16" height="2.54" rx=".08" fill="#718087" opacity=".08"/>'];
  for(const r of room.ramps){parts.push(rect(r,`data-preview="ramp" fill="url(#${id}-ramp)" stroke="#d2a66d" stroke-width=".024"`));const angle=Math.atan2(r.dz??-1,r.dx??0)*180/Math.PI;parts.push(`<path d="M-.22,0H.22M.07,-.13L.22,0 .07,.13" transform="translate(${f(r.x)} ${f(r.z)}) rotate(${f(angle)})" stroke="#f3cc91" stroke-width=".04" fill="none"/>`);}
  for(const p of room.platforms){const a=movingAt(p,time);parts.push(rect(a,`data-preview="platform" fill="#79644b" fill-opacity=".6" stroke="#d3b284" stroke-width=".04" rx=".045"`));if(p.move)parts.push(`<path d="M${f(p.x-(p.move.amp??0))},${f(p.z)}h${f(2*(p.move.amp??0))}" stroke="#e5c18b" stroke-opacity=".7" stroke-dasharray=".07 .07" stroke-width=".025"/>`);}
  for(const z of [...room.zones,...room.jumpPads.map(p=>({...p,type:5}))]){const color={1:'#7ccbea',2:'#b5a1ed',3:'#ffa067',5:'#8ae9e6'}[z.type]??'#d5b48b';parts.push(circle(z,`fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width=".03" ${z.type===5?'stroke-dasharray=".08 .06"':''}`));if(z.type===5)parts.push(`<path d="M${f(z.x-.15)},${f(z.z+.06)}l.15,-.15 .15,.15" stroke="${color}" stroke-width=".035" fill="none"/>`);}
  for(const o of room.obstacles){const a=movingAt(o,time);if(o.move){const amp=o.move.amp??0;parts.push(`<path d="M${f(o.x-(o.move.axis==='x'?amp:0))},${f(o.z-(o.move.axis==='z'?amp:0))}l${f(o.move.axis==='x'?amp*2:0)},${f(o.move.axis==='z'?amp*2:0)}" stroke="#cfd5dd" stroke-dasharray=".1 .08" stroke-width=".028"/>`);}parts.push(rect(a,`data-preview="obstacle" rx=".04" fill="#687781" stroke="#a1b2ba" stroke-width=".025"`));}
  for(const b of room.bumpers)parts.push(circle(b,'fill="#733c3b" stroke="#ff9a84" stroke-width=".065"'));
  for(const [i] of (room.sequence??[room.target]).entries()){const t=activeTarget(room,i,time),color=TARGET_COLORS[t.type];parts.push(`<g data-preview="goal"><circle cx="${f(t.pos[0])}" cy="${f(t.pos[1])}" r=".32" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-width=".045"/><text x="${f(t.pos[0])}" y="${f(t.pos[1]+.08)}" fill="${color}" text-anchor="middle" font-size=".24" font-family="monospace">${i+1}</text></g>`);}
  parts.push(`<rect x="${f(room.start[0]-.19)}" y="${f(room.start[1]-.19)}" width=".38" height=".38" rx=".065" fill="#ff806e" stroke="#ffb7a6" stroke-width=".03"/><circle cx="${f(room.start[0])}" cy="${f(room.start[1])}" r=".34" fill="none" stroke="#ff806e" stroke-opacity=".4" stroke-width=".02"/></svg>`);
  return parts.join('');
}
