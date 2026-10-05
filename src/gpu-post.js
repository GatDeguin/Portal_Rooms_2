export const FULLSCREEN_WGSL=`struct VertexOutput { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertexMain(@builtin(vertex_index) index:u32)->VertexOutput {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[index];
 return VertexOutput(vec4f(p,0,1),p*.5+.5);
}`;
export const RESOLVE_WGSL=`
@group(0) @binding(0) var current:texture_2d<f32>;
@group(0) @binding(1) var history:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@group(0) @binding(3) var<uniform> params:vec4f;
fn luminance(c:vec3f)->f32 {return dot(c,vec3f(.2126,.7152,.0722));}
fn radiance(uv:vec2f)->vec3f {return textureSampleLevel(current,linearSampler,uv,0).rgb;}
fn aa(uv:vec2f)->vec3f {
 let pixel=1./vec2f(textureDimensions(current));let c=radiance(uv);
 let nw=radiance(uv+pixel*vec2f(-1,-1));let ne=radiance(uv+pixel*vec2f(1,-1));
 let sw=radiance(uv+pixel*vec2f(-1,1));let se=radiance(uv+pixel*vec2f(1,1));
 let l=vec4f(luminance(nw),luminance(ne),luminance(sw),luminance(se));let lc=luminance(c);
 let lo=min(lc,min(min(l.x,l.y),min(l.z,l.w)));let hi=max(lc,max(max(l.x,l.y),max(l.z,l.w)));
 if(hi-lo<max(.025,hi*.10)){return c;}
 var direction=vec2f(-(l.x+l.y-l.z-l.w),l.x+l.z-l.y-l.w);
 let reduction=max((l.x+l.y+l.z+l.w)*.03125,.0078125);
 direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduction),vec2f(-4),vec2f(4))*pixel;
 let a=(radiance(uv+direction*(-1./6.))+radiance(uv+direction*(1./6.)))*.5;
 let b=a*.5+(radiance(uv+direction*(-.5))+radiance(uv+direction*.5))*.25;
 let lb=luminance(b);return select(b,a,lb<lo||lb>hi);
}
fn aces(c:vec3f)->vec3f {return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),vec3f(0),vec3f(1));}
struct ResolveOutput {@location(0) linear:vec4f,@location(1) display:vec4f};
@fragment fn resolve(@builtin(position) position:vec4f)->ResolveOutput {
 let uv=position.xy/vec2f(textureDimensions(current));var c=radiance(uv);
 if(params.w>.5){c=aa(uv);}
 if(params.y>.5&&params.x<1.){c=mix(textureSampleLevel(history,linearSampler,uv,0).rgb,c,params.x);}
 let mapped=pow(aces(max(c*params.z,vec3f(0))),vec3f(1./2.2));
 return ResolveOutput(vec4f(c,1),vec4f(mapped,1));
}`;
export const NOISE_WGSL=`
fn hash(p0:vec2f)->f32{let p=p0-floor(p0/251.)*251.;return fract(17.*fract(p.x*.1031+p.y*.11369)*fract(p.y*.13787+p.x*.09987));}
@fragment fn noise(@builtin(position) p:vec4f)->@location(0) vec4f {let value=hash(floor(p.xy));return vec4f(vec3f(value),1);}`;
