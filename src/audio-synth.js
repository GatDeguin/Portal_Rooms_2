import {clamp} from './math.js';
import {midiHz} from './audio-score.js';

export function glide(param,value,time,seconds=.035){
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(time);
  else{const current=param.value;param.cancelScheduledValues(time);param.setValueAtTime(current,time);}
  param.linearRampToValueAtTime(value,time+seconds);
}
function random(seed=719){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function noiseBuffer(ctx,seconds=2,seed=19){
  const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),a=b.getChannelData(0),rand=random(seed);let brown=0;
  for(let i=0;i<a.length;i++){brown=brown*.985+.07*(rand()*2-1);a[i]=(rand()*2-1)*.55+brown*.25;}
  // A short equal-power seam avoids a periodic click when a texture loops.
  const seam=Math.min(1024,a.length/4|0);for(let i=0;i<seam;i++){const t=i/seam;a[i]=a[a.length-seam+i]*(1-t)+a[i]*t;}
  return b;
}
export function roomImpulse(ctx){
  const b=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*1.65),ctx.sampleRate);
  for(let channel=0;channel<2;channel++){
    const a=b.getChannelData(channel),rand=random(163+channel*73);let low=0;
    for(let i=0;i<a.length;i++){const t=i/ctx.sampleRate;low=low*.62+(rand()*2-1)*.38;a[i]=t<.018?0:low*Math.exp(-t*5.2)*.19;}
    for(const [time,level] of [[.023,.28],[.041,.2],[.067,.13],[.109,.08]])a[Math.round((time+channel*.003)*ctx.sampleRate)]+=level;
  }
  return b;
}
const MATERIALS={
  wood:{hz:185,ratio:2.72,decay:.23,brightness:2600,grain:.055},
  carpet:{hz:108,ratio:1.83,decay:.11,brightness:650,grain:.026},
  ice:{hz:820,ratio:2.13,decay:.45,brightness:6500,grain:.022},
  platform:{hz:340,ratio:2.38,decay:.48,brightness:4400,grain:.04},
  ramp:{hz:240,ratio:2.64,decay:.27,brightness:2300,grain:.047},
  brake:{hz:98,ratio:1.45,decay:.17,brightness:850,grain:.06},
  boost:{hz:290,ratio:1.5,decay:.25,brightness:3300,grain:.035}
};
export const materialSound=kind=>MATERIALS[kind]??MATERIALS.wood;

