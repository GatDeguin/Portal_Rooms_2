import {clamp,finite} from './math.js';
export const TIERS=Object.freeze({
  low:{pixels:360000,dpr:1,steps:88,shadows:16,ao:3,reflections:12,fog:3,octaves:3,detail:0,gi:0,reflectionSamples:1,portalLayers:2},
  medium:{pixels:760000,dpr:1.4,steps:112,shadows:28,ao:4,reflections:24,fog:5,octaves:4,detail:1,gi:0,reflectionSamples:1,portalLayers:3},
  high:{pixels:1500000,dpr:1.8,steps:136,shadows:44,ao:6,reflections:36,fog:8,octaves:6,detail:2,gi:0,reflectionSamples:1,portalLayers:4},
  cinematic:{pixels:2200000,dpr:2,steps:176,shadows:64,ao:8,reflections:56,fog:12,octaves:7,detail:3,gi:3,reflectionSamples:2,portalLayers:6}
});
export function drawingSize(width,height,dpr=1,tier='medium',scale=1){
  const q=TIERS[tier]??TIERS.medium,w=Math.max(2,finite(width,2)),h=Math.max(2,finite(height,2));
  const density=Math.min(q.dpr,Math.max(.5,finite(dpr,1)));
  // Scale the capped target, not DPR before the cap. Otherwise large displays
  // remain pinned at the same pixel count even after an emergency downgrade.
  const ratio=Math.min(density,Math.sqrt(q.pixels/(w*h)))*clamp(finite(scale,1),.5,1);
  let rw=Math.max(2,Math.floor(w*ratio)),rh=Math.max(2,Math.floor(h*ratio));
  if(rw*rh>q.pixels){if(rw>rh)rw=Math.floor(q.pixels/rh);else rh=Math.floor(q.pixels/rw);}
  return {width:rw,height:rh};
}
// Milliseconds of observed rendering work. Separate emergency thresholds bypass windows.
export const QUALITY_PRESSURE=Object.freeze({headroom:18.5,sustained:28,verySlow:200,catastrophic:1000,windowMs:2000,maxWindowFrames:120,minFrames:10,recoveryWindows:3});
export class AdaptiveQuality {
  constructor(mode='auto'){this.setMode(mode);}
  setMode(mode){this.mode=['auto','low','medium','high','cinematic'].includes(mode)?mode:'auto';this.tier=this.mode==='auto'?'low':this.mode;this.scale=1;this.resetSamples();}
  resetSamples(){this.total=0;this.frames=0;this.slowWindows=0;this.fastWindows=0;this.average=16.7;}
  emergency(ms){
    if(this.mode!=='auto'||!Number.isFinite(ms)||ms<QUALITY_PRESSURE.verySlow)return false;
    const q=QUALITY_PRESSURE,old=`${this.tier}:${this.scale}`;
    this.resetSamples();this.average=ms;
    if(ms>=q.catastrophic){this.tier='low';this.scale=.5;}
    else if(this.tier!=='low'){this.tier=this.tier==='high'?'medium':'low';this.scale=Math.min(this.scale,.75);}
    else this.scale=Math.max(.5,this.scale-.2);
    return old!==`${this.tier}:${this.scale}`;
  }
  sample(ms,active=true){
    if(!active||!Number.isFinite(ms)||ms<=0)return false;
    const old=`${this.tier}:${this.scale}`,q=QUALITY_PRESSURE;
    if(this.mode==='auto'&&ms>=q.verySlow)return this.emergency(ms);
    this.total+=ms;this.frames++;
    if((this.total<q.windowMs&&this.frames<q.maxWindowFrames)||this.frames<q.minFrames)return false;
    this.average=this.total/this.frames;this.total=0;this.frames=0;
    this.slowWindows=this.average>q.sustained?this.slowWindows+1:0;
    this.fastWindows=this.average<q.headroom?this.fastWindows+1:0;
    if(this.mode==='auto'){
      if(this.slowWindows>=1){
        if(this.scale>.6)this.scale=Math.max(.5,this.scale-.12);
        else if(this.tier!=='low'){this.tier=this.tier==='high'?'medium':'low';this.scale=.85;}
        this.slowWindows=0;
      }else if(this.fastWindows>=q.recoveryWindows){
        if(this.scale<1)this.scale=Math.min(1,this.scale+.08);
        else if(this.tier!=='high'){this.tier=this.tier==='low'?'medium':'high';this.scale=1;}
        this.fastWindows=0;
      }
    }
    return old!==`${this.tier}:${this.scale}`;
  }
}
