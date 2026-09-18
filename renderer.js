import {VERTEX_SHADER,fragmentShader} from './shaders.js';
import {AdaptiveQuality,drawingSize} from './quality.js';
import {movingAt,activeTarget} from './geometry.js';
import {chapterFor} from './presentation.js';
import {clamp} from './math.js';

const GROUPS={uObs:6,uObsMeta:6,uZone:8,uZoneMeta:8,uGhost:4,uRamp:3,uRampMeta:3,uPlat:4,uPlatMeta:4,uBump:3};
export class Renderer {
  constructor(canvas,{quality='auto',onContextLost=()=>{}}={}){
    this.canvas=canvas;this.programs=new Map();this.quality=new AdaptiveQuality(quality);this.lost=false;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl)throw new Error('No se pudo iniciar WebGL. Activá la aceleración gráfica o probá otro navegador.');
    this.gl=gl;this.precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    this.lostHandler=e=>{e.preventDefault();this.lost=true;onContextLost();};canvas.addEventListener('webglcontextlost',this.lostHandler);
    this.program();this.resize();
  }
  compile(type,source){const gl=this.gl,s=gl.createShader(type);if(!s)throw new Error('No hay recursos gráficos disponibles.');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`No se pudo compilar el render: ${message}`);}return s;}
  program(){
    const tier=this.quality.tier;if(this.programs.has(tier))return this.programs.get(tier);
    const gl=this.gl,p=gl.createProgram();let vs,fs;
    try{vs=this.compile(gl.VERTEX_SHADER,VERTEX_SHADER);fs=this.compile(gl.FRAGMENT_SHADER,fragmentShader(tier,this.precision));gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));}
    catch(error){gl.deleteProgram(p);throw error;}finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}
    const names=['uRes','uTime','uCube','uCubeY','uCubeFoot','uCubeQ','uGravity','uShake','uTarget','uTargetY','uTargetType','uPulse','uHold','uMotion','uBoost','uFxTime','uTheme'];
    for(const [prefix,count] of Object.entries(GROUPS))for(let i=0;i<count;i++)names.push(prefix+i);
    const entry={program:p,position:gl.getAttribLocation(p,'aPos'),uniforms:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]))};this.programs.set(tier,entry);return entry;
  }
  resize(){
    if(this.lost)return;
    const size=drawingSize(this.canvas.clientWidth||innerWidth,this.canvas.clientHeight||innerHeight,devicePixelRatio,this.quality.tier,this.quality.scale);
    const max=this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS);size.width=Math.min(size.width,max[0]);size.height=Math.min(size.height,max[1]);
    if(this.canvas.width!==size.width||this.canvas.height!==size.height){this.canvas.width=size.width;this.canvas.height=size.height;}
    this.gl.viewport(0,0,size.width,size.height);
  }
  setQuality(mode){this.quality.setMode(mode);this.resize();}
  sample(ms){if(this.quality.sample(ms))this.resize();}
  draw(engine,settings){
    if(this.lost)return;
    const gl=this.gl,{program,position,uniforms:u}=this.program(),s=engine.state,c=s.cube,t=engine.target,room=engine.room;
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const one=(name,v)=>gl.uniform1f(u[name],v),two=(name,x,y)=>gl.uniform2f(u[name],x,y),four=(name,a,b,d,e)=>gl.uniform4f(u[name],a,b,d,e);
    const motion=settings.dynamicCamera?1:0,effects=settings.effects!==false,[qx,qy,qz,qw]=c.q;
    const extent=.245*(Math.abs(2*(qx*qy+qw*qz))+Math.abs(1-2*(qx*qx+qz*qz))+Math.abs(2*(qy*qz-qw*qx)));
    two('uRes',this.canvas.width,this.canvas.height);one('uTime',s.time);one('uFxTime',effects?s.time:0);
    const color=chapterFor(room).color.slice(1).match(/../g).map(h=>parseInt(h,16)/255);four('uTheme',...color,effects?1:0);two('uCube',c.x,c.z);one('uCubeY',c.y+extent-.245);one('uCubeFoot',c.y);four('uCubeQ',...c.q);
    two('uGravity',s.gravity.x*motion,s.gravity.z*motion);one('uShake',s.shake*motion);one('uMotion',motion);
    two('uTarget',...t.pos);one('uTargetY',t.y??0);one('uTargetType',t.type);one('uHold',clamp(c.hold/.55,0,1));four('uPulse',s.fx.x,s.fx.z,effects?s.fx.life:0,s.fx.type);
    const boost=(room.zones??[]).find(z=>z.type===3);two('uBoost',boost?.dx??1,boost?.dz??0);
    const zones=[...(room.zones??[])];for(const pad of room.jumpPads??[])if(!zones.some(z=>z.type===5&&z.x===pad.x&&z.z===pad.z))zones.push({...pad,type:5});
    const obstacles=(room.obstacles??[]).map(o=>movingAt(o,s.time)),platforms=(room.platforms??[]).map(p=>movingAt(p,s.time));
    const setGroup=(prefix,count,list,pack)=>{for(let i=0;i<count;i++)four(prefix+i,...(list[i]?pack(list[i]):[0,0,0,0]));};
    setGroup('uObs',6,obstacles,o=>[o.x,o.z,o.w,o.d]);setGroup('uObsMeta',6,obstacles,o=>[o.h??.49,o.move?1:0,0,0]);
    setGroup('uZone',8,zones,z=>[z.x,z.z,z.r,z.type]);setGroup('uZoneMeta',8,zones,z=>[z.y??0,z.dx??1,z.dz??0,0]);
    const ghosts=(room.sequence??[]).map((_,i)=>{if(i===s.seq)return null;const t=activeTarget(room,i,s.time);return {...t,done:i<s.seq};});
    setGroup('uGhost',4,ghosts,t=>[t.pos[0],t.pos[1],t.y??0,t.type+(t.done?4:0)]);
    setGroup('uRamp',3,room.ramps??[],r=>[r.x,r.z,r.w,r.d]);setGroup('uRampMeta',3,room.ramps??[],r=>[r.h,r.dx??0,r.dz??-1,r.base??0]);
    setGroup('uPlat',4,platforms,p=>[p.x,p.z,p.w,p.d]);setGroup('uPlatMeta',4,platforms,p=>[p.h,0,0,0]);
    setGroup('uBump',3,room.bumpers??[],b=>[b.x,b.z,b.r,b.h??.34]);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  description(){const labels={low:'Baja',medium:'Media',high:'Alta'};return `${labels[this.quality.tier]} · ${this.canvas.width} × ${this.canvas.height}`;}
  destroy(){this.canvas.removeEventListener('webglcontextlost',this.lostHandler);for(const entry of this.programs.values())this.gl.deleteProgram(entry.program);this.gl.deleteBuffer(this.quad);this.programs.clear();}
}
