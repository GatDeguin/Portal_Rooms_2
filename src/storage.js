import {clamp,finite} from './math.js';
const ROOT='roomTiltGame.';
export const DEFAULT_SETTINGS=Object.freeze({strongGravity:true,dynamicCamera:true,effects:true,sound:true,haptic:true,smoothing:.09,deadZone:.055,sensitivity:1,invertX:false,invertZ:false,quality:'auto',compactHUD:true});
export function normalizeSettings(value={},reducedMotion=false) {
  const out={...DEFAULT_SETTINGS,dynamicCamera:!reducedMotion,effects:!reducedMotion};
  if(!value||typeof value!=='object')return out;
  for(const key of ['strongGravity','dynamicCamera','effects','sound','haptic','invertX','invertZ','compactHUD'])if(typeof value[key]==='boolean')out[key]=value[key];
  for(const [key,min,max] of [['smoothing',0,.3],['deadZone',0,.25],['sensitivity',.4,2.5]]){
    if(typeof value[key]==='number'&&Number.isFinite(value[key]))out[key]=clamp(value[key],min,max);
  }
  if(['auto','low','medium','high','cinematic'].includes(value.quality))out.quality=value.quality;
  return out;
}
export function normalizeProgress(value,count=22) {
  const fresh={version:2,current:0,unlocked:1,completed:[],bestTimes:Array(count).fill(null),attempts:Array(count).fill(0),restarts:Array(count).fill(0)};
  if(!value||typeof value!=='object'||value.version!==2)return fresh;
  const completed=Array.isArray(value.completed)?[...new Set(value.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<count))].sort((a,b)=>a-b):[];
  // Never trust an invalid index; previously earned unlocks are monotonic.
  const earned=completed.length?Math.max(...completed)+2:1;
  fresh.unlocked=clamp(Math.max(Math.trunc(finite(value.unlocked,1)),earned),1,count);
  fresh.current=clamp(Math.trunc(finite(value.current)),0,fresh.unlocked-1);fresh.completed=completed;
  for(let i=0;i<count;i++){
    const best=value.bestTimes?.[i];
    if(typeof best==='number'&&Number.isFinite(best)&&best>0&&best<86400&&completed.includes(i))fresh.bestTimes[i]=best;
    for(const key of ['attempts','restarts'])fresh[key][i]=clamp(Math.trunc(finite(value[key]?.[i])),0,999999);
  }
  return fresh;
}
/** All browser storage operations are guarded, including adapters whose getters throw. */
export class SaveStore {
  constructor(adapter=null,count=22,reducedMotion=false,onError=()=>{}) {
    this.adapter=adapter;this.count=count;this.memory=new Map();this.failed=false;this.onError=onError;this.reducedMotion=reducedMotion;
    const raw=this.read('progress.v2');
    let value=this.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==2){
      const legacy=clamp(Math.trunc(finite(this.read('level'))),0,count-1);
      value={version:2,current:legacy,unlocked:legacy+1,completed:Array.from({length:legacy},(_,i)=>i)};
    }
    this.progress=normalizeProgress(value,count);
    const old={};
    for(const key of ['strongGravity','dynamicCamera','sound','haptic']){const v=this.read(key);if(v==='0'||v==='1')old[key]=v==='1';}
    this.settings=normalizeSettings({...old,...this.parse(this.read('settings.v2'))},reducedMotion);
  }
  parse(text){try{return JSON.parse(text);}catch{return null;}}
  problem(){if(!this.failed){this.failed=true;this.onError();}}
  read(key){
    if(this.memory.has(key))return this.memory.get(key);
    try{return this.adapter?.getItem(ROOT+key)??null;}catch{this.problem();return null;}
  }
  write(key,value){
    this.memory.set(key,value);
    try{if(this.adapter)this.adapter.setItem(ROOT+key,value);}catch{this.problem();}
  }
  persist(){this.write('progress.v2',JSON.stringify(this.progress));this.write('level',String(this.progress.current));}
  select(index){
    if(!Number.isInteger(index)||index<0||index>=this.progress.unlocked)return false;
    this.progress.current=index;this.persist();return true;
  }
  startAttempt(index,restart=false){
    if(!this.select(index))return false;
    this.progress.attempts[index]++;if(restart)this.progress.restarts[index]++;this.persist();return true;
  }
  complete(index,seconds){
    if(!Number.isInteger(index)||index<0||index>=this.progress.unlocked||!Number.isFinite(seconds)||seconds<=0||seconds>=86400)return {record:false};
    const p=this.progress,old=p.bestTimes[index],record=old===null||seconds<old;
    if(!p.completed.includes(index)){p.completed.push(index);p.completed.sort((a,b)=>a-b);}
    p.unlocked=Math.min(this.count,Math.max(p.unlocked,index+2));
    if(record)p.bestTimes[index]=seconds;
    this.persist();return {record,previous:old};
  }
  setSettings(patch){this.settings=normalizeSettings({...this.settings,...patch},this.reducedMotion);this.write('settings.v2',JSON.stringify(this.settings));return this.settings;}
  resetProgress(){this.progress=normalizeProgress(null,this.count);this.persist();}
}
