import {HandRig} from './hand-rig.js';
import {RoomReceiverCache,dynamicReceivers} from './hand-room.js';
import {HAND_VERTEX,HAND_FRAGMENT,SHADOW_FRAGMENT,RECEIVER_VERTEX,RECEIVER_FRAGMENT} from './hand-shaders.js';

const ASSETS=new URL('../assets/hands/',import.meta.url);
function decodeMesh(buffer){
 const d=new DataView(buffer),count=d.getUint32(4,true),indices=d.getUint32(8,true),stride=d.getUint32(12,true);
 if(d.getUint32(0,true)!==0x444e4148||stride!==18||buffer.byteLength!==16+count*72+indices*4)throw Error('Malla de manos inválida.');
 return {vertices:new Float32Array(buffer,16,count*18),indices:new Uint32Array(buffer,16+count*72,indices)};
}
function program(gl,vertex,fragment){
 const p=gl.createProgram(),shaders=[];
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
   gl.attachShader(p,shader);
  }
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  const names=['uBones[0]','uShadowPass','uOrigin','uRight','uUp','uForward','uAspectFov','uJitter','uCamera','uDetail','uShadow','uSkin','uAlpha','uMaterial','uQuality','uInteraction'];
  return {program:p,u:Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]))};
 }catch(error){gl.deleteProgram(p);throw error;}
 finally{for(const shader of shaders)gl.deleteShader(shader);}
}

