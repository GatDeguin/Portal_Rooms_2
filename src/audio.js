import {clamp} from './math.js';
import {chapterForRoom} from './campaign.js';
import {movingAt,surfaceAt} from './geometry.js';
import {SoundRack,glide,roomImpulse,materialSound} from './audio-synth.js';
import {THEMES,scoreStep,midiHz} from './audio-score.js';

const levelGain=value=>clamp(Number.isFinite(value)?value:0,0,1);
const AUDIO_KEYS=['volume','musicVolume','ambienceVolume','effectsVolume'];
export {AUDIO_KEYS};
export function readAudioFrame(engine){
  const s=engine.state,c=s.cube,t=engine.target,grabbed=engine.handGrab!=null;
  const speed=Math.hypot(c.vx,c.vz),distance=Math.hypot(c.x-t.pos[0],c.z-t.pos[1],c.y-(t.y??0));
  let machine=0;
  for(const object of [...(engine.room.obstacles??[]),...(engine.room.platforms??[])]){
    if(!object.move)continue;const p=movingAt(object,s.time),d=Math.hypot(c.x-p.x,c.z-p.z);
    machine=Math.max(machine,Math.min(1,Math.hypot(p.vx,p.vz))*(1-clamp(d/6,0,1)));
  }
  const surface=s.surface==='air'&&c.grounded?surfaceAt(engine.room,c.x,c.z,s.time,c.y+.09).kind:s.surface;
  return {level:s.level,surface,speed,x:c.x,z:c.z,contact:c.grounded&&!grabbed?1:0,grabbed,
    charge:t.type===3?clamp(c.hold/.55,0,1):0,portal:t.type===4?1-clamp(distance/4.5,0,1):0,
    progress:s.seq/(engine.room.sequence?.length??1),machine,pan:clamp(c.x/4.2,-.72,.72)};
}

/** Shared dry/wet buses keep settings effective for both effects and their tails. */
export function createAudioGraph(ctx){
  const mix=ctx.createGain(),master=ctx.createGain(),highpass=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor(),ceiling=ctx.createWaveShaper(),output=ctx.createGain();
  highpass.type='highpass';highpass.frequency.value=32;highpass.Q.value=.5;
  compressor.threshold.value=-17;compressor.knee.value=14;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.22;
  const curve=new Float32Array(4096);
  for(let i=0;i<curve.length;i++){const x=2*i/(curve.length-1)-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.65?a:.65+.3*(1-Math.exp(-(a-.65)/.3)));}
  ceiling.curve=curve;ceiling.oversample='2x';output.channelCountMode='explicit';output.channelCount=2;
  mix.connect(highpass).connect(compressor).connect(ceiling).connect(output).connect(master).connect(ctx.destination);
  master.gain.value=0;
  const convolver=ctx.createConvolver(),impulse=roomImpulse(ctx),returnGain=ctx.createGain();convolver.buffer=impulse;returnGain.gain.value=.65;convolver.connect(returnGain).connect(mix);
  const buses={},sends={};
  for(const name of ['music','ambience','effects']){buses[name]=ctx.createGain();sends[name]=ctx.createGain();buses[name].connect(mix);sends[name].connect(convolver);}
  buses.foley=buses.effects;buses.ui=buses.effects;buses.preview=buses.effects;sends.foley=sends.effects;sends.ui=sends.effects;sends.preview=sends.effects;
  return {mix,master,compressor,output,buses,sends,convolver,impulse,
    dispose(){for(const node of new Set([mix,master,highpass,compressor,ceiling,output,convolver,returnGain,...Object.values(buses),...Object.values(sends)]))node.disconnect();}};
}

