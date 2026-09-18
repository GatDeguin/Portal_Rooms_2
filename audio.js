export class AudioFeedback {
  constructor(getSettings){this.getSettings=getSettings;this.context=null;this.master=null;}
  unlock(){
    if(!this.getSettings().sound)return;
    try{if(!this.context){const API=window.AudioContext||window.webkitAudioContext;if(!API)return;this.context=new API();this.master=this.context.createGain();this.master.gain.value=this.getSettings().volume??.65;this.master.connect(this.context.destination);}if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{/* Audio is optional; the game remains playable. */}
  }
  tone(freq,duration=.08,gain=.035,delay=0){
    if(!this.getSettings().sound||!this.context||this.context.state!=='running')return;
    const ctx=this.context,time=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.01);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g).connect(this.master);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  vibrate(pattern){try{if(this.getSettings().haptic&&navigator.vibrate)navigator.vibrate(pattern);}catch{/* Unsupported haptics must not interrupt a turn. */}}
  event(event){
    if(event.type==='impact'){this.tone(120+event.power*180,.05,.01+event.power*.02);if(event.power>.5)this.vibrate(10);}
    if(event.type==='jump'){this.tone(640,.09);this.vibrate([12,20,12]);}
    if(event.type==='bumper'){this.tone(300,.07);this.vibrate(15);}
    if(event.type==='goal'){this.tone(560,.09);this.vibrate(15);}
    if(event.type==='complete'){this.tone(660,.10,.035);this.tone(880,.1,.035,.1);this.tone(1100,.15,.03,.2);this.vibrate([18,28,18]);}
  }
  suspend(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
  refresh(){if(this.master)this.master.gain.value=this.getSettings().sound ? (this.getSettings().volume??.65) : 0;}
}
