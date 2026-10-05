import {fragmentShader} from '../src/shaders.js';
/** Adapt syntax/bindings only. Scene geometry and shading remain in shaders.js. */
export function vulkanShader(tier,pass){
 let source=fragmentShader(tier,'highp',{derivatives:true,pass,hdr:true});const uniforms=[];
 source=source.replace(/^#extension[^\n]*\n/gm,'').replace(/^precision[^\n]*\n/gm,'').replace('varying vec2 vUv;','layout(location=0) in vec2 vUv;\nlayout(location=0) out vec4 fragColor;');
 source=source.replace(/uniform\s+(float|vec2|vec4)\s+([^;]+);/g,(_,type,names)=>{for(const name of names.split(',').map(s=>s.trim()))uniforms.push({name,type});return '';});
 source=source.replace(/uniform sampler2D ([^;]+);/g,(_,names)=>names.split(',').map(raw=>{const name=raw.trim(),bind=name==='uReliefNoise'?1:3;return `layout(set=0,binding=${bind}) uniform texture2D ${name}Texture;\nlayout(set=0,binding=${bind+1}) uniform sampler ${name}Sampler;\n#define ${name} sampler2D(${name}Texture,${name}Sampler)`;}).join('\n'));
 for(const {name,type} of uniforms)source=source.replace(new RegExp('\\b'+name+'\\b','g'),`uniforms.${name}${type==='float'?'.x':type==='vec2'?'.xy':''}`);
 source='#version 450\nlayout(set=0,binding=0,std140) uniform SceneUniforms {\n'+uniforms.map(({name})=>`vec4 ${name};`).join('\n')+'\n} uniforms;\n'+source;
 // WebGPU fragment positions use a top origin; camera and scene keep GL's bottom origin.
 source=source.replaceAll('gl_FragCoord.xy','vec2(gl_FragCoord.x,uniforms.uRes.y-gl_FragCoord.y)');
 // Surface texture rows follow WebGPU coordinates; do not invert a second time.
 source=source.replace(/texture2D\(uSurfaceHits,[^;]+\);/,'textureLod(uSurfaceHits,gl_FragCoord.xy/uniforms.uRes.xy,0.);');
 // Relief uses a mip-free LUT, so explicit level zero avoids derivative restrictions inside material branches.
 source=source.replace(/texture2D\(uReliefNoise,([^;]+?)\)\.r/g,'textureLod(uReliefNoise,$1,0.).r');
 source=source.replaceAll('texture2D(','texture(').replaceAll('gl_FragColor','fragColor').replace(/\bsample\b/g,'sceneSample');
 return {source,uniforms};
}
