#!/usr/bin/env python3
"""Compile/render production shaders through EGL, or --webgl in Chromium.
Both backends use identical fixtures and pixel assertions; software timings are not device FPS.
Requires Node and Pillow plus libEGL or Playwright/Chromium for --webgl.
"""
import ctypes as C
from ctypes.util import find_library
import json
import argparse
import hashlib
import time
import statistics
from pathlib import Path
import subprocess
from PIL import Image, ImageStat
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'egl'
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float

def validate_image(item,image):
    """Identical pixel assertions for native EGL and browser WebGL backends."""
    width,height=image.size
    stat=ImageStat.Stat(image.convert('RGB'));assert item.get('diagnostic',False) or max(stat.stddev)>10,f'Uniform/empty render: {item["name"]}'
    p99=None
    if item['name']=='cinematic-01' and (width,height)==(384,240):
        # A blank wall must have smooth irradiance, not shadow-march termination rings.
        rgb=image.convert('RGB');curvature=[]
        for y in range(90,130):
            row=[sum(rgb.getpixel((x,y)))/3 for x in range(300,374)]
            curvature.extend(abs(row[x-1]-2*row[x]+row[x+1]) for x in range(1,len(row)-1))
        curvature.sort();p99=curvature[int(len(curvature)*.99)]
        assert p99<8,f'Shadow banding on a smooth wall: p99 curvature {p99:.2f}'
    if item['name']=='cinematic-materials':
        # A rough wooden floor must not display sharp, broken strip-emitter outlines.
        rgb=image.convert('RGB');floor_curvature=[]
        for x in range(550,610):
            column=[sum(rgb.getpixel((x,y)))/3 for y in range(600,640)]
            floor_curvature.extend(abs(column[y-1]-2*column[y]+column[y+1]) for y in range(1,len(column)-1))
        floor_curvature.sort();p99=floor_curvature[int(len(floor_curvature)*.99)]
        assert p99<8,f'Unfiltered thin emitter in a rough reflection: {p99:.2f}'
        front=[rgb.getpixel((x,y)) for y in range(456,481) for x in range(403,446)]
        assert sum(sum(pixel)/3 for pixel in front)/len(front)>40,'Cube front is underlit in the reference rig'
    return stat,p99

def validate_comparisons(packet,hashes):
    for left,right in packet.get("comparisons",[]):
        assert hashes[left]==hashes[right],f"Static effects-off image changed: {left} vs {right}"
        print("PASS identical pixels",left,right,flush=True)

