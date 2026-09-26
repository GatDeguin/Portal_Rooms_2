// Original composition: "Resonancias de la sala". One eight-bar phrase,
// four melodic turns, eight orchestrations; the audio clock owns the tempo.
export const THEMES=Object.freeze([
  {name:'Materia',root:50,bpm:72}, {name:'Cristal',root:53,bpm:78},
  {name:'Suspensión',root:57,bpm:74}, {name:'Órbita',root:48,bpm:80},
  {name:'Inercia',root:52,bpm:76}, {name:'Mecanismo',root:55,bpm:84},
  {name:'Umbral',root:50,bpm:78}, {name:'Convergencia',root:57,bpm:82}
].map(Object.freeze));
const HARMONY=[[0,7,14,17],[3,10,14,19],[5,12,16,19],[0,7,12,17],[8,12,15,19],[5,12,14,19],[7,14,17,21],[0,7,14,19]];
const MOTIFS=[[2,1,3,2],[3,2,0,1],[1,2,3,1],[2,0,1,3]];
export const midiHz=midi=>440*2**((midi-69)/12);
export function scoreStep(chapter,step,{playing=false,intensity=0}={}){
  const theme=THEMES[chapter]??THEMES[0],beat=60/theme.bpm,chord=HARMONY[Math.floor(step/16)%8];
  const phrase=Math.floor(step/128)%4,motif=MOTIFS[(phrase+chapter)%4],slot=step%16,notes=[];
  const add=(instrument,midi,duration,gain,pan=0)=>notes.push({instrument,midi,duration,gain,pan});
  if(slot===0){
    chord.forEach((n,i)=>add('pad',theme.root+n,beat*8.8,.042,(i-1.5)*.3));
    add('bass',theme.root+chord[0]-12,beat*7.7,playing?.095:.065);
  }
  // Deliberate rests keep the tactile sounds in the foreground.
  if(playing?[0,5,10,14].includes(slot):[0,10].includes(slot)&&Math.floor(step/16)%2===0){
    const index=[0,5,10,14].indexOf(slot),degree=chord[motif[Math.max(0,index)]];
    add('key',theme.root+degree+(chapter%3===2?0:12),beat*(slot===14?1.2:2.8),playing?.075:.047,Math.sin(step*.7)*.42);
  }
  if(playing&&intensity>.18&&slot%4===(chapter%2?2:0))add('pulse',theme.root+chord[0],beat*.55,.035*Math.min(intensity,1),slot%8?.2:-.2);
  if(playing&&chapter>=4&&slot===12&&phrase%2===1)add('bell',theme.root+chord[2]+12,beat*2.5,.035,-.35);
  return notes;
}
