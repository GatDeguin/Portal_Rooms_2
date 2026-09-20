import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/relief-noise.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
function fixture(){
 const calls=[],created=[],deleted=[],attributes={enabled:true,buffer:{kind:'previous-attribute-buffer'},size:2,type:'FLOAT',normalized:false,stride:8,offset:4};
 const state={framebuffer:{kind:'previous-framebuffer'},viewport:[3,4,500,600],program:{kind:'previous-program'},buffer:{kind:'previous-buffer'},unit:'TEXTURE3',mask:[false,true,false,true],capabilities:{DITHER:true,BLEND:true,DEPTH_TEST:false,SCISSOR_TEST:true,CULL_FACE:false,STENCIL_TEST:false},textures:{TEXTURE0:{kind:'previous-texture-zero'},TEXTURE3:{kind:'previous-texture-three'}}};
 const initial=structuredClone({state,attributes}),flags={fail:false};
 const gl=new Proxy({}, {get:(_,key)=>{
  if(key===key.toUpperCase())return key;
  if(key==='getParameter')return p=>({FRAMEBUFFER_BINDING:state.framebuffer,VIEWPORT:state.viewport,CURRENT_PROGRAM:state.program,ARRAY_BUFFER_BINDING:state.buffer,ACTIVE_TEXTURE:state.unit,TEXTURE_BINDING_2D:state.textures[state.unit],COLOR_WRITEMASK:state.mask}[p]);
  if(key==='isEnabled')return cap=>state.capabilities[cap]===true;
  if(key==='getVertexAttrib')return (i,p)=>({VERTEX_ATTRIB_ARRAY_ENABLED:attributes.enabled,VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:attributes.buffer,VERTEX_ATTRIB_ARRAY_SIZE:attributes.size,VERTEX_ATTRIB_ARRAY_TYPE:attributes.type,VERTEX_ATTRIB_ARRAY_NORMALIZED:attributes.normalized,VERTEX_ATTRIB_ARRAY_STRIDE:attributes.stride}[p]);
  if(key==='getVertexAttribOffset')return ()=>attributes.offset;
  if(key==='getShaderPrecisionFormat')return ()=>({precision:23});
  if(key==='getShaderParameter'||key==='getProgramParameter')return ()=>!flags.fail;
  if(key==='getShaderInfoLog'||key==='getProgramInfoLog')return ()=>'tiny shader failure';
  if(key==='getAttribLocation')return ()=>0;
  if(key==='checkFramebufferStatus')return ()=>'FRAMEBUFFER_COMPLETE';
  if(key.startsWith('create'))return ()=>{const object={kind:key,id:created.length};created.push(object);return object;};
  if(key.startsWith('delete'))return object=>deleted.push(object);
  return (...args)=>{
   calls.push([key,...args]);
   if(key==='bindFramebuffer')state.framebuffer=args[1];if(key==='viewport')state.viewport=args;
   if(key==='enable')state.capabilities[args[0]]=true;if(key==='disable')state.capabilities[args[0]]=false;if(key==='colorMask')state.mask=args;
   if(key==='useProgram')state.program=args[0];if(key==='bindBuffer')state.buffer=args[1];
   if(key==='activeTexture')state.unit=args[0];if(key==='bindTexture')state.textures[state.unit]=args[1];
   if(key==='enableVertexAttribArray')attributes.enabled=true;if(key==='disableVertexAttribArray')attributes.enabled=false;
   if(key==='vertexAttribPointer')Object.assign(attributes,{buffer:state.buffer,size:args[1],type:args[2],normalized:args[3],stride:args[4],offset:args[5]});
  };
 }});return {gl,calls,created,deleted,state,attributes,initial,flags};
}
test('GPU lattice texture is a single 256-square RGBA8 draw with linear clamp and restored caller state',()=>{
 assert.equal(typeof api.createReliefNoiseTexture,'function');const f=fixture(),texture=api.createReliefNoiseTexture(f.gl);
 const upload=f.calls.find(c=>c[0]==='texImage2D');assert.deepEqual(upload.slice(1),['TEXTURE_2D',0,'RGBA',256,256,0,'RGBA','UNSIGNED_BYTE',null]);
 assert.equal(f.calls.filter(c=>c[0]==='drawArrays').length,1);assert.deepEqual(f.calls.filter(c=>c[0]==='texParameteri').map(c=>c.slice(2)),[['TEXTURE_MIN_FILTER','LINEAR'],['TEXTURE_MAG_FILTER','LINEAR'],['TEXTURE_WRAP_S','CLAMP_TO_EDGE'],['TEXTURE_WRAP_T','CLAMP_TO_EDGE']]);
 assert.deepEqual({state:f.state,attributes:f.attributes},f.initial);assert.ok(f.calls.findIndex(c=>c[0]==='disable'&&c[1]==='DITHER')<f.calls.findIndex(c=>c[0]==='drawArrays'));assert.equal(f.deleted.includes(texture),false);assert.equal(f.created.filter(x=>x!==texture).every(x=>f.deleted.includes(x)),true);
 assert.equal(f.calls.some(c=>['finish','readPixels','generateMipmap'].includes(c[0])),false);
});
test('serialized factory is self-contained with supplied shader sources',()=>{
 assert.equal(typeof api.createReliefNoiseTexture,'function');const factory=new Function('return ('+api.createReliefNoiseTexture.toString()+')')(),f=fixture();factory(f.gl,{vertex:api.RELIEF_NOISE_VERTEX,fragment:api.RELIEF_NOISE_FRAGMENT});assert.equal(f.calls.filter(c=>c[0]==='drawArrays').length,1);
});
test('failed lattice initialization releases every resource and restores caller bindings',()=>{
 assert.equal(typeof api.createReliefNoiseTexture,'function');const f=fixture();f.flags.fail=true;assert.throws(()=>api.createReliefNoiseTexture(f.gl),/tiny shader failure/);assert.equal(f.created.every(x=>f.deleted.includes(x)),true);assert.deepEqual({state:f.state,attributes:f.attributes},f.initial);
});
