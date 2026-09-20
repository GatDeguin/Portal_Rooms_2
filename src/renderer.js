import {VERTEX_SHADER,fragmentShader} from './shaders.js';
import {AdaptiveQuality,drawingSize,QUALITY_PRESSURE} from './quality.js';
import {movingAt} from './geometry.js';
import {clamp} from './math.js';
import {lookForRoom} from './campaign.js';
import {createReliefNoiseTexture} from './relief-noise.js';

// Four subtle lighting states; presentation only, no level/progression mutation.
const ROOM_LOOKS=[[1.04,0,1],[1.02,-.025,.96],[1.04,.018,1.03],[1.01,-.015,1.08]];
const GROUPS={uObs:6,uZone:8,uRamp:3,uRampMeta:3,uPlat:4,uPlatMeta:4,uBump:3};
export const RENDER_TIMEOUTS=Object.freeze({prepare:60000,mediumPrepare:90000,heavyPrepare:180000,frame:12000});
export const preparationTimeout=tier=>tier==='high'||tier==='cinematic'?RENDER_TIMEOUTS.heavyPrepare:tier==='medium'?RENDER_TIMEOUTS.mediumPrepare:RENDER_TIMEOUTS.prepare;
export class Renderer {
  constructor(canvas,{quality='auto',onContextLost=()=>{},deferProgram=false}={}){
    this.canvas=canvas;this.reliefNoiseTexture=null;this.programs=new Map();this.failedAutoTiers=new Set();this.quality=new AdaptiveQuality(quality);this.lost=false;this.qualityEpoch=0;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl)throw new Error('No se pudo iniciar WebGL. Activá la aceleración gráfica o probá otro navegador.');
    this.gl=gl;this.timerExtension=gl.getExtension('EXT_disjoint_timer_query');this.derivatives=!!gl.getExtension('OES_standard_derivatives');this.motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    this.lostHandler=e=>{e.preventDefault();this.lost=true;this.clearRenderTiming();onContextLost();};canvas.addEventListener('webglcontextlost',this.lostHandler);
    this.maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if(!deferProgram)this.program();this.resize();
  }
  compile(type,source){const gl=this.gl,s=gl.createShader(type);if(!s)throw new Error('No hay recursos gráficos disponibles.');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`No se pudo compilar el render: ${message}`);}return s;}
  prepareReliefNoise(tier){if(!this.reliefNoiseTexture&&this.precision==='highp'&&(tier==='high'||tier==='cinematic'))this.reliefNoiseTexture=createReliefNoiseTexture(this.gl);}
  passes(tier){return this.precision==='highp'&&(tier==='high'||tier==='cinematic')?['surface','shade']:['combined'];}
  programEntry(program){
    const gl=this.gl,names=['uRes','uTime','uCube','uCubeY','uCubeFoot','uCubeQ','uGravity','uShake','uTarget','uTargetY','uTargetType','uPulse','uHold','uMotion','uBoost','uLook','uReliefNoise','uSurfaceHits'];
    for(const [prefix,count] of Object.entries(GROUPS))for(let i=0;i<count;i++)names.push(prefix+i);
    return {program,position:gl.getAttribLocation(program,'aPos'),uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
  }
  program(){
    const tier=this.quality.tier;this.prepareReliefNoise(tier);if(this.programs.has(tier))return this.programs.get(tier);
    const gl=this.gl,entries=[];
    try{
      for(const pass of this.passes(tier)){
        const p=gl.createProgram();let vs,fs;
        try{vs=this.compile(gl.VERTEX_SHADER,VERTEX_SHADER);fs=this.compile(gl.FRAGMENT_SHADER,fragmentShader(tier,this.precision,{derivatives:this.derivatives,pass}));gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));entries.push(this.programEntry(p));}
        catch(error){gl.deleteProgram(p);throw error;}finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
      }
      const entry=entries.at(-1);if(entries.length===2)entry.surface=entries[0];this.programs.set(tier,entry);return entry;
    }catch(error){for(const entry of entries)gl.deleteProgram(entry.program);throw error;}
  }
  ensureSurfaceTarget(){
    const gl=this.gl,width=this.canvas.width,height=this.canvas.height,previous=this.surfaceTarget;
    if(previous?.width===width&&previous.height===height)return previous;
    const framebuffer=gl.createFramebuffer(),texture=gl.createTexture();let retained=false;
    try{
      if(!framebuffer||!texture)throw new Error('No hay recursos para la superficie gráfica.');
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('No se pudo preparar el framebuffer de superficie.');
      this.surfaceTarget={framebuffer,texture,width,height};retained=true;
      if(previous){gl.deleteFramebuffer(previous.framebuffer);gl.deleteTexture(previous.texture);}return this.surfaceTarget;
    }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);if(!retained){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);}}
  }
  resize(){
    if(this.lost)return;
    const size=drawingSize(this.canvas.clientWidth||globalThis.innerWidth||2,this.canvas.clientHeight||globalThis.innerHeight||2,globalThis.devicePixelRatio||1,this.quality.tier,this.quality.scale);
    const max=this.maxViewport;size.width=Math.min(size.width,max[0]);size.height=Math.min(size.height,max[1]);
    if(this.canvas.width!==size.width||this.canvas.height!==size.height){this.canvas.width=size.width;this.canvas.height=size.height;}
    this.gl.viewport(0,0,size.width,size.height);
  }
  setQuality(mode){
    const previous=this.quality;this.quality=new AdaptiveQuality(mode);
    try{this.program();this.resize();}catch(error){this.quality=previous;this.resize();throw error;}
  }
  async prepareProgram(tier,{signal,timeoutMs=preparationTimeout(tier)}={}){
    if(!this.externallyTimed&&(tier==='high'||tier==='cinematic')&&!this.timerExtension)throw new Error('Esta calidad necesita temporización GPU para validar su primera imagen. Se conserva la calidad actual.');
    if(this.programs.has(tier))return this.programs.get(tier);
    const gl=this.gl,extension=gl.getExtension('KHR_parallel_shader_compile');
    const parallel=Number.isFinite(extension?.COMPLETION_STATUS_KHR)?extension:null;
    if(!parallel&&!this.externallyTimed&&(tier==='high'||tier==='cinematic'))throw new Error('Esta calidad necesita render en segundo plano o compilación paralela. Se conserva la calidad actual.');
    const started=performance.now(),entries=[];let retained=false;
    const check=()=>{
      if(signal?.aborted||this.lost)throw new DOMException('Cambio de calidad cancelado.','AbortError');
      if(performance.now()-started>timeoutMs)throw new Error('La preparación gráfica tardó demasiado. Se conserva la calidad anterior.');
    };
    const wait=ms=>new Promise((resolve,reject)=>{
      const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Cambio de calidad cancelado.','AbortError'));};
      const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
      signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    });
    try{
      check();await wait(0);check();this.prepareReliefNoise(tier);check();
      for(const pass of this.passes(tier)){
        let program=null,vs=null,fs=null,complete=false;
        try{
          program=gl.createProgram();vs=gl.createShader(gl.VERTEX_SHADER);fs=gl.createShader(gl.FRAGMENT_SHADER);
          if(!program||!vs||!fs)throw new Error('No hay recursos gráficos disponibles.');
          gl.shaderSource(vs,VERTEX_SHADER);gl.shaderSource(fs,fragmentShader(tier,this.precision,{derivatives:this.derivatives,pass}));
          gl.compileShader(vs);gl.compileShader(fs);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.flush();
          if(parallel){while(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){check();await wait(16);}}
          else{
            // Without workers/KHR, the compatibility link query may still pause in the driver.
            await wait(32);
          }
          check();
          if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||gl.getShaderInfoLog(fs)||'No se pudo compilar esta calidad.');
          entries.push(this.programEntry(program));complete=true;
        }finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);if(program&&!complete)gl.deleteProgram(program);}
      }
      check();if(this.programs.has(tier))return this.programs.get(tier);
      const entry=entries.at(-1);if(entries.length===2)entry.surface=entries[0];this.programs.set(tier,entry);retained=true;return entry;
    }finally{if(!retained)for(const entry of entries)gl.deleteProgram(entry.program);}
  }
  async requestQuality(mode,options={}){await this.switchQuality(new AdaptiveQuality(mode),options);this.failedAutoTiers.delete(this.quality.tier);}
  async switchQuality(next,options={}){
    const epoch=++this.qualityEpoch,previous=this.quality;
    const check=()=>{if(options.signal?.aborted||this.lost||epoch!==this.qualityEpoch)throw new DOMException('Cambio de calidad cancelado.','AbortError');};
    await this.prepareProgram(next.tier,{...options,timeoutMs:options.prepareTimeoutMs??options.timeoutMs??preparationTimeout(next.tier)});check();
    const started=performance.now();
    if(this.externallyTimed){this.quality=next;this.resize();return;}
    const heavy=next.tier==='high'||next.tier==='cinematic';
    this.clearRenderTiming();this.lastTimingState='wall';this.validating=true;
    try{
      this.quality=next;this.resize();const drawStarted=performance.now();
      if(this.lastScene){
        this.draw(this.lastScene,this.lastSettings??{});this.gl.flush();
        const error=this.gl.getError();
        if(error!==undefined&&error!==this.gl.NO_ERROR)throw new Error('No se pudo validar la primera imagen de esta calidad.');
      }else if(heavy)throw new Error('No hay una escena para validar la primera imagen GPU.');
      const candidateQuery=this.pendingTiming,candidateWall=performance.now()-drawStarted;
      // Keep the working selection and redraw it during asynchronous candidate validation.
      this.quality=previous;this.resize();
      this.suppressTiming=true;if(this.lastScene)this.draw(this.lastScene,this.lastSettings??{});this.suppressTiming=false;
      this.validating=false;
      if(heavy){
        const result=await this.settleRenderTiming({query:candidateQuery,timeoutMs:Math.max(0,(options.timeoutMs??RENDER_TIMEOUTS.frame)-(performance.now()-started)),check});check();
        if(result.state!=='gpu')throw new Error('No se pudo confirmar la primera imagen GPU a tiempo. Se conserva la calidad anterior.');
        if(next.mode==='auto')next.sample(result.cost);
      }else if(next.mode==='auto')next.sample(candidateWall);
      check();
      if(performance.now()-started>(options.timeoutMs??RENDER_TIMEOUTS.frame))throw new Error('La primera imagen tardó demasiado. Se conserva la calidad anterior.');
      this.quality=next;this.resize();this.validating=true;
      if(this.lastScene)this.draw(this.lastScene,this.lastSettings??{});
    }catch(error){
      if(epoch===this.qualityEpoch&&!this.lost){this.quality=previous;this.resize();this.validating=true;if(this.lastScene)this.draw(this.lastScene,this.lastSettings??{});}
      throw error;
    }finally{if(epoch===this.qualityEpoch){this.validating=false;this.suppressTiming=false;this.clearRenderTiming();}}
  }
  sample(ms){if(Number.isFinite(ms)&&ms>0)this.rafPressure=ms;}
  beginRenderTiming(){
    if(this.suppressTiming){this.timingThisDraw=false;return;}
    this.pollRenderTiming();this.timingThisDraw=false;
    const ext=this.timerExtension;
    if(!ext||this.pendingTiming||this.lost)return;
    const query=ext.createQueryEXT();if(!query)return;
    this.pendingTiming={query,started:performance.now(),cost:null};this.timingThisDraw=true;
    ext.beginQueryEXT(ext.TIME_ELAPSED_EXT,query);
  }
  endRenderTiming(){if(this.timingThisDraw)this.timerExtension.endQueryEXT(this.timerExtension.TIME_ELAPSED_EXT);}
  observeRender(ms){
    if(this.validating){if(this.timingThisDraw&&this.pendingTiming){this.pendingTiming.cost=ms;this.pendingTiming.sampled=true;this.pendingTiming.validation=true;this.timingThisDraw=false;}return;}
    // Emergency wall cost must not wait for an asynchronous GPU sample.
    if(ms>=QUALITY_PRESSURE.verySlow){
      if(this.timingThisDraw&&this.pendingTiming){this.pendingTiming.cost=ms;this.pendingTiming.sampled=true;this.timingThisDraw=false;}
      else this.clearRenderTiming();
      this.adapt(ms);return;
    }
    if(this.timingThisDraw&&this.pendingTiming){this.pendingTiming.cost=ms;this.timingThisDraw=false;}
    // A fast submission while GPU work is outstanding is not recovery headroom.
    else if(!this.pendingTiming||ms>QUALITY_PRESSURE.sustained)this.adapt(ms);
    this.pollRenderTiming();
  }
  pollRenderTiming(){
    const pending=this.pendingTiming,ext=this.timerExtension;
    if(!pending||pending.cost===null)return;
    const disjoint=this.gl.getParameter(ext.GPU_DISJOINT_EXT),elapsed=performance.now()-pending.started;
    // Availability wins over age: a hidden tab may poll a completed fast query late.
    const available=!disjoint&&ext.getQueryObjectEXT(pending.query,ext.QUERY_RESULT_AVAILABLE_EXT);
    const expired=!disjoint&&!available&&elapsed>2000;
    if(!disjoint&&!expired&&!available)return;
    const ns=available?ext.getQueryObjectEXT(pending.query,ext.QUERY_RESULT_EXT):NaN;
    ext.deleteQueryEXT(pending.query);this.pendingTiming=null;
    const gpuMs=Number.isFinite(ns)&&ns>0?ns/1e6:0;
    this.finishRenderTiming(pending,disjoint?'disjoint':expired?'expired':gpuMs>0?'gpu':'invalid',Math.max(pending.cost,gpuMs,expired?elapsed:0));
  }
  finishRenderTiming(pending,state,cost){
    this.lastTimingState=state;pending.result={state,cost};
    if(pending.validation)return;
    // Missing/disjoint GPU evidence cannot turn quick submission into headroom.
    if(!pending.sampled&&(state==='gpu'||cost>QUALITY_PRESSURE.sustained))this.adapt(cost);
    else if(pending.sampled&&cost>=QUALITY_PRESSURE.catastrophic&&pending.cost<QUALITY_PRESSURE.catastrophic&&this.quality.emergency(cost)){
      // Escalate severity without counting this frame twice in recovery windows.
      this.autoPending=null;++this.qualityEpoch;this.resize();
    }
  }
  async settleRenderTiming({query=this.pendingTiming,timeoutMs=2000,check=()=>{}}={}){
    const started=performance.now();
    while(query&&!query.result){
      check();if(this.lost)throw new Error('Se perdió el contexto WebGL.');
      if(this.pendingTiming===query)this.pollRenderTiming();
      if(query.result)break;
      if(performance.now()-started>=timeoutMs){
        this.finishRenderTiming(query,'expired',Math.max(query.cost,performance.now()-query.started));
        if(this.pendingTiming===query)this.clearRenderTiming();break;
      }
      await new Promise(resolve=>setTimeout(resolve,16));
    }
    return query?.result??{state:'wall',cost:0};
  }
  clearRenderTiming(){
    if(this.pendingTiming){
      this.pendingTiming.result??={state:'discarded',cost:this.pendingTiming.cost};
      this.timerExtension?.deleteQueryEXT(this.pendingTiming.query);
    }
    this.pendingTiming=null;this.timingThisDraw=false;
  }
  adapt(ms){
    if(this.autoPending){if(ms<QUALITY_PRESSURE.verySlow)return;this.autoPending=null;++this.qualityEpoch;}
    const quality=this.quality,previous=quality.tier;
    if(!quality.sample(ms))return;
    if(quality.tier!==previous&&this.failedAutoTiers?.has(quality.tier)){quality.tier=previous;quality.resetSamples();return;}
    if(!this.asyncCompile||previous===quality.tier||((this.externallyTimed||['low','medium','high'].indexOf(quality.tier)<['low','medium','high'].indexOf(previous))&&this.programs.has(quality.tier))){this.resize();return;}
    const next=quality.tier;quality.tier=previous;this.resize();
    if(this.onAutoTier){this.autoPending={external:true,tier:next};this.onAutoTier(next);return;}
    const attempt={};this.autoPending=attempt;
    const target=new AdaptiveQuality(quality.mode);target.tier=next;target.scale=quality.scale;
    attempt.promise=this.switchQuality(target).catch(error=>{if(this.autoPending===attempt){if(error.name!=='AbortError')(this.failedAutoTiers??=new Set()).add(next);quality.resetSamples();}}).finally(()=>{if(this.autoPending===attempt)this.autoPending=null;});
  }
  draw(engine,settings){
    if(this.lost)return;
    this.lastScene=engine;this.lastSettings=settings;
    const started=performance.now();this.beginRenderTiming();
    const gl=this.gl,entry=this.program(),s=engine.state,c=s.cube,t=engine.target,room=engine.room;
    const dither=gl.isEnabled(gl.DITHER)===true;
    try{
    const target=entry.surface?this.ensureSurfaceTarget():null;
    for(const pass of entry.surface?[entry.surface,entry]:[entry]){
    const {program,position,uniforms:u}=pass;
    if(pass===entry.surface){gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.disable(gl.DITHER);}
    else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);if(dither)gl.enable(gl.DITHER);else gl.disable(gl.DITHER);}
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    if(this.reliefNoiseTexture){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.reliefNoiseTexture);}
    gl.useProgram(program);if(this.reliefNoiseTexture)gl.uniform1i(u.uReliefNoise,0);
    if(target&&pass===entry){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,target.texture);gl.uniform1i(u.uSurfaceHits,1);}
    gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const one=(name,v)=>gl.uniform1f(u[name],v),two=(name,x,y)=>gl.uniform2f(u[name],x,y),four=(name,a,b,d,e)=>gl.uniform4f(u[name],a,b,d,e);
    const reduced=this.motionQuery?.matches===true,effects=settings.effects!==false&&!reduced?1:0;
    const motion=settings.dynamicCamera&&!reduced?1:0,[qx,qy,qz,qw]=c.q;
    const chapter=lookForRoom(room.id??s.level+1);
    four('uLook',...ROOM_LOOKS[chapter],effects);
    const extent=.245*(Math.abs(2*(qx*qy+qw*qz))+Math.abs(1-2*(qx*qx+qz*qz))+Math.abs(2*(qy*qz-qw*qx)));
    two('uRes',this.canvas.width,this.canvas.height);one('uTime',s.time);two('uCube',c.x,c.z);one('uCubeY',c.y+extent-.245);one('uCubeFoot',c.y);four('uCubeQ',...c.q);
    two('uGravity',s.gravity.x*motion,s.gravity.z*motion);one('uShake',s.shake*motion*effects);one('uMotion',motion);
    two('uTarget',...t.pos);one('uTargetY',t.y??0);one('uTargetType',t.type);one('uHold',clamp(c.hold/.55,0,1));four('uPulse',s.fx.x,s.fx.z,s.fx.life,s.fx.type);
    const boost=(room.zones??[]).find(z=>z.type===3);two('uBoost',boost?.dx??1,boost?.dz??0);
    const zones=[...(room.zones??[])];for(const pad of room.jumpPads??[])if(!zones.some(z=>z.type===5&&z.x===pad.x&&z.z===pad.z))zones.push({...pad,type:5});
    const obstacles=(room.obstacles??[]).map(o=>movingAt(o,s.time)),platforms=(room.platforms??[]).map(p=>movingAt(p,s.time));
    const setGroup=(prefix,count,list,pack)=>{for(let i=0;i<count;i++)four(prefix+i,...(list[i]?pack(list[i]):[0,0,0,0]));};
    setGroup('uObs',6,obstacles,o=>[o.x,o.z,o.w,o.d]);setGroup('uZone',8,zones,z=>[z.x,z.z,z.r,z.type]);
    setGroup('uRamp',3,room.ramps??[],r=>[r.x,r.z,r.w,r.d]);setGroup('uRampMeta',3,room.ramps??[],r=>[r.h,r.dx??0,r.dz??-1,r.base??0]);
    setGroup('uPlat',4,platforms,p=>[p.x,p.z,p.w,p.d]);setGroup('uPlatMeta',4,platforms,p=>[p.h,0,0,0]);
    setGroup('uBump',3,room.bumpers??[],b=>[b.x,b.z,b.r,b.h??.34]);
    gl.drawArrays(gl.TRIANGLES,0,3);
    }
    }finally{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);if(dither)gl.enable(gl.DITHER);else gl.disable(gl.DITHER);this.endRenderTiming();}
    if(!this.externallyTimed){const observed=Math.max(performance.now()-started,this.rafPressure??0);this.rafPressure=0;this.observeRender(observed);}
  }
  description(){const labels={low:'Baja',medium:'Media',high:'Alta',cinematic:'Cinemática'};return `${labels[this.quality.tier]} · ${this.canvas.width} × ${this.canvas.height}`;}
  destroy(){if(this.surfaceTarget){this.gl.deleteFramebuffer(this.surfaceTarget.framebuffer);this.gl.deleteTexture(this.surfaceTarget.texture);this.surfaceTarget=null;}if(this.reliefNoiseTexture){this.gl.deleteTexture(this.reliefNoiseTexture);this.reliefNoiseTexture=null;}this.clearRenderTiming();this.lost=true;++this.qualityEpoch;this.canvas.removeEventListener('webglcontextlost',this.lostHandler);for(const entry of this.programs.values()){this.gl.deleteProgram(entry.program);if(entry.surface)this.gl.deleteProgram(entry.surface.program);}this.gl.deleteBuffer(this.quad);this.programs.clear();}
}
