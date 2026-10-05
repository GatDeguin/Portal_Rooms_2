import {chromium,CHROME_PATH} from './helpers/browser-runtime.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:CHROME_PATH,headless:true,args:['--use-angle=d3d11']});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto((process.env.PORTAL_TEST_URL??'http://127.0.0.1:8080')+'/tests/photoreal-host.html');
const data=await page.evaluate(async()=>{const gl=document.createElement('canvas').getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info'),adapter=await navigator.gpu?.requestAdapter();return {date:new Date().toISOString(),browser:navigator.userAgent,webgl2:!!gl,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,floatTargets:!!gl?.getExtension('EXT_color_buffer_float'),gpuTimer:!!gl?.getExtension('EXT_disjoint_timer_query_webgl2'),maxDrawBuffers:gl?.getParameter(gl.MAX_DRAW_BUFFERS),webgpu:!!adapter,webgpuInfo:adapter?Object.fromEntries(['vendor','architecture','device','description','isFallbackAdapter'].map(k=>[k,adapter.info?.[k]])):null,webgpuFeatures:adapter?[...adapter.features]:[]};});
mkdirSync('docs/photoreal-evidence',{recursive:true});writeFileSync('docs/photoreal-evidence/capabilities.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
}finally{await browser.close();}
