export const RELIEF_NOISE_VERTEX=`attribute vec2 aPos;
void main(){gl_Position=vec4(aPos,0.,1.);}`;
export const RELIEF_NOISE_FRAGMENT=`precision highp float;
float hash(vec2 p){p=mod(p,251.);return fract(17.*fract(p.x*.1031+p.y*.11369)*fract(p.y*.13787+p.x*.09987));}
void main(){float value=hash(floor(gl_FragCoord.xy));gl_FragColor=vec4(vec3(value),1.);}`;

/** Bake the backend's own GLSL lattice once. The explicit sources allow test harness serialization. */
export function createReliefNoiseTexture(gl,sources={vertex:RELIEF_NOISE_VERTEX,fragment:RELIEF_NOISE_FRAGMENT}){
  const state={framebuffer:gl.getParameter(gl.FRAMEBUFFER_BINDING),viewport:gl.getParameter(gl.VIEWPORT),program:gl.getParameter(gl.CURRENT_PROGRAM),buffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),unit:gl.getParameter(gl.ACTIVE_TEXTURE),mask:gl.getParameter(gl.COLOR_WRITEMASK)};
  const attribute={enabled:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_ENABLED)===true,buffer:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),size:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(0,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(0,gl.VERTEX_ATTRIB_ARRAY_POINTER)};
  const capabilities=[gl.BLEND,gl.DEPTH_TEST,gl.SCISSOR_TEST,gl.CULL_FACE,gl.STENCIL_TEST,gl.DITHER].map(cap=>[cap,gl.isEnabled(cap)===true]);
  let texture=null,framebuffer=null,buffer=null,program=null,vertex=null,fragment=null,retained=false;
  gl.activeTexture(gl.TEXTURE0);const previousTexture=gl.getParameter(gl.TEXTURE_BINDING_2D);
  try{
    texture=gl.createTexture();framebuffer=gl.createFramebuffer();buffer=gl.createBuffer();program=gl.createProgram();vertex=gl.createShader(gl.VERTEX_SHADER);fragment=gl.createShader(gl.FRAGMENT_SHADER);
    if(!texture||!framebuffer||!buffer||!program||!vertex||!fragment)throw new Error('No hay recursos para preparar el relieve.');
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,256,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('No se pudo preparar la textura de relieve.');
    gl.shaderSource(vertex,sources.vertex);gl.shaderSource(fragment,sources.fragment);gl.compileShader(vertex);gl.compileShader(fragment);
    if(!gl.getShaderParameter(vertex,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(vertex)||'No se pudo preparar el relieve.');
    if(!gl.getShaderParameter(fragment,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(fragment)||'No se pudo preparar el relieve.');
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'aPos');gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'No se pudo preparar el relieve.');
    for(const [cap] of capabilities)gl.disable(cap);gl.colorMask(true,true,true,true);
    gl.viewport(0,0,256,256);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,3);retained=true;return texture;
  }finally{
    gl.bindFramebuffer(gl.FRAMEBUFFER,state.framebuffer);if(state.viewport?.length===4)gl.viewport(...state.viewport);gl.useProgram(state.program);
    if(attribute.buffer){gl.bindBuffer(gl.ARRAY_BUFFER,attribute.buffer);gl.vertexAttribPointer(0,attribute.size,attribute.type,attribute.normalized,attribute.stride,attribute.offset);}
    if(attribute.enabled)gl.enableVertexAttribArray(0);else gl.disableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER,state.buffer);gl.bindTexture(gl.TEXTURE_2D,previousTexture);gl.activeTexture(state.unit);
    if(state.mask?.length===4)gl.colorMask(...state.mask);for(const [cap,enabled] of capabilities){if(enabled)gl.enable(cap);else gl.disable(cap);}
    if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture&&!retained)gl.deleteTexture(texture);
  }
}
