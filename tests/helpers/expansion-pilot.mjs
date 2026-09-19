// Test-only reference driver. Never imported by the application.
// Only reset/start/advance/pause touch the engine. Recorded bounded inputs can be replayed independently.
import {GameEngine} from '../../src/physics.js';
import {CAMPAIGN_LEVELS} from '../../src/campaign.js';
import {movingAt} from '../../src/geometry.js';
import {unit2,clamp} from '../../src/math.js';
import {itinerary} from './expansion-routes.mjs';

export function playExpansion(id,{fps=60,strongGravity=true,delay=0,speed=1.35,variant='main',maxSeconds=180,trace=false,keyboard=false,pauseAt=null}={}){
  if(!Number.isInteger(id)||id<23||id>42)throw new RangeError('Expansion room must be 23–42');
  const engine=new GameEngine(CAMPAIGN_LEVELS,{strongGravity});engine.reset(id-1);engine.start();
  const frames=[],path=[],events=[],actions=[],supports=new Set(),surfaces=new Set();let requestedSeq=0,lastTrace=-1,action='spawn',keyInput={x:0,z:0},nextKey=0,pauseProbed=false;
  const dt=1/fps,g=strongGravity?5.7:3.9;
  const state=()=>structuredClone(engine.state);
  const platform=(i,t=engine.state.time)=>movingAt(engine.room.platforms[i],t);
  const target=()=>structuredClone(engine.target);
  function tick(input){
    if(engine.state.solved)return;
    if(engine.state.time>maxSeconds)throw Error(`route time limit at ${action}`);
    if(pauseAt!==null&&!pauseProbed&&engine.state.time>=pauseAt){
      engine.pause();const before=JSON.stringify(engine.state);engine.advance(5,input);
      if(JSON.stringify(engine.state)!==before)throw Error('Pause changed simulation');
      engine.start();pauseProbed=true;
    }
    let v=unit2(clamp(input.x,-1,1),clamp(input.z,-1,1));
    if(![v.x,v.z].every(Number.isFinite))throw Error('Nonfinite input');
    if(keyboard){
      if(engine.state.time>=nextKey){keyInput=unit2(Math.abs(v.x)>.14?Math.sign(v.x):0,Math.abs(v.z)>.14?Math.sign(v.z):0);nextKey=engine.state.time+.10;}
      v=keyInput;
    }
    frames.push([v.x,v.z]);engine.advance(dt,v);
    for(const e of engine.state.events)events.push({...e,time:engine.state.time,seq:engine.state.seq});
    const c=engine.state.cube;supports.add(c.support);surfaces.add(engine.state.surface);
    if(![c.x,c.y,c.z,c.vx,c.vy,c.vz,...c.q].every(Number.isFinite))throw Error('Nonfinite simulation');
    if(trace&&engine.state.time-lastTrace>=.1){path.push({t:engine.state.time,x:c.x,y:c.y,z:c.z,seq:engine.state.seq,support:c.support,surface:engine.state.surface});lastTrace=engine.state.time;}
  }
  function steer(x,z,{maxSpeed=speed,vx=0,vz=0}={}){
    const s=engine.state,c=s.cube,dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz),v=Math.min(maxSpeed,d*3);
    const carry=c.grounded&&c.support>=0?platform(c.support):{vx:0,vz:0};
    const desired={x:(d>1e-8?dx/d*v:0)+vx-carry.vx,z:(d>1e-8?dz/d*v:0)+vz-carry.vz};
    const f=c.grounded?({ice:.13,brake:3.4,carpet:1.28}[s.surface]??.92):.08;
    let ax=(desired.x-c.vx)*4+f*c.vx,az=(desired.z-c.vz)*4+f*c.vz;
    if(c.grounded&&c.y<.12)for(const b of engine.room.zones)if(b.type===3&&Math.hypot(c.x-b.x,c.z-b.z)<=b.r){const d=Math.hypot(b.dx,b.dz);ax-=b.dx/d*4.4;az-=b.dz/d*4.4;}
    return unit2(ax/(g*(c.grounded?1:.38)),az/(g*(c.grounded?1:.38)));
  }
  function run(label,condition,control,timeout=25){
    action=label;actions.push({name:label,t:engine.state.time});const start=engine.state.time;
    while(!engine.state.solved&&!condition()){
      if(engine.state.time-start>timeout)throw Error(`${label} timed out`);
      tick(control());
    }
  }
  function go(x,z,{y=null,radius=.13,stop=true,maxSpeed=speed,timeout=25}={}){
    run(`go ${x},${z}${y===null?'':` @${y}`}`,()=>{
      const c=engine.state.cube;return Math.hypot(c.x-x,c.z-z)<radius&&(!stop||Math.hypot(c.vx,c.vz)<.3)&&(y===null||Math.abs(c.y-y)<.025&&c.grounded);
    },()=>steer(x,z,{maxSpeed}),timeout);
  }
  function hold(seconds){const start=engine.state.time,c=engine.state.cube,x=c.x,z=c.z;run(`hold ${seconds}`,()=>engine.state.time-start>=seconds,()=>steer(x,z),seconds+2);}
  function wait(condition,timeout=25){const c=engine.state.cube,x=c.x,z=c.z;run('wait phase',()=>condition(state(),platform),()=>steer(x,z),timeout);}
  function goal(){const seq=requestedSeq++;let settling=false;if(engine.state.seq>seq||engine.state.solved)return;run(`goal ${seq+1}`,()=>engine.state.seq!==seq,()=>{
    const t=target(),p=t.platform!==undefined?platform(t.platform):{vx:0,vz:0},c=engine.state.cube;
    // Like releasing the controls over the ring: avoid a quantized keyboard limit cycle.
    const distance=Math.hypot(c.x-t.pos[0],c.z-t.pos[1]);
    if(t.type===3&&distance<.2&&Math.hypot(c.vx,c.vz)<(engine.state.surface==='brake'?.45:.18))settling=true;
    if(settling&&distance<.39)return {x:0,z:0};
    settling=false;
    return steer(...t.pos,{vx:p.vx,vz:p.vz});
  });}
  function board(i){run(`board ${i}`,()=>{const c=engine.state.cube,p=platform(i);return c.support===i&&Math.hypot(c.x-p.x,c.z-p.z)<.23;},()=>{const p=platform(i);return steer(p.x,p.z,{vx:p.vx,vz:p.vz,maxSpeed:1.25});},18);}
  function ride(i,condition){run(`ride ${i}`,()=>condition(platform(i),state()),()=>{const p=platform(i);return steer(p.x,p.z,{vx:p.vx,vz:p.vz});},25);}
  function jump(i,pIndex,{stage=null,timeout=8}={}){
    const pad=engine.room.jumpPads[i],p=platform(pIndex),d=Math.hypot(p.x-pad.x,p.z-pad.z),ux=(p.x-pad.x)/d,uz=(p.z-pad.z)/d;
    const from=stage??[pad.x-ux*.85,pad.z-uz*.85];go(...from,{y:0,maxSpeed:1.05});
    run(`takeoff ${i}`,()=>!engine.state.cube.grounded,()=>steer(pad.x+ux*.4,pad.z+uz*.4,{maxSpeed:1.1}),timeout);
    run(`flight ${i} to ${pIndex}`,()=>engine.state.cube.grounded,()=>{
      const c=engine.state.cube,h=engine.room.platforms[pIndex].h;
      const discriminant=c.vy*c.vy+2*6.8*(c.y-h);
      const left=discriminant>0?Math.max(.10,(c.vy+Math.sqrt(discriminant))/6.8):.65;
      const landing=platform(pIndex,engine.state.time+left);
      const ax=((landing.x-c.x)/left-c.vx)*2.8+.08*c.vx;
      const az=((landing.z-c.z)/left-c.vz)*2.8+.08*c.vz;
      return unit2(ax/(g*.38),az/(g*.38));
    },3);
    if(Math.abs(engine.state.cube.y-engine.room.platforms[pIndex].h)>.03)throw Error(`missed landing ${pIndex}`);
  }
  let failure=null;
  try{if(delay)hold(delay);itinerary(id,{go,hold,wait,goal,board,ride,jump,state,platform,target,room:engine.room,variant});if(!engine.state.solved)throw Error('itinerary ended before victory');}
  catch(error){failure=error.message;}
  return {id,fps,strongGravity,delay,speed,variant,keyboard,pauseProbed,solved:engine.state.solved,seconds:engine.state.time,seq:engine.state.seq,final:structuredClone(engine.state.cube),failure,actions,events,supports:[...supports],surfaces:[...surfaces],frames,path};
}
export function replay(result){
  const e=new GameEngine(CAMPAIGN_LEVELS,{strongGravity:result.strongGravity});e.reset(result.id-1);e.start();
  for(const [x,z] of result.frames)e.advance(1/result.fps,{x,z});
  return {solved:e.state.solved,seq:e.state.seq,seconds:e.state.time,cube:structuredClone(e.state.cube)};
}
