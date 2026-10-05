export function glsl300(source,stage='fragment'){
 source=source.replace(/\bsample\b/g,'sceneSample').replace(/^#extension[^\n]*\n/gm,'').replace(/\battribute\b/g,'in').replace(/\bvarying\b/g,stage==='vertex'?'out':'in').replace(/\btexture2D\b/g,'texture');
 if(stage==='fragment')source=source.replace(/\bgl_FragColor\b/g,'fragColor');
 return '#version 300 es\n'+(stage==='fragment'?'precision highp float;\nout vec4 fragColor;\n':'')+source;
}
export function timerBridge(gl){const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)return null;return {TIME_ELAPSED_EXT:ext.TIME_ELAPSED_EXT,GPU_DISJOINT_EXT:ext.GPU_DISJOINT_EXT,QUERY_RESULT_AVAILABLE_EXT:gl.QUERY_RESULT_AVAILABLE,QUERY_RESULT_EXT:gl.QUERY_RESULT,createQueryEXT:()=>gl.createQuery(),deleteQueryEXT:q=>gl.deleteQuery(q),beginQueryEXT:(target,q)=>gl.beginQuery(target,q),endQueryEXT:target=>gl.endQuery(target),getQueryObjectEXT:(q,name)=>gl.getQueryParameter(q,name)};}
