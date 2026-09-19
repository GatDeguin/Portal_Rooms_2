import {LEVELS} from './levels.js';
import {EXPANSION_LEVELS} from './levels-expansion.js';

export const ORIGINAL_COUNT=LEVELS.length;
export const CAMPAIGN_LEVELS=Object.freeze([...LEVELS,...EXPANSION_LEVELS]);
export const CHAPTERS=Object.freeze([
  {id:1,roman:'I',name:'Fundamentos',first:1,last:6,look:0},
  {id:2,roman:'II',name:'Superficies y ritmo',first:7,last:14,look:1},
  {id:3,roman:'III',name:'Primeras alturas',first:15,last:19,look:2},
  {id:4,roman:'IV',name:'Circuito vertical',first:20,last:22,look:3},
  {id:5,roman:'V',name:'Inercia consciente',first:23,last:27,look:0},
  {id:6,roman:'VI',name:'Ritmos de la sala',first:28,last:32,look:1},
  {id:7,roman:'VII',name:'Transferencias',first:33,last:37,look:2},
  {id:8,roman:'VIII',name:'Convergencia',first:38,last:42,look:3}
].map(Object.freeze));
export const chapterForRoom=id=>CHAPTERS.find(c=>id>=c.first&&id<=c.last)??CHAPTERS[0];
export const lookForRoom=id=>chapterForRoom(id).look;
export function originalComplete(progress){
  const done=new Set(progress?.completed??[]);
  return LEVELS.every((_,i)=>done.has(i));
}
/** Read-only offer: loading a save never rewrites the player's selected room. */
export function offerExpansion(progress){
  return CAMPAIGN_LEVELS.length>ORIGINAL_COUNT&&originalComplete(progress)&&
    !(progress.completed??[]).some(i=>i>=ORIGINAL_COUNT)&&
    !(progress.attempts??[]).slice(ORIGINAL_COUNT).some(n=>n>0);
}
