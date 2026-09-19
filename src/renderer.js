import {VERTEX_SHADER,fragmentShader} from './shaders.js';
import {AdaptiveQuality,drawingSize} from './quality.js';
import {movingAt} from './geometry.js';
import {clamp} from './math.js';
import {lookForRoom} from './campaign.js';

// Four subtle lighting states; presentation only, no level/progression mutation.
const ROOM_LOOKS=[[1.04,0,1],[1.02,-.025,.96],[1.04,.018,1.03],[1.01,-.015,1.08]];
const GROUPS={uObs:6,uZone:8,uRamp:3,uRampMeta:3,uPlat:4,uPlatMeta:4,uBump:3};
export class Renderer {
  constructor(canvas,{quality='auto',onContextLost=()=>{},deferProgram=false}={}){
    this.canvas=canvas;this.programs=new Map();this.quality=new AdaptiveQuality(quality);this.lost=false;this.qualityEpoch=0;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl)throw new Error('No se pudo iniciar WebGL. Activá la aceleración gráfica o probá otro navegador.');
    this.gl=gl;this.derivatives=!!gl.getExtension('OES_standard_derivatives');this.motionQuery=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    this.lostHandler=e=>{e.preventDefault();this.lost=true;onContextLost();};canvas.addEventListener('webglcontextlost',this.lostHandler);
    this.maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if(!deferProgram)this.program();this.resize();
  }
  compile(type,source){const gl=this.gl,s=gl.createShader(type);if(!s)throw new Error('No hay recursos gráficos disponibles.');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`No se pudo compilar el render: ${message}`);}return s;}
  program(){
    const tier=this.quality.tier;if(this.programs.has(tier))return this.programs.get(tier);
    const gl=this.gl,p=gl.createProgram();let vs,fs;
    try{vs=this.compile(gl.VERTEX_SHADER,VERTEX_SHADER);fs=this.compile(gl.FRAGMENT_SHADER,fragmentShader(tier,this.precision,{derivatives:this.derivatives}));gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));}
    catch(error){gl.deleteProgram(p);throw error;}finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
    const names=['uRes','uTime','uCube','uCubeY','uCubeFoot','uCubeQ','uGravity','uShake','uTarget','uTargetY','uTargetType','uPulse','uHold','uMotion','uBoost','uLook'];
    for(const [prefix,count] of Object.entries(GROUPS))for(let i=0;i<count;i++)names.push(prefix+i);
    const entry={program:p,position:gl.getAttribLocation(p,'aPos'),uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]))};this.programs.set(tier,entry);return entry;
  }
  resize(){
    if(this.lost)return;
    const size=drawingSize(this.canvas.clientWidth||innerWidth,this.canvas.clientHeight||innerHeight,devicePixelRatio,this.quality.tier,this.quality.scale);
    const max=this.maxViewport;size.width=Math.min(size.width,max[0]);size.height=Math.min(size.height,max[1]);
    if(this.canvas.width!==size.width||this.canvas.height!==size.height){this.canvas.width=size.width;this.canvas.height=size.height;}
    this.gl.viewport(0,0,size.width,size.height);
  }
  setQuality(mode){
    const previous=this.quality;this.quality=new AdaptiveQuality(mode);
    try{this.program();this.resize();}catch(error){this.quality=previous;this.resize();throw error;}
  }
  async prepareProgram(tier,{signal,timeoutMs=12000}={}){
    if(this.programs.has(tier))return this.programs.get(tier);
    const gl=this.gl,extension=gl.getExtension('KHR_parallel_shader_compile');
    const parallel=Number.isFinite(extension?.COMPLETION_STATUS_KHR)?extension:null;
    const started=performance.now();let program=null,vs=null,fs=null,retained=false;
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
      check();await wait(0);check();
      program=gl.createProgram();vs=gl.createShader(gl.VERTEX_SHADER);fs=gl.createShader(gl.FRAGMENT_SHADER);
      if(!program||!vs||!fs)throw new Error('No hay recursos gráficos disponibles.');
      gl.shaderSource(vs,VERTEX_SHADER);gl.shaderSource(fs,fragmentShader(tier,this.precision,{derivatives:this.derivatives}));
      gl.compileShader(vs);gl.compileShader(fs);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.flush();
      if(parallel){
        while(!gl.getProgramParameter(program,parallel.COMPLETION_STATUS_KHR)){check();await wait(16);}
      }else{
        // Old browsers without workers/KHR cannot expose a nonblocking link query.
        // Paint the menu first; this compatibility path may still pause in the driver.
        await wait(32);
      }
      check();
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||gl.getShaderInfoLog(fs)||'No se pudo compilar esta calidad.');
      const names=['uRes','uTime','uCube','uCubeY','uCubeFoot','uCubeQ','uGravity','uShake','uTarget','uTargetY','uTargetType','uPulse','uHold','uMotion','uBoost','uLook'];
      for(const [prefix,count] of Object.entries(GROUPS))for(let i=0;i<count;i++)names.push(prefix+i);
      const entry={program,position:gl.getAttribLocation(program,'aPos'),uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]))};
      check();
      if(this.programs.has(tier))return this.programs.get(tier);
      this.programs.set(tier,entry);retained=true;return entry;
    }finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);if(program&&!retained)gl.deleteProgram(program);}
  }
  async requestQuality(mode,options={}){
    const epoch=++this.qualityEpoch,next=new AdaptiveQuality(mode);
    await this.prepareProgram(next.tier,options);
    if(options.signal?.aborted||this.lost||epoch!==this.qualityEpoch)throw new DOMException('Cambio de calidad cancelado.','AbortError');
    this.quality=next;this.resize();
  }
  sample(ms){
    if(this.autoPending)return;
    const quality=this.quality,previous=quality.tier;
    if(!quality.sample(ms))return;
    if(!this.asyncCompile||previous===quality.tier||this.programs.has(quality.tier)){this.resize();return;}
    const next=quality.tier,epoch=this.qualityEpoch;quality.tier=previous;this.resize();
    this.autoPending=this.prepareProgram(next).then(()=>{
      if(!this.lost&&this.quality===quality&&this.qualityEpoch===epoch){quality.tier=next;this.resize();}
    }).catch(()=>{quality.resetSamples();}).finally(()=>{this.autoPending=null;});
  }
  draw(engine,settings){
    if(this.lost)return;
    const gl=this.gl,{program,position,uniforms:u}=this.program(),s=engine.state,c=s.cube,t=engine.target,room=engine.room;
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
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
  description(){const labels={low:'Baja',medium:'Media',high:'Alta',cinematic:'Cinemática'};return `${labels[this.quality.tier]} · ${this.canvas.width} × ${this.canvas.height}`;}
  destroy(){this.lost=true;++this.qualityEpoch;this.canvas.removeEventListener('webglcontextlost',this.lostHandler);for(const entry of this.programs.values())this.gl.deleteProgram(entry.program);this.gl.deleteBuffer(this.quad);this.programs.clear();}
}
