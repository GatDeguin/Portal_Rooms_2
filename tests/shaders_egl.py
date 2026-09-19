#!/usr/bin/env python3
"""Compile/render production shaders using offscreen OpenGL ES (Mesa/EGL).
Validates GLSL and uniform packing, NOT browser WebGL or phone performance.
Requires libEGL, Node and Pillow. Missing ES is a failure, not a passing test.
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

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--packet',type=Path,help='Optional reproducible fixture JSON, otherwise use production exporter')
    parser.add_argument('--output',type=Path,default=OUT)
    parser.add_argument('--draw-mediump',action='store_true',help='Also draw mediump variants; Mesa half-float JIT can be very slow')
    parser.add_argument('--benchmark',type=int,default=0,help='Warm draws per fixture; software timings are NOT device FPS')
    args=parser.parse_args();output=args.output;output.mkdir(parents=True,exist_ok=True)
    packet=json.loads(args.packet.read_text() if args.packet else subprocess.check_output(['node','tests/export-render-fixtures.mjs']+(['--draw-mediump'] if args.draw_mediump else []),cwd=ROOT,text=True))
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
    programs={};compile_ms={};vs=shader(0x8B31,packet['vertex'])
    for tier,source in packet['fragments'].items():
        begin=time.perf_counter();fs=shader(0x8B30,source);program=create_program();attach(program,vs);attach(program,fs);link(program);status=I();program_iv(program,0x8B82,C.byref(status))
        if not status.value:
            buf=C.create_string_buffer(32768);program_log(program,len(buf),None,buf);raise AssertionError(buf.value.decode())
        compile_ms[tier]=(time.perf_counter()-begin)*1000;programs[tier]=program;print('PASS compile/link',tier,flush=True)
    gen_buffers=gf('glGenBuffers',None,[I,C.POINTER(U)]);bind_buffer=gf('glBindBuffer',None,[U,U]);buffer_data=gf('glBufferData',None,[U,C.c_ssize_t,P,U]);buffer=U();gen_buffers(1,C.byref(buffer));bind_buffer(0x8892,buffer);quad=(F*6)(-1,-1,3,-1,-1,3);buffer_data(0x8892,C.sizeof(quad),quad,0x88E4)
    use=gf('glUseProgram',None,[U]);getattrib=gf('glGetAttribLocation',I,[U,C.c_char_p]);enable=gf('glEnableVertexAttribArray',None,[U]);attrib=gf('glVertexAttribPointer',None,[U,I,U,C.c_ubyte,I,P]);getuniform=gf('glGetUniformLocation',I,[U,C.c_char_p]);viewport=gf('glViewport',None,[I,I,I,I]);draw=gf('glDrawArrays',None,[U,I,I]);finish=gf('glFinish',None,[]);error=gf('glGetError',U,[]);read=gf('glReadPixels',None,[I,I,I,I,U,U,P]);clearcolor=gf('glClearColor',None,[F,F,F,F]);clear=gf('glClear',None,[U])
    setters={name:gf('gl'+name[0].upper()+name[1:],None,[I]+[F]*n) for name,n in [('uniform1f',1),('uniform2f',2),('uniform4f',4)]};results=[];hashes={}
    for item in packet['fixtures']:
        program=programs[item['tier']];use(program);position=getattrib(program,b'aPos');enable(position);attrib(position,2,0x1406,0,0,None)
        width=item['width'];height=item['height'];viewport(0,0,width,height);clearcolor(0,0,0,1);clear(0x4000)
        for name,command in item['uniforms'].items():setters[command['kind']](getuniform(program,name.encode()),*command['args'])
        first_begin=time.perf_counter();draw(0x0004,0,3);finish();first_draw_ms=(time.perf_counter()-first_begin)*1000
        assert error()==0,f'GL error drawing {item["name"]}'
        warm_ms=[]
        for _ in range(max(0,args.benchmark)):
            begin=time.perf_counter();draw(0x0004,0,3);finish();warm_ms.append((time.perf_counter()-begin)*1000)
            assert error()==0,f'GL error benchmarking {item["name"]}'
        pixels=(C.c_ubyte*(width*height*4))();read(0,0,width,height,0x1908,0x1401,pixels);assert error()==0
        image=Image.frombytes('RGBA',(width,height),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);stat=ImageStat.Stat(image.convert('RGB'));assert item.get('diagnostic',False) or max(stat.stddev)>10,f'Uniform/empty render: {item["name"]}'
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
        hashes[item['name']]=hashlib.sha256(bytes(pixels)).hexdigest()
        image.save(output/(item['name']+'.png'))
        results.append({'name':item['name'],'size':[width,height],'rgb_stddev':stat.stddev,'rgba_sha256':hashes[item['name']], 'wall_curvature_p99':p99,'first_draw_ms':first_draw_ms,'warm_draw_ms':warm_ms,'median_draw_ms':statistics.median(warm_ms) if warm_ms else None})
        print('PASS draw',item['name'],flush=True)
    for left,right in packet.get('comparisons',[]):
        assert hashes[left]==hashes[right],f'Static effects-off image changed: {left} vs {right}'
        print('PASS identical pixels',left,right,flush=True)
    (output/'report.json').write_text(json.dumps({'status':'passed','backend':'offscreen OpenGL ES, not browser WebGL','renderer':renderer,'version':version,'compiled_profiles':list(programs),'compile_link_ms':compile_ms,'identical_pixel_checks':packet.get('comparisons',[]),'draws':results},indent=2))
    ef('eglMakeCurrent',U,[P,P,P,P])(display,None,None,None);ef('eglDestroySurface',U,[P,P])(display,surface);ef('eglDestroyContext',U,[P,P])(display,context);ef('eglTerminate',U,[P])(display)
    print(f'{len(programs)} shader profiles and {len(results)} frames validated.',flush=True)
if __name__=='__main__':main()
