import {movingAt,activeTarget} from './geometry.js';
export const TARGET_NAMES=Object.freeze({1:'Placa verde',2:'Placa azul',3:'Aro de estabilidad',4:'Portal'});
const COLORS={1:'#72e7a9',2:'#85baff',3:'#f2cf76',4:'#8cead9'};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Read-only plan view of exactly the same data used by GameEngine and Renderer. */
export function previewSVG(room,{prefix='preview',time=0}={}){
  const id=`${prefix}-${room.id}`.replace(/[^a-zA-Z0-9_-]/g,''),f=n=>Number(n).toFixed(3);
  const rect=(o,attrs)=>`<rect x="${f(o.x-o.w/2)}" y="${f(o.z-o.d/2)}" width="${f(o.w)}" height="${f(o.d)}" ${attrs}/>`;
  const circle=(o,attrs)=>`<circle cx="${f(o.x)}" cy="${f(o.z)}" r="${f(o.r)}" ${attrs}/>`;
  const arrow=(x,z,dx,dz,color)=>`<path d="M-.2 0H.2M.07 -.12L.2 0 .07 .12" transform="translate(${f(x)} ${f(z)}) rotate(${f(Math.atan2(dz,dx)*180/Math.PI)})" fill="none" stroke="${color}" stroke-width=".04"/>`;
  const movement=o=>{if(!o.move)return '';const a=o.move.amp??0,x=o.move.axis==='x'?a:0,z=o.move.axis==='z'?a:0;return `<path data-axis="${o.move.axis}" d="M${f(o.x-x)} ${f(o.z-z)}L${f(o.x+x)} ${f(o.z+z)}" stroke="#e4c19b" stroke-width=".045" stroke-dasharray=".12 .08"/>`;};
  const parts=[`<svg class="room-preview" viewBox="-3.6 -3.8 7.2 7.4" role="img" aria-labelledby="${id}"><title id="${id}">Sala ${room.id}: ${escape(room.name)}. Plano orientativo. Arriba está el fondo; los números indican el orden de objetivos.</title>`,
    '<rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx=".12" fill="#121c25" stroke="#8a9eac" stroke-width=".035"/>',
    '<rect x="-2.08" y="-.49" width="4.16" height="2.54" fill="#74848c" opacity=".12"/>',
    '<text x="0" y="-3.43" text-anchor="middle" fill="#a4b7c6" font-size=".18" letter-spacing=".08">FONDO</text>'];
  for(const r of room.ramps??[]){parts.push(rect(r,'data-preview="ramp" fill="#755d40" stroke="#e1b777" stroke-width=".04"'));parts.push(arrow(r.x,r.z,r.dx??0,r.dz??-1,'#f5d396'));}
  for(const p of room.platforms??[]){const a=movingAt(p,time);parts.push(movement(p),rect(a,'data-preview="platform" fill="#4c606c" stroke="#b4ced8" stroke-width=".04"'));parts.push(`<text x="${f(a.x)}" y="${f(a.z-a.d/2+.22)}" text-anchor="middle" fill="#eef5fa" font-size=".17">${p.h.toFixed(2)}</text>`);}
  for(const z of [...(room.zones??[]),...(room.jumpPads??[]).map(p=>({...p,type:5}))]){
    const color={1:'#87d4f0',2:'#c3a2f8',3:'#ffad70',5:'#6cebdc'}[z.type]??'#cdd6dd';
    parts.push(circle(z,`data-preview="zone" fill="${color}" fill-opacity=".20" stroke="${color}" stroke-width=".035" ${z.type===5?'stroke-dasharray=".09 .06"':''}`));
    if(z.type===3)parts.push(arrow(z.x,z.z,z.dx??1,z.dz??0,color));
    if(z.type===5)parts.push(`<text x="${f(z.x)}" y="${f(z.z+.09)}" text-anchor="middle" fill="${color}" font-size=".3">↑</text>`);
  }
  for(const o of room.obstacles??[])parts.push(movement(o),rect(movingAt(o,time),'data-preview="obstacle" fill="#64737d" stroke="#c3ccd4" stroke-width=".035" rx=".035"'));
  for(const b of room.bumpers??[])parts.push(circle(b,'data-preview="bumper" fill="#663638" stroke="#ff9386" stroke-width=".07"'));
  for(const [i] of (room.sequence??[room.target]).entries()){
    const t=activeTarget(room,i,time),color=COLORS[t.type];
    parts.push(`<g data-preview="goal"><circle cx="${f(t.pos[0])}" cy="${f(t.pos[1])}" r=".30" fill="#101720" stroke="${color}" stroke-width=".065"/><text x="${f(t.pos[0])}" y="${f(t.pos[1]+.10)}" fill="${color}" text-anchor="middle" font-size=".30" font-weight="bold">${i+1}</text></g>`);
  }
  parts.push(`<rect x="${f(room.start[0]-.2)}" y="${f(room.start[1]-.2)}" width=".4" height=".4" rx=".05" fill="#ff7065" stroke="#ffb6a8" stroke-width=".035"/></svg>`);
  return parts.join('');
}
export function mechanicsFor(room){
  const out=[];
  if(room.zones?.some(z=>z.type===1))out.push('Hielo');if(room.zones?.some(z=>z.type===2))out.push('Freno');if(room.zones?.some(z=>z.type===3))out.push('Impulso');
  if(room.obstacles?.some(o=>o.move))out.push('Compuertas');if(room.ramps?.length)out.push('Rampas');if(room.platforms?.some(p=>p.move))out.push('Transporte');
  if(room.jumpPads?.length)out.push('Salto');if(room.bumpers?.length)out.push('Rebote');return out;
}