/** A voice owns every node it allocates, including its reverb send. */
export class SoundRack{
  constructor(context,buses,reverb){this.ctx=context;this.buses=buses;this.reverb=reverb;this.voices=new Set();this.noise=noiseBuffer(context);this.serial=0;}
  voice({group='effects',time=this.ctx.currentTime,duration=.3,gain=.1,attack=.004,pan=0,wet=.16,sustain=false,cutoff=12000}={}){
    if(this.voices.size>=56){
      // Never steal another cue for a decorative layer; critical cues get priority.
      if(group==='music'||group==='ambience')return null;
      const victim=[...this.voices].find(v=>v.group==='music')??[...this.voices].find(v=>!v.sustained);if(!victim)return null;victim.dispose();
    }
    const ctx=this.ctx,amp=ctx.createGain(),filter=ctx.createBiquadFilter(),panner=ctx.createStereoPanner(),send=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=Math.min(cutoff,ctx.sampleRate*.45);filter.Q.value=.5;
    panner.pan.value=clamp(pan,-.85,.85);send.gain.value=wet;
    amp.connect(filter).connect(panner).connect(this.buses[group]??this.buses.effects);panner.connect(send).connect(this.reverb[group]??this.reverb.effects);
    amp.gain.setValueAtTime(0,time);amp.gain.linearRampToValueAtTime(gain,time+attack);
    if(!sustain){amp.gain.setValueAtTime(Math.max(.00001,gain),time+attack);amp.gain.exponentialRampToValueAtTime(.00001,time+Math.max(duration,attack+.01));}
    const nodes=[amp,filter,panner,send],sources=[],voice={group,amp,filter,panner,sources,start:time,end:sustain?Infinity:time+duration+.03,disposed:false,sustained:sustain,
      dispose:()=>{if(voice.disposed)return;voice.disposed=true;for(const source of sources){try{source.stop();}catch{}}for(const node of nodes)node.disconnect();this.voices.delete(voice);},
      stop:(at=ctx.currentTime,fade=.06)=>{if(voice.disposed)return;glide(amp.gain,0,at,fade);voice.end=at+fade+.02;for(const source of sources){try{source.stop(voice.end);}catch{}}},
      oscillator:(hz,type='sine',level=1,endHz=null,detune=0)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,time);o.detune.value=detune;g.gain.value=level;
        if(endHz)o.frequency.exponentialRampToValueAtTime(endHz,time+duration);o.connect(g).connect(amp);nodes.push(o,g);sources.push(o);o.start(time);if(!sustain)o.stop(voice.end);return o;
      },
      noise:()=>{const source=ctx.createBufferSource();source.buffer=this.noise;source.loop=true;source.connect(amp);nodes.push(source);sources.push(source);source.start(time,(this.serial++*.317)%1.4);if(!sustain)source.stop(voice.end);return source;}
    };
    // All sources have the same end. Cleanup once; other onended callbacks are safe.
    voice.own=()=>{for(const source of sources)source.onended=()=>voice.dispose();return voice;};
    this.voices.add(voice);return voice;
  }
  note({instrument='key',midi=62,duration=1,gain=.06,pan=0,time=this.ctx.currentTime,group='music'}={}){
    const pad=instrument==='pad',bass=instrument==='bass',hz=midiHz(midi);
    const v=this.voice({group,time,duration,gain,pan,wet:pad?.46:bass?.06:.3,attack:pad?.75:bass?.08:.009,sustain:pad,cutoff:pad?1900:bass?480:6500});if(!v)return;
    if(pad){v.oscillator(hz,'sine',.52,null,-5);v.oscillator(hz,'sine',.52,null,5);v.oscillator(hz*2,'sine',.1);v.amp.gain.setValueAtTime(gain,time+duration*.62);v.stop(time+duration*.62,duration*.38);}
    else if(bass){v.oscillator(hz,'sine',.85);v.oscillator(hz*2,'sine',.15);}
    else if(instrument==='pulse'){v.oscillator(hz,'sine',.7,hz*.995);v.oscillator(hz*2,'sine',.2);}
    else{v.oscillator(hz,'sine',.76);v.oscillator(hz*(instrument==='bell'?2.756:2.002),'sine',.17);v.oscillator(hz*4.01,'sine',.055);}
    return v.own();
  }
  texture({group='foley',gain=0,pan=0,hz=800,wet=.07}={}){
    const v=this.voice({group,gain,pan,wet,sustain:true,attack:.05,cutoff:hz});if(!v)return;
    v.noise();return v.own();
  }
  impact(material,power=.5,pan=0,time=this.ctx.currentTime,scale=1,group='effects'){
    const m=materialSound(material),variation=1+Math.sin(++this.serial*2.399)*.065,p=clamp(power,0,1);
    const v=this.voice({group,time,gain:(.09+p*.22)*scale,duration:m.decay*(.8+p*.55),pan,cutoff:m.brightness,wet:material==='carpet'?.045:.18});if(!v)return;
    v.oscillator(m.hz*variation,'sine',.72,m.hz*.84*variation);v.oscillator(m.hz*m.ratio*variation,'sine',.2);v.own();
    const tap=this.voice({group,time,gain:m.grain*(.4+p)*scale,duration:.035+p*.025,pan,wet:.035,cutoff:m.brightness});tap?.noise();tap?.own();
    return v;
  }
  sweep({time=this.ctx.currentTime,from=220,to=660,duration=.45,gain=.1,pan=0,group='effects',noise=false}={}){
    const v=this.voice({group,time,gain,duration,pan,attack:.014,wet:.26,cutoff:noise?2400:5800});if(!v)return;
    if(noise){v.noise();v.filter.frequency.setValueAtTime(from,time);v.filter.frequency.exponentialRampToValueAtTime(to,time+duration);}
    else{v.oscillator(from,'sine',.7,to);v.oscillator(from*1.5,'sine',.16,to*1.5);}
    return v.own();
  }
  stopGroup(group,fade=.08){for(const voice of this.voices)if(voice.group===group)voice.stop(this.ctx.currentTime,fade);}
  clear(){for(const voice of [...this.voices])voice.dispose();}
}
