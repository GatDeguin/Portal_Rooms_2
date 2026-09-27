import {SurfaceEffectsCache} from './surface-effects-geometry.js';
import {RoomReceiverCache,dynamicReceivers} from './hand-room.js';
import {RECEIVER_VERTEX,RECEIVER_FRAGMENT,SHADOW_FRAGMENT} from './hand-shaders.js';

// Same inverse radial lens and ceiling light as hand-shaders/shaders.js. The
// camera dimensions describe the presented bitmap, including an older resize.
const PROJECTION=`
uniform vec3 uOrigin,uRight,uUp,uForward;
uniform vec2 uAspectFov,uJitter;
vec4 projectRoom(vec3 p){
 vec3 d=p-uOrigin;float z=dot(d,uForward);
 vec2 xy=vec2(dot(d,uRight),dot(d,uUp))*uAspectFov.y/max(z,.0001);
 float radius=length(xy),r=radius;
 for(int i=0;i<6;i++)r-=(r+.035*r*r*r-radius)/(1.+.105*r*r);
 xy*=radius>.000001?r/radius:1.;xy-=uJitter;xy.x/=uAspectFov.x;
 return vec4(xy*z,1.00417537*z-.10020877,z);
}
vec4 projectLight(vec3 p){
 vec3 d=p-vec3(0.,3.045,-.70);float z=-d.y;
 return vec4(d.x*.363970234,-d.z*.363970234,1.01005025*z-.10050251,z);
}`;
export const CLOTH_VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform bool uShadowPass;
out vec3 vP,vN;out vec2 vUV;
${PROJECTION}
void main(){vP=aPosition;vN=aNormal;vUV=aUV;gl_Position=uShadowPass?projectLight(aPosition):projectRoom(aPosition);}`;
export const CLOTH_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vP,vN;in vec2 vUV;out vec4 frag;
uniform vec3 uColor,uCamera;uniform bool uSupport;uniform float uDetail;
uniform sampler2D uShadow;
${PROJECTION}
float visibility(vec3 p){
 vec4 clip=projectLight(p);vec3 q=clip.xyz/clip.w*.5+.5;
 if(clip.w<=0.||any(lessThan(q,vec3(0)))||any(greaterThan(q,vec3(1))))return 1.;
 vec2 texel=1./vec2(textureSize(uShadow,0));float visible=0.;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)visible+=q.z-.0009<=texture(uShadow,q.xy+vec2(x,y)*texel*1.4).r?1.:0.;
 return visible/9.;
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec3 n=normalize(vN),v=normalize(uCamera-vP);if(dot(n,v)<0.)n=-n;
 vec3 l=normalize(vec3(0.,3.045,-.70)-vP),fill=normalize(vec3(-1.8,2.6,3.)-vP);
 float lit=max(dot(n,l),0.),back=max(-dot(n,l),0.),shade=visibility(vP);
 vec3 color=uColor;
 if(!uSupport){
  float hem=1.-smoothstep(.018,.03,min(min(vUV.x,1.-vUV.x),1.-vUV.y));
  float stripe=smoothstep(.055,.061,vUV.x)*(1.-smoothstep(.075,.081,vUV.x))+smoothstep(.919,.925,vUV.x)*(1.-smoothstep(.939,.945,vUV.x));
  color=mix(color,color*.58,hem*.55);color=mix(color,vec3(.87,.72,.39),stripe*.65);
  vec2 weaveUV=vUV*vec2(90.,110.);vec2 filterWidth=fwidth(weaveUV);
  float weave=sin(weaveUV.x*6.28318)*sin(weaveUV.y*6.28318)*clamp(1.-max(filterWidth.x,filterWidth.y),0.,1.);
  color*=1.+weave*.065*uDetail;
 }
 vec3 h=normalize(l+v);float spec=pow(max(dot(n,h),0.),uSupport?42.:12.)*(uSupport?.35:.045);
 float sheen=pow(1.-max(dot(n,v),0.),4.)*.13;
 vec3 c=color*(.27+lit*1.35*mix(.35,1.,shade)+max(dot(n,fill),0.)*.28+back*.12)+spec*shade+color*sheen;
 frag=vec4(pow(aces(c),vec3(1./2.2)),1.);
}`;
export const SURFACE_EFFECT_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vP,vN;in vec2 vUV;out vec4 frag;
uniform vec3 uCamera,uColor;uniform int uEffect;
void main(){
 vec3 n=normalize(vN),v=normalize(uCamera-vP);if(dot(n,v)<0.)n=-n;
 vec3 l=normalize(vec3(0.,3.045,-.70)-vP),h=normalize(l+v);
 float lit=max(dot(n,l),0.),rim=pow(1.-max(dot(n,v),0.),3.);
 if(uEffect>=3){frag=vec4(mix(uColor,vec3(.85,.97,1.),.4),vUV.x);return;}
 float gloss=pow(max(dot(n,h),0.),uEffect==2?65.:110.);
 float reflection=pow(max(dot(n,normalize(vec3(-.5,.8,1.))),0.),14.);
 vec3 color=uColor*(.34+lit*.82)+vec3(.85,.97,1.)*(gloss*.9+reflection*.26)+uColor*rim*.55;
 color=pow(clamp(color,0.,1.),vec3(1./2.2));
 frag=vec4(color,vUV.x*mix(.8,1.,rim));
}`;
function program(gl,vertex,fragment){
 const p=gl.createProgram(),shaders=[];
 try{
  for(const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(kind);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(p,shader);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  return {program:p,u:Object.fromEntries(['uOrigin','uRight','uUp','uForward','uAspectFov','uJitter','uShadowPass','uShadow','uColor','uCamera','uSupport','uDetail','uEffect'].map(n=>[n,gl.getUniformLocation(p,n)]))};
 }catch(error){gl.deleteProgram(p);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
}
function railVertices(rail,supports=[true,true],baseY=0){
 const out=[];
 const cylinder=(a,b,r)=>{
  const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d);if(length<1e-8)return;
  const axis=d.map(v=>v/length),base=Math.abs(axis[1])<.9?[0,1,0]:[1,0,0];
  let u=[axis[1]*base[2]-axis[2]*base[1],axis[2]*base[0]-axis[0]*base[2],axis[0]*base[1]-axis[1]*base[0]],ul=Math.hypot(...u);u=u.map(v=>v/ul);
  const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];
  const vertex=(point,n)=>[...point,...n,0,0];
  for(let i=0;i<10;i++){
   const normal=j=>u.map((x,k)=>x*Math.cos(j*Math.PI/5)+v[k]*Math.sin(j*Math.PI/5)),n=normal(i),m=normal(i+1),at=(point,dir)=>point.map((x,k)=>x+dir[k]*r);
   const p=at(a,n),q=at(a,m),s=at(b,n),t=at(b,m);
   out.push(...vertex(p,n),...vertex(s,n),...vertex(q,m),...vertex(q,m),...vertex(s,n),...vertex(t,m));
   out.push(...vertex(a,axis.map(x=>-x)),...vertex(q,axis.map(x=>-x)),...vertex(p,axis.map(x=>-x)),...vertex(b,axis),...vertex(s,axis),...vertex(t,axis));
  }
 };
 const [a,b]=rail;cylinder(a,b,.017);
 for(const [index,p] of [a,b].entries())if(supports[index]){cylinder([p[0],baseY+.022,p[2]],p,.014);cylinder([p[0],baseY+.015,p[2]],[p[0],baseY+.04,p[2]],.07);}
 return new Float32Array(out);
}

/** Raster fabric with a depth prepass and soft shadows on the existing room. */
export class ClothRenderer{
 constructor(canvas){
  Object.assign(this,{canvas,resources:[],meshes:[],ready:false,destroyed:false});
  this.gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL2 no disponible para las telas.');
  this.lost=event=>{event.preventDefault();this.ready=false;canvas.hidden=true;};
  this.restored=()=>{if(!this.destroyed)try{this.init();}catch(error){this.error=error;}};
  canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);
  try{this.init();}catch(error){this.destroy();throw error;}
 }
 resource(type,value){this.resources.push([type,value]);return value;}
 init(){
  const g=this.gl;this.resources=[];this.meshes=[];this.meshKey=null;this.receiverCache=new RoomReceiverCache();
  const makeProgram=(v,f)=>{const p=program(g,v,f);this.resource('Program',p.program);return p;};
  this.fabric=makeProgram(CLOTH_VERTEX,CLOTH_FRAGMENT);this.shadow=makeProgram(CLOTH_VERTEX,SHADOW_FRAGMENT);this.receiver=makeProgram(RECEIVER_VERTEX,RECEIVER_FRAGMENT);
  this.effectsCache=new SurfaceEffectsCache();this.effects=makeProgram(CLOTH_VERTEX,SURFACE_EFFECT_FRAGMENT);this.effectMeshes=Array.from({length:4},(_,i)=>({...this.makeBuffer(),kind:i+1}));
  this.receivers=Array.from({length:3},()=>this.makeBuffer(false));
  this.shadowSize=512;this.shadowTexture=this.resource('Texture',g.createTexture());g.bindTexture(g.TEXTURE_2D,this.shadowTexture);
  g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);
  for(const p of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,p,g.NEAREST);
  for(const p of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,p,g.CLAMP_TO_EDGE);
  this.shadowTarget=this.resource('Framebuffer',g.createFramebuffer());g.bindFramebuffer(g.FRAMEBUFFER,this.shadowTarget);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.shadowTexture,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Sombras de telas no disponibles.');
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.clearColor(0,0,0,0);this.ready=true;this.error=null;
 }
 makeBuffer(mesh=true){
  const g=this.gl,vao=this.resource('VertexArray',g.createVertexArray()),buffer=this.resource('Buffer',g.createBuffer());g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buffer);
  for(const [location,size,offset] of mesh?[[0,3,0],[1,3,12],[2,2,24]]:[[0,3,0]]){g.enableVertexAttribArray(location);g.vertexAttribPointer(location,size,g.FLOAT,false,mesh?32:12,offset);}
  return {vao,buffer,count:0};
 }
 releaseMeshes(){
  const g=this.gl,release=(type,value)=>{g['delete'+type](value);const i=this.resources.findIndex(r=>r[1]===value);if(i>=0)this.resources.splice(i,1);};
  for(const mesh of this.meshes)for(const slot of [mesh.fabric,mesh.rail]){release('VertexArray',slot.vao);release('Buffer',slot.buffer);if(slot.indices)release('Buffer',slot.indices);}
  this.meshes=[];
 }
 updateMeshes(frames){
  const g=this.gl,key=JSON.stringify(frames.map(f=>[f.id,f.positions.length,f.indices.length,f.rail,f.supports,f.baseY]));
  if(key!==this.meshKey){
   this.releaseMeshes();this.meshKey=key;
   this.meshes=frames.map(f=>{
    const fabric=this.makeBuffer(),rail=this.makeBuffer(),vertices=railVertices(f.rail,f.supports,f.baseY);
    g.bindBuffer(g.ARRAY_BUFFER,rail.buffer);g.bufferData(g.ARRAY_BUFFER,vertices,g.STATIC_DRAW);rail.count=vertices.length/8;
    g.bindVertexArray(fabric.vao);fabric.indices=this.resource('Buffer',g.createBuffer());g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,fabric.indices);g.bufferData(g.ELEMENT_ARRAY_BUFFER,f.indices,g.STATIC_DRAW);fabric.count=f.indices.length;
    return {fabric,rail,vertices:new Float32Array(f.positions.length/3*8)};
   });
  }
  frames.forEach((f,i)=>{
   const mesh=this.meshes[i],v=mesh.vertices;
   for(let j=0;j<f.positions.length/3;j++){v.set(f.positions.subarray(j*3,j*3+3),j*8);v.set(f.normals.subarray(j*3,j*3+3),j*8+3);v.set(f.uvs.subarray(j*2,j*2+2),j*8+6);}
   mesh.color=f.color;g.bindBuffer(g.ARRAY_BUFFER,mesh.fabric.buffer);g.bufferData(g.ARRAY_BUFFER,v,g.DYNAMIC_DRAW);
  });
 }
 setCamera(entry,camera){
  const g=this.gl,u=entry.u;g.useProgram(entry.program);
  for(const [name,key] of [['uOrigin','origin'],['uRight','right'],['uUp','up'],['uForward','forward'],['uCamera','origin']])g.uniform3fv(u[name],camera[key]);
  g.uniform2f(u.uAspectFov,camera.renderWidth/camera.renderHeight,camera.fov);g.uniform2fv(u.uJitter,camera.jitter);
 }
 uploadReceiver(index,vertices){const g=this.gl,r=this.receivers[index];g.bindBuffer(g.ARRAY_BUFFER,r.buffer);g.bufferData(g.ARRAY_BUFFER,vertices,g.DYNAMIC_DRAW);r.count=vertices.length/3;}
 drawMeshes(entry,shadow){
  const g=this.gl;g.useProgram(entry.program);g.uniform1i(entry.u.uShadowPass,shadow);
  for(const mesh of this.meshes){
   g.uniform1i(entry.u.uSupport,1);g.uniform3fv(entry.u.uColor,[.15,.105,.065]);g.bindVertexArray(mesh.rail.vao);g.drawArrays(g.TRIANGLES,0,mesh.rail.count);
   g.uniform1i(entry.u.uSupport,0);g.uniform3fv(entry.u.uColor,mesh.color);g.bindVertexArray(mesh.fabric.vao);g.drawElements(g.TRIANGLES,mesh.fabric.count,g.UNSIGNED_SHORT,0);
  }
 }
 uploadEffects(batches){
  const g=this.gl;
  for(const mesh of this.effectMeshes){const batch=batches.find(b=>b.kind===mesh.kind);mesh.count=batch?batch.vertices.length/8:0;if(batch){g.bindBuffer(g.ARRAY_BUFFER,mesh.buffer);g.bufferData(g.ARRAY_BUFFER,batch.vertices,g.DYNAMIC_DRAW);}}
 }
 drawEffects(entry,shadow=false){
  const g=this.gl;g.useProgram(entry.program);g.uniform1i(entry.u.uShadowPass,shadow);
  for(const mesh of this.effectMeshes){
   if(!mesh.count||(shadow&&mesh.kind>=3))continue;
   g.uniform1i(entry.u.uEffect,mesh.kind);g.uniform3fv(entry.u.uColor,mesh.kind%2?[.08,.54,.86]:[.48,.06,.72]);
   g.bindVertexArray(mesh.vao);g.drawArrays(g.TRIANGLES,0,mesh.count);
  }
 }
 render(frames,camera,scene,settings={},reduced=false){
  if(!this.ready||this.destroyed||this.gl.isContextLost())return false;
  const g=this.gl,dpr=Math.min(globalThis.devicePixelRatio||1,settings.quality==='low'?1:1.5),width=Math.max(1,Math.round(camera.width*dpr)),height=Math.max(1,Math.round(camera.height*dpr));
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,width,height);g.depthMask(true);g.colorMask(true,true,true,true);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  const effects=this.effectsCache.update(scene.state,{reduced,enabled:settings.effects!==false,transition:reduced?null:scene.transition});if(effects.changed)this.uploadEffects(effects.batches);if(!frames.length&&!effects.batches.length){this.clear();return true;}
  this.updateMeshes(frames);
  g.disable(g.BLEND);g.depthFunc(g.LESS);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowTarget);g.viewport(0,0,this.shadowSize,this.shadowSize);g.clear(g.DEPTH_BUFFER_BIT);this.drawMeshes(this.shadow,true);this.drawEffects(this.shadow,true);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,width,height);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.shadowTexture);
  this.setCamera(this.receiver,camera);g.uniform1i(this.receiver.u.uShadow,0);
  const cached=this.receiverCache.update(scene.room,scene.state.time,scene.state.bumperJelly,scene.state.jumpJelly);
  if(cached.staticChanged)this.uploadReceiver(0,cached.staticVertices);if(cached.movingChanged)this.uploadReceiver(2,cached.movingVertices);
  // Hands receive cloth depth too, but fabric must not pre-occlude its own mesh.
  this.uploadReceiver(1,dynamicReceivers(scene.state,scene.target,false,scene.transition));
  g.colorMask(false,false,false,false);
  for(const r of this.receivers){g.bindVertexArray(r.vao);g.drawArrays(g.TRIANGLES,0,r.count);}
  g.colorMask(true,true,true,true);g.depthFunc(g.LEQUAL);g.depthMask(false);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
  for(const r of this.receivers){g.bindVertexArray(r.vao);g.drawArrays(g.TRIANGLES,0,r.count);}
  g.depthMask(true);g.depthFunc(g.LESS);g.disable(g.BLEND);this.setCamera(this.fabric,camera);g.uniform1i(this.fabric.u.uShadow,0);g.uniform1f(this.fabric.u.uDetail,reduced||settings.effects===false?.3:1);
  this.drawMeshes(this.fabric,false);
  this.setCamera(this.effects,camera);g.enable(g.BLEND);g.depthMask(false);this.drawEffects(this.effects);g.depthMask(true);g.disable(g.BLEND);
  g.bindVertexArray(null);this.canvas.hidden=false;return true;
 }
 clear(){this.canvas.hidden=true;}
 destroy(){
  if(this.destroyed)return;this.destroyed=true;this.ready=false;this.canvas.hidden=true;
  this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);
  for(const [type,value] of this.resources)this.gl['delete'+type](value);this.resources=[];this.meshes=[];
 }
}