def render_webgl(args,packet,output):
    packet_path=output/"webgl-packet.json"
    packet_path.write_text(json.dumps(packet),encoding="utf-8")
    subprocess.run(["node","tests/render-fixtures-webgl.mjs","--packet",str(packet_path.resolve()),"--output",str(output.resolve()),"--benchmark",str(args.benchmark)],cwd=ROOT,check=True)
    report_path=output/"report.json"
    report=json.loads(report_path.read_text(encoding="utf-8"))
    try:
        assert report["status"]=="rendered",report
        assert set(report["compiled_profiles"])==set(packet["fragments"]),"Missing compiled shader profiles"
        assert set(report.get("compiled_surface_profiles",[]))==set(packet.get("surfaceFragments",{})),"Missing compiled surface profiles"
        rows={row["name"]:row for row in report["draws"]}
        assert len(rows)==len(packet["fixtures"]),"Missing or duplicate fixture frames"
        hashes={}
        for item in packet["fixtures"]:
            image=Image.open(output/(item["name"]+".png")).convert("RGBA")
            assert image.size==(item["width"],item["height"]),"Fixture dimensions changed"
            stat,p99=validate_image(item,image)
            raw=image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
            hashes[item["name"]]=hashlib.sha256(raw).hexdigest()
            row=rows[item["name"]]
            assert row.get("surface_pass",False)==(item["tier"] in packet.get("surfaceFragments",{})),"Missing production surface pass"
            assert row["rgba_sha256"]==hashes[item["name"]],"PNG altered diagnostic RGBA pixels"
            row["rgb_stddev"]=stat.stddev;row["wall_curvature_p99"]=p99
            print("PASS shared pixel assertions",item["name"],flush=True)
        validate_comparisons(packet,hashes)
        report["status"]="passed";report["assertions"]="Unmodified shared EGL/WebGL pixel assertions"
    except Exception as error:
        report["status"]="failed";report["error"]=str(error)
        raise
    finally:
        report_path.write_text(json.dumps(report,indent=2),encoding="utf-8")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--webgl',action='store_true',help='Run the same fixtures and pixel assertions in Chromium WebGL (ANGLE software backend)')
    parser.add_argument('--packet',type=Path,help='Optional reproducible fixture JSON, otherwise use production exporter')
    parser.add_argument('--output',type=Path,default=OUT)
    parser.add_argument('--draw-mediump',action='store_true',help='Also draw mediump variants; Mesa half-float JIT can be very slow')
    parser.add_argument('--benchmark',type=int,default=0,help='Warm draws per fixture; software timings are NOT device FPS')
    args=parser.parse_args();output=args.output;output.mkdir(parents=True,exist_ok=True)
    packet=json.loads(args.packet.read_text() if args.packet else subprocess.check_output(['node','tests/export-render-fixtures.mjs']+(['--draw-mediump'] if args.draw_mediump else []),cwd=ROOT,text=True))
    if args.webgl:
        render_webgl(args,packet,output)
        return
    width_max=max(item['width'] for item in packet['fixtures']);height_max=max(item['height'] for item in packet['fixtures'])
    library=find_library('EGL')
    if not library:raise RuntimeError('libEGL unavailable')
    egl=C.CDLL(library)
    def ef(name,result,args):fn=getattr(egl,name);fn.restype=result;fn.argtypes=args;return fn
    getproc=ef('eglGetProcAddress',P,[C.c_char_p]);getdisplay=C.CFUNCTYPE(P,U,P,C.POINTER(I))(getproc(b'eglGetPlatformDisplayEXT'))
    display=getdisplay(0x31DD,None,None);major=I();minor=I()
    assert ef('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(display,C.byref(major),C.byref(minor)),'EGL initialization failed'
    assert ef('eglBindAPI',U,[U])(0x30A0),'OpenGL ES binding failed'
    attrs=(I*13)(0x3024,8,0x3023,8,0x3022,8,0x3033,1,0x3040,4,0x3021,8,0x3038);config=P();count=I()
    assert ef('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
    context=ef('eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,config,None,(I*3)(0x3098,2,0x3038));surface=ef('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,config,(I*5)(0x3057,width_max,0x3056,height_max,0x3038))
    assert ef('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context),'Cannot make ES context current'
    def gf(name,result,args):
        address=getproc(name.encode());assert address,f'Missing GLES function {name}'
        return C.CFUNCTYPE(result,*args)(address)
    getstring=gf('glGetString',C.c_char_p,[U]);renderer=getstring(0x1F01).decode();version=getstring(0x1F02).decode();print(renderer,version,flush=True)
    create_shader=gf('glCreateShader',U,[U]);shader_source=gf('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compile_shader=gf('glCompileShader',None,[U]);shader_iv=gf('glGetShaderiv',None,[U,U,C.POINTER(I)]);shader_log=gf('glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
    def shader(kind,source):
        ident=create_shader(kind);data=C.c_char_p(source.encode());shader_source(ident,1,C.byref(data),None);compile_shader(ident);status=I();shader_iv(ident,0x8B81,C.byref(status))
        if not status.value:
            buf=C.create_string_buffer(32768);shader_log(ident,len(buf),None,buf);raise AssertionError(buf.value.decode())
        return ident
    create_program=gf('glCreateProgram',U,[]);attach=gf('glAttachShader',None,[U,U]);link=gf('glLinkProgram',None,[U]);program_iv=gf('glGetProgramiv',None,[U,U,C.POINTER(I)]);program_log=gf('glGetProgramInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
    programs={};surface_programs={};compile_ms={};surface_compile_ms={};vs=shader(0x8B31,packet['vertex'])
    profiles=[(False,key,source) for key,source in packet['fragments'].items()]+[(True,key,source) for key,source in packet.get('surfaceFragments',{}).items()]
    for is_surface,tier,source in profiles:
        begin=time.perf_counter();fs=shader(0x8B30,source);program=create_program();attach(program,vs);attach(program,fs);link(program);status=I();program_iv(program,0x8B82,C.byref(status))
        if not status.value:
            buf=C.create_string_buffer(32768);program_log(program,len(buf),None,buf);raise AssertionError(buf.value.decode())
        (surface_compile_ms if is_surface else compile_ms)[tier]=(time.perf_counter()-begin)*1000
        (surface_programs if is_surface else programs)[tier]=program;print('PASS compile/link',('surface:' if is_surface else '')+tier,flush=True)
    gen_buffers=gf('glGenBuffers',None,[I,C.POINTER(U)]);bind_buffer=gf('glBindBuffer',None,[U,U]);buffer_data=gf('glBufferData',None,[U,C.c_ssize_t,P,U]);buffer=U();gen_buffers(1,C.byref(buffer));bind_buffer(0x8892,buffer);quad=(F*6)(-1,-1,3,-1,-1,3);buffer_data(0x8892,C.sizeof(quad),quad,0x88E4)
    use=gf('glUseProgram',None,[U]);getattrib=gf('glGetAttribLocation',I,[U,C.c_char_p]);enable=gf('glEnableVertexAttribArray',None,[U]);attrib=gf('glVertexAttribPointer',None,[U,I,U,C.c_ubyte,I,P]);getuniform=gf('glGetUniformLocation',I,[U,C.c_char_p]);viewport=gf('glViewport',None,[I,I,I,I]);draw=gf('glDrawArrays',None,[U,I,I]);finish=gf('glFinish',None,[]);error=gf('glGetError',U,[]);read=gf('glReadPixels',None,[I,I,I,I,U,U,P]);clearcolor=gf('glClearColor',None,[F,F,F,F]);clear=gf('glClear',None,[U])
    setters={name:gf('gl'+name[0].upper()+name[1:],None,[I]+[F]*n) for name,n in [('uniform1f',1),('uniform2f',2),('uniform4f',4)]};results=[];hashes={}
    setters['uniform1i']=gf('glUniform1i',None,[I,I])
    noise_texture=None
    if packet.get('reliefNoise'):
        noise=packet['reliefNoise']
        assert noise['width']==256 and noise['height']==256 and noise.get('vertex') and noise.get('fragment'),'Invalid relief noise generator'
        noise_texture=U();gf('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(noise_texture))
        gf('glActiveTexture',None,[U])(0x84C0)
        gf('glBindTexture',None,[U,U])(0x0DE1,noise_texture)
        parameter=gf('glTexParameteri',None,[U,U,I])
        for name,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:parameter(0x0DE1,name,value)
        gf('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,256,256,0,0x1908,0x1401,None)
        get_integer=gf('glGetIntegerv',None,[U,C.POINTER(I)]);prior_fbo=I();prior_viewport=(I*4)()
        get_integer(0x8CA6,C.byref(prior_fbo));get_integer(0x0BA2,prior_viewport)
        dither=gf('glIsEnabled',C.c_ubyte,[U])(0x0BD0)
        fbo=U();gf('glGenFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(fbo))
        bind_fbo=gf('glBindFramebuffer',None,[U,U])
        noise_program=None;noise_vs=None;noise_fs=None
        try:
            bind_fbo(0x8D40,fbo)
            gf('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,noise_texture,0)
            assert gf('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5,'Incomplete relief noise framebuffer'
            noise_vs=shader(0x8B31,noise['vertex']);noise_fs=shader(0x8B30,noise['fragment'])
            noise_program=create_program();attach(noise_program,noise_vs);attach(noise_program,noise_fs);link(noise_program)
            noise_status=I();program_iv(noise_program,0x8B82,C.byref(noise_status))
            if not noise_status.value:
                buf=C.create_string_buffer(32768);program_log(noise_program,len(buf),None,buf);raise AssertionError(buf.value.decode())
            use(noise_program);position=getattrib(noise_program,b'aPos');assert position>=0,'Noise generator must expose aPos'
            enable(position);attrib(position,2,0x1406,0,0,None);viewport(0,0,256,256)
            gf('glDisable',None,[U])(0x0BD0)
            draw(0x0004,0,3);finish();assert error()==0,'GL error generating relief noise lattice'
        finally:
            bind_fbo(0x8D40,prior_fbo.value);viewport(*prior_viewport)
            if dither:gf('glEnable',None,[U])(0x0BD0)
            if noise_program:gf('glDeleteProgram',None,[U])(noise_program)
            for ident in [noise_vs,noise_fs]:
                if ident:gf('glDeleteShader',None,[U])(ident)
            gf('glDeleteFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(fbo))
    # The same RGBA8 surface target is resized and reused for production split profiles.
    surface_texture=None;surface_fbo=None;surface_size=None
    active_texture=gf('glActiveTexture',None,[U]);bind_texture=gf('glBindTexture',None,[U,U])
    bind_fbo=gf('glBindFramebuffer',None,[U,U]);get_integer=gf('glGetIntegerv',None,[U,C.POINTER(I)])
    output_fbo=I();get_integer(0x8CA6,C.byref(output_fbo))
    is_enabled=gf('glIsEnabled',C.c_ubyte,[U]);disable=gf('glDisable',None,[U]);enable_cap=gf('glEnable',None,[U])
    for item in packet['fixtures']:
        program=programs[item['tier']];surface_program=surface_programs.get(item['tier'])
        width=item['width'];height=item['height'];viewport(0,0,width,height)
        if surface_program:
            if surface_texture is None:
                surface_texture=U();surface_fbo=U()
                gf('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(surface_texture));gf('glGenFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(surface_fbo))
            active_texture(0x84C1);bind_texture(0x0DE1,surface_texture)
            parameter=gf('glTexParameteri',None,[U,U,I])
            for name,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:parameter(0x0DE1,name,value)
            if surface_size!=(width,height):
                gf('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,width,height,0,0x1908,0x1401,None);surface_size=(width,height)
            bind_fbo(0x8D40,surface_fbo);gf('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,surface_texture,0)
            assert gf('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5,'Incomplete surface framebuffer'
            bind_fbo(0x8D40,output_fbo.value);active_texture(0x84C0)
        def bind_fixture_program(selected):
            use(selected);bind_buffer(0x8892,buffer)
            position=getattrib(selected,b'aPos');enable(position);attrib(position,2,0x1406,0,0,None)
            for name,command in item['uniforms'].items():setters[command['kind']](getuniform(selected,name.encode()),*command['args'])
            setters['uniform1i'](getuniform(selected,b'uReliefNoise'),0);setters['uniform1i'](getuniform(selected,b'uSurfaceHits'),1)
        def draw_fixture():
            started=time.perf_counter();dither=is_enabled(0x0BD0)
            if surface_program:
                active_texture(0x84C1);bind_texture(0x0DE1,0)
                bind_fbo(0x8D40,surface_fbo);disable(0x0BD0);viewport(0,0,width,height)
                clearcolor(0,0,0,0);clear(0x4000);bind_fixture_program(surface_program);draw(0x0004,0,3)
                bind_fbo(0x8D40,output_fbo.value)
                if dither:enable_cap(0x0BD0)
                active_texture(0x84C1);bind_texture(0x0DE1,surface_texture);active_texture(0x84C0)
            bind_fixture_program(program);viewport(0,0,width,height);clearcolor(0,0,0,1);clear(0x4000);draw(0x0004,0,3);finish()
            assert error()==0,f'GL error drawing {item["name"]}'
            return (time.perf_counter()-started)*1000
        first_draw_ms=draw_fixture()
        warm_ms=[draw_fixture() for _ in range(max(0,args.benchmark))]
        pixels=(C.c_ubyte*(width*height*4))();read(0,0,width,height,0x1908,0x1401,pixels);assert error()==0
        image=Image.frombytes('RGBA',(width,height),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        stat,p99=validate_image(item,image)
        hashes[item['name']]=hashlib.sha256(bytes(pixels)).hexdigest()
        image.save(output/(item['name']+'.png'))
        results.append({'name':item['name'],'size':[width,height],'surface_pass':surface_program is not None,'rgb_stddev':stat.stddev,'rgba_sha256':hashes[item['name']], 'wall_curvature_p99':p99,'first_draw_ms':first_draw_ms,'warm_draw_ms':warm_ms,'median_draw_ms':statistics.median(warm_ms) if warm_ms else None})
        print('PASS draw',item['name'],flush=True)
    validate_comparisons(packet,hashes)
    (output/'report.json').write_text(json.dumps({'status':'passed','backend':'offscreen OpenGL ES, not browser WebGL','renderer':renderer,'version':version,'compiled_profiles':list(programs),'compiled_surface_profiles':list(surface_programs),'compile_link_ms':compile_ms,'surface_compile_link_ms':surface_compile_ms,'identical_pixel_checks':packet.get('comparisons',[]),'draws':results},indent=2))
    if surface_texture is not None:gf('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(surface_texture))
    if surface_fbo is not None:gf('glDeleteFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(surface_fbo))
    if noise_texture is not None:gf('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(noise_texture))
    ef('eglMakeCurrent',U,[P,P,P,P])(display,None,None,None);ef('eglDestroySurface',U,[P,P])(display,surface);ef('eglDestroyContext',U,[P,P])(display,context);ef('eglTerminate',U,[P])(display)
    print(f'{len(programs)} shader profiles and {len(results)} frames validated.',flush=True)
if __name__=='__main__':main()
