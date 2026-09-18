// Test-only pilot. It can only read simulation state and provide gravity input.
// No position, velocity, clock, sequence or grounded state is ever assigned.
import {GameEngine} from '../../src/physics.js';
import {LEVELS} from '../../src/levels.js';
import {clamp,unit2} from '../../src/math.js';
export const WAYPOINTS = [
  [[]],
  [[[1.5,-1.85]]],
  [[[-1.95,.6]]],
  [[]],
  [[[1.6,1.95]],[[1.7,-1.95],[-1.75,-1.95]],[[-1.75,-2.42]]],
  [[[-1.6,-2.25],[1.8,-2.25]]],
  [[[.15,.55],[1.6,-.15]]],
  [[[.35,.15]]],
  [[[-1.9,-1.8]]],
  [[[-.3,-.4],[1.45,-.65]]],
  [[[-1.9,-2.2]]],
  [[[-.75,.15],[-1.25,-1.7]]],
  [[[-1.8,1.95],[1.55,1.95]],[[-1.85,1.65]],[[-1.85,-2.42]]],
  [[[-2.4,2.55],[2.4,2.55]],[[2.5,-2.3],[-2.4,-2.3]],[[-2.3,-2.55],[1.55,-2.55]],[[0,-2.55]]],
  [[[-1.95,-.82]]],
  [[[-1.05,.65]]],
  [[[1.65,-2.1],[.02,-2.1],[.02,-.95]]],
  [[[.2,1.75],[.2,-1.25]]],
  [[[-1.25,1.05],[.6,-.25]]],
  [[[-1.5,2.3],[-1.5,0],[.45,0],[.45,-2.35]]],
  [[[-1.22,.68]]],
  [[[-1.35,2.4]],[[-1.35,-.15],[-.95,-.15],[-.95,.15]],[[1.6,2.3],[-2.25,2.3],[-2.25,.9]],[[-2.65,-2.3],[-1.15,-2.3],[-1.25,-.72],[-.75,-.72]]]
];
WAYPOINTS[5]=[[[-1.1,-1.65],[1.1,-1.65]]];
WAYPOINTS[8]=[[[-1.6,.15],{pos:[-.7,.15],until:'bumper'},[-1.7,-1.65]]];
WAYPOINTS[11]=[[[-.75,.15],[-1.4,-.1],[-1.4,-1.6],[-.6,-1.4],{pos:[-.6,-.75],until:'bumper'},[-.6,-2.1]]];
WAYPOINTS[13]=[[[-.9,.8],[-.9,1.95],[2.5,2.3],[2.5,.75],{pos:[1.25,.95],until:'bumper'}],[[2.5,-2.3],[-.85,-2.2],[-.85,-1.65],[-2.4,-2.3]],[[-2.3,-2.55],[1.55,-2.55]],[[0,-2.55]]];
WAYPOINTS[15]=[[{pos:[-1,.75],until:'jump'}]];
WAYPOINTS[18]=[[{pos:[-1.2,1.25],until:'jump'},{pos:[-.1,-.5],until:'jump'}]];
WAYPOINTS[20]=[[{pos:[-1.25,1.35],until:'jump'},{pos:[-1.75,.15],until:'bumper'}]];
WAYPOINTS[21]=[[[-1.55,2.9]],[[-1.05,1]],[[1.2,.4],[.85,.35],[-1,-1.05]],[{pos:[-1.85,-1.8],until:'jump'}]];
export function play(index,{fps=120,gravity=true,maxSeconds=100,paths=WAYPOINTS[index],speed=1.5}={}) {
  const engine=new GameEngine(LEVELS,{strongGravity:gravity});engine.reset(index);engine.start();
  let seq=0,point=0;const trace=[],events=[],surfaces=new Set();let collisions=0,jumps=0,bumperHits=0,highest=0;
  for(let frame=0;frame<maxSeconds*fps&&!engine.state.solved;frame++){
    const s=engine.state,c=s.cube;
    if(seq!==s.seq){seq=s.seq;point=0;}
    const path=paths?.[seq]??[];
    const waypoint=path[point];
    let dest=point<path.length?(Array.isArray(waypoint)?{pos:waypoint}:waypoint):engine.target;
    let dx=dest.pos[0]-c.x,dz=dest.pos[1]-c.z,d=Math.hypot(dx,dz);
    const jumpHere=engine.room.jumpPads.some(p=>Math.hypot(p.x-dest.pos[0],p.z-dest.pos[1])<.06);
    if(point<path.length&&(dest.until?s.events.some(e=>e.type===dest.until&&Math.hypot(e.x-dest.pos[0],e.z-dest.pos[1])<.1):d<(jumpHere?.42:.18))){point++;dest=point<path.length?(Array.isArray(path[point])?{pos:path[point]}:path[point]):engine.target;dx=dest.pos[0]-c.x;dz=dest.pos[1]-c.z;d=Math.hypot(dx,dz);}
    const v=Math.min(speed,d*2.5),den=Math.max(d,1e-8),g=gravity?5.7:3.9;
    const friction={wood:.92,carpet:1.28,brake:3.4,ice:.13,boost:.92,air:.08}[s.surface]??.92;
    let ax=(dx/den*v-c.vx)*5.5+friction*c.vx,az=(dz/den*v-c.vz)*5.5+friction*c.vz;
    const zone=engine.room.zones.find(z=>z.type===3&&Math.hypot(c.x-z.x,c.z-z.z)<z.r&&c.grounded&&c.y<.12);
    if(zone){const len=Math.hypot(zone.dx??1,zone.dz??0)||1;ax-=(zone.dx??1)/len*4.4;az-=(zone.dz??0)/len*4.4;}
    engine.advance(1/fps,unit2(clamp(ax/(g*(c.grounded?1:.38)),-1,1),clamp(az/(g*(c.grounded?1:.38)),-1,1)));
    surfaces.add(s.surface);highest=Math.max(highest,c.y);
    for(const event of s.events){events.push({...event,at:s.time});if(event.type==='impact')collisions++;if(event.type==='jump')jumps++;if(event.type==='bumper')bumperHits++;}
    if(frame%Math.max(1,Math.round(fps/12))===0)trace.push({t:s.time,x:c.x,y:c.y,z:c.z,seq:s.seq});
    if(![c.x,c.y,c.z,c.vx,c.vy,c.vz].every(Number.isFinite))throw Error(`Non-finite room ${index+1}`);
  }
  return {room:index+1,name:engine.room.name,solved:engine.state.solved,seconds:engine.state.elapsed,seq:engine.state.seq,point,position:{x:engine.state.cube.x,y:engine.state.cube.y,z:engine.state.cube.z},collisions,jumps,bumperHits,highest,surfaces:[...surfaces],trace,events};
}
if(process.argv[1]?.endsWith('playthrough.mjs')){
  const results=LEVELS.map((_,i)=>play(i));
  console.table(results.map(({trace,events,...x})=>x));
  if(process.argv[2]){const fs=await import('node:fs');fs.writeFileSync(process.argv[2],JSON.stringify(results,null,2));}
}
