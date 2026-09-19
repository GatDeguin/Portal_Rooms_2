// Read-only audit probes. No shipped level changes, no teleportation after spawn.
import {GameEngine} from '../src/physics.js';
import {CAMPAIGN_LEVELS} from '../src/campaign.js';
import {unit2} from '../src/math.js';
import {movingAt} from '../src/geometry.js';
import {playExpansion} from './helpers/expansion-pilot.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const routes={
  6:[[-2.2,2.45],[2.3,2.45],[2.05,-1.75]],
  7:[[-2.55,2.45],[2.55,2.45],[2.55,-1.72],[1.95,-1.72]],
  9:[[-2.2,2.45],[2.6,2.45],[2.6,-1.8],[2.05,-1.8]],
  10:[[-2.2,2.4],[2.5,2.4],[2.5,-1.65],[2.05,-1.65]],
  12:[[-2.55,1.8],[-2.55,-2.42],[0,-2.42]],
  16:[[-2.2,2.4],[2.3,2.4],[2.3,-1.55],[1.85,-1.55]],
  19:[[-2.3,2.55],[2.45,2.55],[2.45,-1.82],[2,-1.82]],
  28:[[-2.4,1.75],[-2.4,-1.75],[-.6,-1.65]]
};
function run(id,strongGravity){
 const e=new GameEngine(CAMPAIGN_LEVELS,{strongGravity});e.reset(id-1);e.start();
 const frames=[],events=[],surfaces=new Set(),path=[];let k=0,g=strongGravity?5.7:3.9;
 while(!e.state.solved&&e.state.time<70){
  const c=e.state.cube,[x,z]=routes[id][k],dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),speed=Math.min(1.1,d*3);
  if(k<routes[id].length-1&&d<.12&&Math.hypot(c.vx,c.vz)<.3){k++;continue;}
  const f=({ice:.13,brake:3.4,carpet:1.28}[e.state.surface]??.92);
  const v=unit2(((d?dx/d*speed:0)-c.vx)*4/g+f*c.vx/g,((d?dz/d*speed:0)-c.vz)*4/g+f*c.vz/g);
  frames.push([v.x,v.z]);e.advance(1/60,v);for(const ev of e.state.events)events.push({...ev,t:e.state.time});surfaces.add(e.state.surface);
  if(frames.length%12===0)path.push({x:c.x,y:c.y,z:c.z,t:e.state.time});
 }
 const replay=new GameEngine(CAMPAIGN_LEVELS,{strongGravity});replay.reset(id-1);replay.start();for(const [x,z] of frames)replay.advance(1/60,{x,z});
 return {id,strongGravity,solved:e.state.solved,replay:replay.state.solved,seconds:e.state.time,waypoints:routes[id],surfaces:[...surfaces],jumps:events.filter(x=>x.type==='jump').length,bumpers:events.filter(x=>x.type==='bumper').length,impacts:events.filter(x=>x.type==='impact').length,frames,path};
}
const bypass=[];for(const id of Object.keys(routes).map(Number))for(const gravity of [true,false])bypass.push(run(id,gravity));
const expansion=[];for(let id=23;id<=42;id++){const r=playExpansion(id,{trace:true});expansion.push({id,solved:r.solved,seconds:r.seconds,surfaces:r.surfaces,supports:r.supports,actions:r.actions,jumps:r.events.filter(e=>e.type==='jump').length,bumpers:r.events.filter(e=>e.type==='bumper').length,path:r.path});}
const room=CAMPAIGN_LEVELS[30];let min=Infinity,max=-Infinity;
for(let i=0;i<=10000;i++){const t=i/10000*2*Math.PI/.65,a=movingAt(room.platforms[1],t),b=movingAt(room.platforms[2],t);const overlap=Math.min(a.z+a.d/2,b.z+b.d/2)-Math.max(a.z-a.d/2,b.z-b.d/2);min=Math.min(min,overlap);max=Math.max(max,overlap);}
const result={base:'18a05a1da74d56603924407db393d08c67eaf309',scope:'software input-only simulation, not human difficulty or GPU validation',bypass,expansion,room31Overlap:{sampleCount:10001,min,max,xOverlap:.1,analytic:'1.4 - 1.2 * abs(sin(0.65*t)); positive for all t'}};
const output=resolve(process.argv[2]??'test-results/design-audit');mkdirSync(output,{recursive:true});
writeFileSync(resolve(output,'design-probes.json'),JSON.stringify(result));
if(!bypass.every(r=>r.solved&&r.replay)||!expansion.every(r=>r.solved))throw new Error('Audit route did not reproduce');
console.log(JSON.stringify({...result,bypass:bypass.map(({frames,path,...x})=>x),expansion:expansion.map(({actions,path,...x})=>x)},null,2));