/** Separate raster layer, aligned with the room bitmap. No extra raymarch or AI. */
export class AtelierHandRenderer{
 static async create(canvas,{signal}={}){
  const [meshResponse,detailResponse]=await Promise.all([
   fetch(new URL('atelier-v03.bin',ASSETS),{signal}),
   fetch(new URL('atelier-detail.png',ASSETS),{signal})
  ]);
  if(!meshResponse.ok||!detailResponse.ok)throw Error('No se pudieron cargar las manos 3D.');
  const [buffer,blob]=await Promise.all([meshResponse.arrayBuffer(),detailResponse.blob()]);
  const mesh=decodeMesh(buffer),detail=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
  if(signal?.aborted){detail.close();throw new DOMException('Cancelado','AbortError');}
  try{return new AtelierHandRenderer(canvas,mesh,detail);}catch(error){detail.close();throw error;}
 }
 constructor(canvas,mesh,detail){
  Object.assign(this,{canvas,mesh,detail,rigs:new Map(),ready:false,destroyed:false,resources:[]});
  this.gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL2 no disponible.');
  this.lost=e=>{e.preventDefault();this.ready=false;this.canvas.hidden=true;};
  this.restored=()=>{if(!this.destroyed)try{this.init();}catch(error){this.error=error;}};
  canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);
  try{this.init();}catch(error){this.destroy();throw error;}
 }
 resource(type,value){this.resources.push([type,value]);return value;}
 init(){
  const g=this.gl;this.resources=[];this.receiverCache=new RoomReceiverCache();
  const makeProgram=(v,f)=>{const p=program(g,v,f);this.resource('Program',p.program);return p;};
  this.skin=makeProgram(HAND_VERTEX,HAND_FRAGMENT);this.shadow=makeProgram(HAND_VERTEX,SHADOW_FRAGMENT);this.receiver=makeProgram(RECEIVER_VERTEX,RECEIVER_FRAGMENT);
  this.meshVAO=this.resource('VertexArray',g.createVertexArray());g.bindVertexArray(this.meshVAO);
  const vertices=this.resource('Buffer',g.createBuffer());g.bindBuffer(g.ARRAY_BUFFER,vertices);g.bufferData(g.ARRAY_BUFFER,this.mesh.vertices,g.STATIC_DRAW);
  for(const [location,size,offset] of [[0,3,0],[1,3,12],[2,4,24],[3,4,40],[4,4,56]]){
   g.enableVertexAttribArray(location);g.vertexAttribPointer(location,size,g.FLOAT,false,72,offset);
  }
  const indices=this.resource('Buffer',g.createBuffer());g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,indices);g.bufferData(g.ELEMENT_ARRAY_BUFFER,this.mesh.indices,g.STATIC_DRAW);
  this.receivers=Array.from({length:3},()=>{
   const vao=this.resource('VertexArray',g.createVertexArray()),buffer=this.resource('Buffer',g.createBuffer());
   g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buffer);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,12,0);
   return {vao,buffer,count:0};
  });
  this.detailTexture=this.resource('Texture',g.createTexture());g.bindTexture(g.TEXTURE_2D,this.detailTexture);
  g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,this.detail);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.generateMipmap(g.TEXTURE_2D);
  this.shadowSize=1024;this.shadowTexture=this.resource('Texture',g.createTexture());g.bindTexture(g.TEXTURE_2D,this.shadowTexture);
  g.texImage2D(g.TEXTURE_2D,0,g.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,g.DEPTH_COMPONENT,g.UNSIGNED_INT,null);
  for(const param of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,param,g.NEAREST);
  for(const param of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,param,g.CLAMP_TO_EDGE);
  this.shadowTarget=this.resource('Framebuffer',g.createFramebuffer());g.bindFramebuffer(g.FRAMEBUFFER,this.shadowTarget);
  g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.shadowTexture,0);
  g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Sombras de manos no disponibles.');
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.bindVertexArray(null);
  g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.clearColor(0,0,0,0);this.ready=true;this.error=null;
 }
 setCamera(entry,camera){
  const g=this.gl,u=entry.u;g.useProgram(entry.program);
  for(const [name,key] of [['uOrigin','origin'],['uRight','right'],['uUp','up'],['uForward','forward'],['uCamera','origin']])g.uniform3fv(u[name],camera[key]);
  g.uniform2f(u.uAspectFov,camera.renderWidth/camera.renderHeight,camera.fov);
  g.uniform2fv(u.uJitter,camera.jitter);
 }
 uploadReceiver(index,vertices){
  const g=this.gl,r=this.receivers[index];g.bindBuffer(g.ARRAY_BUFFER,r.buffer);g.bufferData(g.ARRAY_BUFFER,vertices,g.DYNAMIC_DRAW);r.count=vertices.length/3;
 }
 render(hands,camera,scene,settings,grab){
  if(!this.ready||this.destroyed||this.gl.isContextLost())return false;
  const g=this.gl,dpr=Math.min(globalThis.devicePixelRatio||1,1.5),width=Math.round(camera.width*dpr),height=Math.round(camera.height*dpr);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  const active=[],ids=new Set();
  for(const hand of hands.slice(0,2)){
   if(hand.joints?.length!==21||!hand.joints.every(p=>[p.x,p.y,p.z].every(Number.isFinite)))continue;
   ids.add(hand.id);let slot=this.rigs.get(hand.id);
   if(!slot){slot={rig:new HandRig(),pose:new Float32Array(63)};this.rigs.set(hand.id,slot);}
   hand.joints.forEach((p,i)=>slot.pose.set([p.x,p.y,p.z],i*3));
   // Tracking maps raw image X,Y,Z with a mirrored display. One reflection only.
   const label=hand.label||hand.id.split(':')[0];
   slot.rig.update(slot.pose,label==='Left'?-1:1);active.push({hand,...slot});
  }
  for(const id of this.rigs.keys())if(!ids.has(id))this.rigs.delete(id);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,width,height);g.depthMask(true);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  if(!active.length){this.canvas.hidden=true;return true;}
  const drawHands=(entry,shadow)=>{
   g.useProgram(entry.program);g.bindVertexArray(this.meshVAO);g.uniform1i(entry.u.uShadowPass,shadow);
   for(const slot of active){
    g.uniformMatrix4fv(entry.u['uBones[0]'],false,slot.rig.matrices);
    if(!shadow)g.uniform1f(entry.u.uInteraction,slot.hand.id===grab?1:slot.hand.pinch.active?.65:0);
    g.drawElements(g.TRIANGLES,this.mesh.indices.length,g.UNSIGNED_INT,0);
   }
  };
  g.disable(g.BLEND);g.depthFunc(g.LESS);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowTarget);g.viewport(0,0,this.shadowSize,this.shadowSize);
  g.clear(g.DEPTH_BUFFER_BIT);drawHands(this.shadow,true);
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,width,height);
  g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.shadowTexture);
  this.setCamera(this.receiver,camera);g.uniform1i(this.receiver.u.uShadow,1);
  const cached=this.receiverCache.update(scene.room,scene.state.time,scene.state.bumperJelly);
  if(cached.staticChanged)this.uploadReceiver(0,cached.staticVertices);
  if(cached.movingChanged)this.uploadReceiver(2,cached.movingVertices);
  this.uploadReceiver(1,dynamicReceivers(scene.state,scene.target));
  // Resolve the nearest room surface before blending, so a rear wall/floor
  // shadow cannot accumulate through foreground geometry.
  g.colorMask(false,false,false,false);
  for(const r of this.receivers){g.bindVertexArray(r.vao);g.drawArrays(g.TRIANGLES,0,r.count);}
  g.colorMask(true,true,true,true);g.depthFunc(g.LEQUAL);g.depthMask(false);
  g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
  for(const r of this.receivers){g.bindVertexArray(r.vao);g.drawArrays(g.TRIANGLES,0,r.count);}
  g.depthMask(true);g.depthFunc(g.LESS);
  this.setCamera(this.skin,camera);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.detailTexture);
  const u=this.skin.u;g.uniform1i(u.uDetail,0);g.uniform1i(u.uShadow,1);g.uniform3f(u.uSkin,.61,.36,.23);
  g.uniform1f(u.uAlpha,1);g.uniform1i(u.uMaterial,0);g.uniform1i(u.uQuality,settings.quality==='low'?1:2);
  drawHands(this.skin,false);g.bindVertexArray(null);this.canvas.hidden=false;return true;
 }
 clear(){this.canvas.hidden=true;this.rigs.clear();}
 destroy(){
  if(this.destroyed)return;this.destroyed=true;this.ready=false;this.canvas.hidden=true;
  this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);
  for(const [type,value] of this.resources)this.gl['delete'+type](value);
  this.resources=[];this.detail.close();this.rigs.clear();
 }
}