export class AudioFeedback{
  constructor(getSettings){
    this.getSettings=getSettings;this.context=null;this.master=null;this.graph=null;this.rack=null;
    this.phase='menu';this.chapter=0;this.level=-1;this.timer=null;this.wanted=false;this.nextTime=0;this.step=0;
    this.intensity=0;this.duckUntil=0;this.lastEvents=new Map();this.world={};this.previous=null;this.lastRattle=0;this.resumePromise=null;
  }
  get audible(){const s=this.getSettings();return s.sound&&s.volume!==0&&this.context?.state==='running'&&this.wanted;}
  unlock(){
    const settings=this.getSettings();if(!settings.sound||settings.volume===0||globalThis.document?.hidden||globalThis.document?.hasFocus?.()===false)return;
    this.wanted=true;clearTimeout(this.suspendTimer);this.suspendTimer=null;
    try{
      if(!this.context){
        const API=globalThis.AudioContext||globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext;if(!API)return;
        this.context=new API({latencyHint:'interactive'});this.graph=createAudioGraph(this.context);this.master=this.graph.master;
        this.rack=new SoundRack(this.context,this.graph.buses,this.graph.sends);
      }
      this.refresh();
      const ready=()=>{if(!this.wanted){void this.context.suspend().catch(()=>{});return;}this.start();};
      if(this.context.state==='running')ready();
      else if(!this.resumePromise){this.resumePromise=this.context.resume().then(ready).catch(()=>{}).finally(()=>{this.resumePromise=null;});}
    }catch{this.wanted=false;this.stopPlayback();this.graph?.dispose();this.context?.close?.().catch(()=>{});this.context=null;this.graph=null;this.master=null;this.rack=null;}
  }
  start(){
    if(!this.audible||this.timer)return;
    this.nextTime=this.context.currentTime+.06;
    if(!this.world.room)this.world.room=this.rack.texture({group:'ambience',gain:this.phase==='playing'?.024:.015,hz:520,wet:.4});
    this.pump();this.timer=setInterval(()=>this.pump(),80);
  }
  refresh(){
    if(!this.graph)return;
    const s=this.getSettings(),t=this.context.currentTime,master=s.sound?levelGain(s.volume??.65):0;
    glide(this.master.gain,master,t,.045);
    const gains={music:levelGain(s.musicVolume??.48),ambience:levelGain(s.ambienceVolume??.5),effects:levelGain(s.effectsVolume??.85)};
    for(const name of Object.keys(gains)){
      const gain=gains[name]*(name==='music'&&t<this.duckUntil?.48:1);
      glide(this.graph.buses[name].gain,gain,t,.08);glide(this.graph.sends[name].gain,gain,t,.08);
    }
    this.graph.output.channelCount=s.audioMono?1:2;
    glide(this.graph.compressor.threshold,s.audioMix==='night'?-27:-17,t,.1);
    glide(this.graph.compressor.ratio,s.audioMix==='night'?8:3,t,.1);
    glide(this.graph.compressor.attack,s.audioMix==='night'?.001:.006,t,.1);
    // DynamicsCompressor adds makeup gain internally: trim the night preset.
    glide(this.graph.output.gain,s.audioMix==='night'?.4:1,t,.1);
    if(!master){this.suspend();return;}
    if(!gains.music)this.rack.stopGroup('music');
  }
  setScene(phase,engine){
    if(this.phase==='settings'&&phase!=='settings'){this.rack?.stopGroup('preview',.025);this.previewUntil=0;}
    const changed=this.phase!==phase,level=engine?.state.level??this.level,chapter=chapterForRoom(level+1).id-1;
    if(chapter!==this.chapter){this.chapter=chapter;this.step=0;this.nextTime=(this.context?.currentTime??0)+.08;this.rack?.stopGroup('music',.7);}
    if(level!==this.level||changed){this.previous=null;this.lastRattle=0;this.clearWorld();}
    this.level=level;this.phase=phase;
    if(this.world.room)glide(this.world.room.amp.gain,phase==='playing'?.024:.015,this.context.currentTime,.5);
    this.intensity=0;
  }
  clearWorld(){
    this.rack?.stopGroup('foley',.06);
    for(const [name,voice] of Object.entries(this.world))if(name!=='room'){voice?.stop();delete this.world[name];}
  }
  pump(){
    if(!this.audible)return;
    const ctx=this.context,now=ctx.currentTime;
    // No accumulated notes after a stalled tab or a suspended audio clock.
    if(this.nextTime<now-.15)this.nextTime=now+.03;
    if(this.duckUntil&&now>=this.duckUntil){this.duckUntil=0;this.refresh();}
    const playing=this.phase==='playing',theme=THEMES[this.chapter],interval=30/theme.bpm;
    while(this.nextTime<now+.24){
      if((this.getSettings().musicVolume??.48)>0)for(const note of scoreStep(this.chapter,this.step,{playing,intensity:this.intensity}))this.rack.note({...note,time:this.nextTime});
      this.step++;this.nextTime+=interval;
    }
  }
  duck(seconds=.7){this.duckUntil=Math.max(this.duckUntil,this.context.currentTime+seconds);this.refresh();}
  event(event,details={}){
    const type=event.type;
    if(type==='impact'&&event.power>.5)this.vibrate(10);
    else if(type==='complete')this.vibrate([18,28,18]);
    else if(['jump','bumper','goal','grab'].includes(type))this.vibrate(type==='jump'?[12,20,12]:12);
    if(!this.audible)return;
    const t=this.context.currentTime,interval=type==='hover'?.12:type==='impact'?.055:.06;
    if(t-(this.lastEvents.get(type)??-Infinity)<interval)return;this.lastEvents.set(type,t);
    const rack=this.rack,root=THEMES[this.chapter].root,pan=clamp((event.x??details.x??0)/4.2,-.72,.72),power=event.power??.5;
    const note=(offset,delay=0,gain=.1,duration=.8,instrument='bell',group='effects')=>rack.note({midi:root+offset,time:t+delay,gain,duration,instrument,pan,group});
    switch(type){
      case 'impact':rack.impact(details.surface??'wood',power,pan);break;
      case 'jump':rack.sweep({from:140,to:700,duration:.48,gain:.15,pan});rack.sweep({from:900,to:3800,duration:.22,gain:.08,pan,noise:true});break;
      case 'bumper':rack.impact('platform',.8,pan);rack.sweep({from:410,to:170,duration:.35,gain:.16,pan});break;
      case 'goal':{
        const intervals={1:[12,19],2:[14,21],3:[17,24],4:[12,26]}[details.targetType]??[12,19];
        this.duck(.9);note(intervals[0],0,.13);note(intervals[1],.13,.09,1.15);
        if(details.targetType===4)rack.sweep({from:180,to:2300,duration:.75,gain:.12,pan,noise:true});break;}
      case 'complete':
        this.duck(2.3);[0,7,14,19,24].forEach((n,i)=>note(n,.1+i*.13,i===4?.13:.1,1.8,'key'));
        rack.note({midi:root-12,time:t+.1,gain:.12,duration:2.4,instrument:'bass',group:'effects'});break;
      case 'final':this.duck(3);[12,19,24,26,31].forEach((n,i)=>note(n,i*.22,.08,2.7,'bell'));break;
      case 'grab':rack.sweep({from:150,to:320,duration:.16,gain:.075,pan});note(7,.02,.04,.28,'key');break;
      case 'release':rack.sweep({from:300,to:180,duration:.16,gain:.065,pan});break;
      case 'surface':if(details.surface==='ice')note(26,0,.035,.7);else if(details.surface==='boost')rack.sweep({from:160,to:450,duration:.33,gain:.055,pan});else if(details.surface==='brake')rack.sweep({from:620,to:100,duration:.25,gain:.05,pan,noise:true});break;
      case 'enter':rack.sweep({from:500,to:1800,duration:.7,gain:.055,noise:true});note(12,.1,.055,1.5,'key');break;
      case 'pause':note(7,0,.035,.2,'key','ui');note(0,.08,.035,.3,'key','ui');break;
      case 'resume':note(0,0,.035,.2,'key','ui');note(7,.08,.035,.3,'key','ui');break;
      case 'hover':note(24,0,.016,.065,'key','ui');break;
      case 'back':note(7,0,.044,.16,'key','ui');note(0,.05,.03,.18,'key','ui');break;
      case 'ui':case 'toggle':note(19,0,.05,.12,'key','ui');note(24,.035,.025,.18,'key','ui');break;
    }
  }
  update(engine){
    if(!this.audible||this.phase!=='playing')return;
    const f=readAudioFrame(engine),ctx=this.context,t=ctx.currentTime,m=materialSound(f.surface),previous=this.previous;
    this.intensity+=(clamp(f.speed/4+f.progress*.28,0,1)-this.intensity)*.08;
    if(previous&&previous.grabbed!==f.grabbed)this.event({type:f.grabbed?'grab':'release',x:f.x});
    if(previous&&previous.surface!==f.surface&&f.contact)this.event({type:'surface',x:f.x},{surface:f.surface});
    const speed=clamp(f.speed/4,0,1),contact=f.contact&&speed>.015;
    if(contact&&!this.world.rolling)this.world.rolling=this.rack.texture({gain:0,hz:m.brightness,pan:f.pan});
    if(this.world.rolling){
      glide(this.world.rolling.amp.gain,contact?(.008+speed*.1)*(f.surface==='carpet'?.45:1):0,t,.07);
      glide(this.world.rolling.filter.frequency,Math.min(6500,m.brightness*(.35+speed*.6)),t,.08);glide(this.world.rolling.panner.pan,f.pan,t,.06);
      if(!contact){this.world.rolling.stop();delete this.world.rolling;}
    }
    if(contact&&f.surface!=='ice'&&t-this.lastRattle>.13+(.17*(1-speed))){this.lastRattle=t;this.rack.impact(f.surface,.03+speed*.12,f.pan,t,.22,'foley');}
    this.continuous('machine',f.machine*.03,()=>this.rack.texture({group:'ambience',gain:0,hz:240,wet:.22}));
    this.continuous('portal',f.portal*.037,()=>{
      const v=this.rack.voice({group:'ambience',gain:0,sustain:true,wet:.6,pan:clamp(engine.target.pos[0]/4.2,-.72,.72),cutoff:2200});
      if(v){v.oscillator(midiHz(THEMES[this.chapter].root+7),'sine',.7);v.oscillator(midiHz(THEMES[this.chapter].root+19),'sine',.18,null,7);v.own();}return v;
    });
    this.continuous('charge',f.charge*.075,()=>{const v=this.rack.voice({group:'foley',gain:0,sustain:true,wet:.18,pan:f.pan});v?.oscillator(440,'sine',.65);v?.oscillator(660,'sine',.18);return v?.own();});
    if(this.world.charge)for(const [index,source] of this.world.charge.sources.entries())glide(source.frequency,(index?1.5:1)*(440+f.charge*220),t,.04);
    this.previous=f;
  }
  continuous(name,gain,create){
    if(gain>.001&&!this.world[name])this.world[name]=create();
    const v=this.world[name];if(!v)return;
    if(gain<=.001){v.stop();delete this.world[name];}else glide(v.amp.gain,gain,this.context.currentTime,.1);
  }
  preview(){
    if(!this.audible)return false;const t=this.context.currentTime;if(t<(this.previewUntil??0))return false;this.previewUntil=t+3.5;
    this.rack.impact('wood',.55,-.5,t+.1,1,'preview');this.rack.impact('carpet',.55,0,t+.55,1,'preview');this.rack.impact('platform',.55,.5,t+1,1,'preview');
    this.rack.sweep({group:'preview',time:t+1.5,from:170,to:750,duration:.55,gain:.13});
    this.rack.note({group:'preview',midi:THEMES[this.chapter].root+19,time:t+2.2,gain:.11,duration:1.2,instrument:'bell'});return true;
  }
  // Kept for callers of the former feedback API; uses the new soft-key instrument.
  tone(freq,duration=.25,gain=.06,delay=0){if(this.audible)this.rack.note({group:'ui',midi:69+12*Math.log2(freq/440),duration,gain,time:this.context.currentTime+delay});}
  vibrate(pattern){try{if(this.getSettings().haptic)globalThis.navigator?.vibrate?.(pattern);}catch{/* Haptics remain optional. */}}
  stopPlayback(){clearInterval(this.timer);this.timer=null;this.rack?.clear();this.world={};this.previous=null;this.lastEvents.clear();this.previewUntil=0;this.duckUntil=0;}
  suspend(){
    this.wanted=false;clearInterval(this.timer);this.timer=null;clearTimeout(this.suspendTimer);
    if(!this.context)return;
    const context=this.context;
    if(this.graph)glide(this.master.gain,0,context.currentTime,.025);
    // Fade first, then release sources. A new gesture cancels this pending stop.
    this.suspendTimer=setTimeout(()=>{
      this.suspendTimer=null;if(this.wanted||context!==this.context)return;
      this.stopPlayback();
      if(this.graph){this.master.gain.cancelScheduledValues(context.currentTime);this.master.gain.value=0;this.graph.convolver.buffer=null;this.graph.convolver.buffer=this.graph.impulse;}
      if(context.state!=='closed')context.suspend().then(()=>{if(this.wanted&&context===this.context)this.unlock();}).catch(()=>{});
    },40);
  }
  destroy(){
    this.wanted=false;clearTimeout(this.suspendTimer);this.suspendTimer=null;this.stopPlayback();this.graph?.dispose();this.context?.close().catch(()=>{});
    this.context=null;this.graph=null;this.master=null;this.rack=null;
  }
}
