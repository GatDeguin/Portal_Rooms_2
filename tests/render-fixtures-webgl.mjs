#!/usr/bin/env node
// Test-only synchronous GPU readback. Never import this into production rendering.
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createReliefNoiseTexture} from '../src/relief-noise.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),options={output:join(ROOT,'test-results','webgl'),benchmark:0,timeoutMs:180000};
for(let i=0;i<args.length;i++){
 const key=args[i];
 if(key==='--help'){console.log('node tests/render-fixtures-webgl.mjs [--packet JSON] [--output DIR] [--benchmark N] [--draw-mediump] [--timeout-ms N]\nUses PLAYWRIGHT_MODULE and CHROMIUM_PATH; software ANGLE SwiftShader by default. Pixel assertions: python tests/shaders_egl.py --webgl');process.exit(0);}
 if(key==='--draw-mediump'){options.drawMediump=true;continue;}
 if(!['--packet','--output','--benchmark','--timeout-ms'].includes(key)||!args[i+1])throw Error('Invalid argument '+key);
 const value=args[++i];options[{'--packet':'packet','--output':'output','--benchmark':'benchmark','--timeout-ms':'timeoutMs'}[key]]=value;
}
options.benchmark=Number(options.benchmark);options.timeoutMs=Number(options.timeoutMs);
if(!Number.isInteger(options.benchmark)||options.benchmark<0||!(options.timeoutMs>=1000))throw Error('Invalid benchmark count or timeout');
const output=resolve(options.output);mkdirSync(output,{recursive:true});
let packet;
if(options.packet)packet=JSON.parse(readFileSync(resolve(options.packet),'utf8'));
else {const exported=spawnSync(process.execPath,['tests/export-render-fixtures.mjs',...(options.drawMediump?['--draw-mediump']:[])],{cwd:ROOT,encoding:'utf8',maxBuffer:128*1024*1024});if(exported.status!==0)throw Error(exported.stderr||'Fixture exporter failed');packet=JSON.parse(exported.stdout);}
if(!packet.fixtures?.length||!packet.fragments||!packet.vertex)throw Error('Invalid fixture packet');
// PNG encoding from unpremultiplied RGBA preserves diagnostic alpha and hidden RGB.
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(name,data){const type=Buffer.from(name),payload=Buffer.concat([type,data]);let crc=0xffffffff;for(const b of payload)crc=crcTable[(crc^b)&255]^(crc>>>8);const length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([length,payload,sum]);}
function png(pixels,width,height){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const stride=width*4,scan=Buffer.alloc((stride+1)*height);for(let y=0;y<height;y++)pixels.copy(scan,y*(stride+1)+1,(height-1-y)*stride,(height-y)*stride);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
function stddev(pixels){const sums=[0,0,0],squares=[0,0,0],n=pixels.length/4;for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++){sums[c]+=pixels[i+c];squares[c]+=pixels[i+c]**2;}return sums.map((s,c)=>Math.sqrt(Math.max(0,squares[c]/n-(s/n)**2)));}
const require=createRequire(import.meta.url),playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browserPath=process.env.CHROMIUM_PATH||(process.platform==='win32'&&existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
let browser,browserServer,watchdog;const report={status:'running',backend:'Chromium WebGL via ANGLE SwiftShader (software; not physical GPU)',software:true,compiled_profiles:[],compiled_surface_profiles:[],compile_link_ms:{},surface_compile_link_ms:{},identical_pixel_checks:packet.comparisons??[],draws:[]};
const save=()=>writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browserServer=await playwright.chromium.launchServer({executablePath:browserPath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 browser=await playwright.chromium.connect(browserServer.wsEndpoint());
 const page=await browser.newPage();await page.setContent('<canvas id="fixture"></canvas>');
 async function bounded(label,fn){report.active_phase=label;save();const timer=new Promise((_,reject)=>{watchdog=setTimeout(()=>reject(Error('Timed out during '+label+' after '+options.timeoutMs+'ms')),options.timeoutMs);});try{return await Promise.race([fn(),timer]);}finally{clearTimeout(watchdog);}}
 const backend=await bounded('context',()=>page.evaluate(({factory,sources})=>{const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');gl.getExtension('OES_standard_derivatives');const debug=gl.getExtension('WEBGL_debug_renderer_info');if(sources){const texture=new Function('return ('+factory+')')()(gl,sources);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);}window.fixtureGL={canvas,gl,programs:new Map(),sources:new Map()};return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),version:gl.getParameter(gl.VERSION),extensions:gl.getSupportedExtensions()};},{factory:createReliefNoiseTexture.toString(),sources:packet.reliefNoise}));Object.assign(report,backend);report.software=/swiftshader|llvmpipe|software/i.test(report.renderer);report.backend='Chromium WebGL via '+report.renderer+(report.software?' (software; not physical GPU)':'');console.log(report.renderer,report.version);
 const profiles=[...Object.entries(packet.fragments).map(([tier,source])=>({tier,source,surface:false})),...Object.entries(packet.surfaceFragments??{}).map(([tier,source])=>({tier,source,surface:true}))];
 for(const {tier,source,surface} of profiles){
  const programKey=surface?'surface:'+tier:tier;
  const ms=await bounded('compile:'+programKey,()=>page.evaluate(({tier,source,vertex})=>{const {gl,programs,sources}=window.fixtureGL,start=performance.now();if(sources.has(source)){programs.set(tier,sources.get(source));return 0;}const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(error);}return shader;};const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,source),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));const entry={program,uniforms:new Map()};programs.set(tier,entry);sources.set(source,entry);return performance.now()-start;},{tier:programKey,source,vertex:packet.vertex}));(surface?report.compiled_surface_profiles:report.compiled_profiles).push(tier);(surface?report.surface_compile_link_ms:report.compile_link_ms)[tier]=ms;save();console.log('PASS compile/link',programKey);
 }
 for(const fixture of packet.fixtures){
  if(!/^[A-Za-z0-9_.-]+$/.test(fixture.name)||fixture.name==='.'||fixture.name==='..')throw Error('Unsafe fixture name');
  const rendered=await bounded('draw:'+fixture.name,()=>page.evaluate(({item,warm})=>{
   const state=window.fixtureGL,{canvas,gl,programs}=state,entry=programs.get(item.tier),surface=programs.get('surface:'+item.tier);
   if(!entry)throw Error('Missing program '+item.tier);
   canvas.width=item.width;canvas.height=item.height;gl.viewport(0,0,item.width,item.height);
   if(!state.quad){state.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,state.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);}else gl.bindBuffer(gl.ARRAY_BUFFER,state.quad);
   const outputFbo=gl.getParameter(gl.FRAMEBUFFER_BINDING);
   if(surface){
    if(!state.surfaceTarget)state.surfaceTarget={texture:gl.createTexture(),fbo:gl.createFramebuffer()};
    const target=state.surfaceTarget;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,target.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(target.width!==item.width||target.height!==item.height){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,item.width,item.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);target.width=item.width;target.height=item.height;}
    gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target.texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete surface framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER,outputFbo);gl.activeTexture(gl.TEXTURE0);
   }
   const bind=programEntry=>{
    gl.useProgram(programEntry.program);gl.bindBuffer(gl.ARRAY_BUFFER,state.quad);
    const position=gl.getAttribLocation(programEntry.program,'aPos');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const [name,command] of Object.entries(item.uniforms)){
     if(!['uniform1f','uniform2f','uniform4f','uniform1i'].includes(command.kind))throw Error('Invalid uniform command');
     if(!programEntry.uniforms.has(name))programEntry.uniforms.set(name,gl.getUniformLocation(programEntry.program,name));
     gl[command.kind](programEntry.uniforms.get(name),...command.args);
    }
    gl.uniform1i(gl.getUniformLocation(programEntry.program,'uReliefNoise'),0);gl.uniform1i(gl.getUniformLocation(programEntry.program,'uSurfaceHits'),1);
   };
   const draw=()=>{
    const start=performance.now(),dither=gl.isEnabled(gl.DITHER);
    if(surface){
     gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,null);
     gl.bindFramebuffer(gl.FRAMEBUFFER,state.surfaceTarget.fbo);gl.disable(gl.DITHER);gl.viewport(0,0,item.width,item.height);
     gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);bind(surface);gl.drawArrays(gl.TRIANGLES,0,3);
     gl.bindFramebuffer(gl.FRAMEBUFFER,outputFbo);if(dither)gl.enable(gl.DITHER);
     gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,state.surfaceTarget.texture);gl.activeTexture(gl.TEXTURE0);
    }
    bind(entry);gl.viewport(0,0,item.width,item.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
    if(gl.getError()!==gl.NO_ERROR)throw Error('GL drawing error '+item.name);if(gl.isContextLost())throw Error('WebGL context lost');return performance.now()-start;
   };
   const first=draw(),times=[];for(let n=0;n<warm;n++)times.push(draw());
   const rgba=new Uint8Array(item.width*item.height*4);gl.readPixels(0,0,item.width,item.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);if(gl.getError()!==gl.NO_ERROR)throw Error('GL readback error '+item.name);
   let binary='';for(let n=0;n<rgba.length;n+=8192)binary+=String.fromCharCode(...rgba.subarray(n,n+8192));
   return {rgba:btoa(binary),first_draw_ms:first,warm_draw_ms:times,surface_pass:!!surface};
  },{item:fixture,warm:options.benchmark}));
  const pixels=Buffer.from(rendered.rgba,'base64'),sorted=[...rendered.warm_draw_ms].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);writeFileSync(join(output,fixture.name+'.png'),png(pixels,fixture.width,fixture.height));report.draws.push({name:fixture.name,size:[fixture.width,fixture.height],surface_pass:rendered.surface_pass,rgb_stddev:stddev(pixels),rgba_sha256:createHash('sha256').update(pixels).digest('hex'),wall_curvature_p99:null,first_draw_ms:rendered.first_draw_ms,warm_draw_ms:rendered.warm_draw_ms,median_draw_ms:sorted.length?(sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2):null});save();console.log('PASS draw/readback',fixture.name);
 }
 // Python adapter applies exactly the shared EGL pixel assertions to these PNGs.
 report.status='rendered';report.assertions='Pending: run shaders_egl.py --webgl for shared pixel assertions';delete report.active_phase;save();console.log(`${report.compiled_profiles.length} shader profiles and ${report.draws.length} frames rendered to ${output}`);
}catch(error){report.status='failed';report.error=error.stack||String(error);save();throw error;}
finally{
 clearTimeout(watchdog);
 if(browserServer){
  let closed=false,closeTimer;
  await Promise.race([browserServer.close().then(()=>{closed=true;}).catch(()=>{}),new Promise(resolve=>{closeTimer=setTimeout(resolve,5000);})]);clearTimeout(closeTimer);
  if(!closed){const child=browserServer.process();if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});else child.kill('SIGKILL');}
 }
}
