#!/usr/bin/env python3
"""Execute production material/BRDF functions through EGL or --webgl Chromium.
Test-only main() replacement does not alter shipped geometry.
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'materials'
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--webgl',action='store_true',help='Run identical material diagnostics via Chromium WebGL instead of native EGL')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    packet=OUT/'packet.json';packet.write_bytes(subprocess.check_output(['node','tests/export-material-fixtures.mjs'],cwd=ROOT))
    subprocess.run([sys.executable,'tests/shaders_egl.py','--packet',str(packet),'--output',str(OUT)]+(['--webgl'] if args.webgl else []),cwd=ROOT,check=True)
    checks=[]
    def check(label,condition,**data):
        assert condition,(label,data)
        checks.append({'check':label,**data});print('PASS',label,flush=True)
    def image(name):return np.asarray(Image.open(OUT/(name+'.png')).convert('RGBA'))
    for precision in ['highp','mediump']:
        n=image('normal-'+precision)
        check(precision+' finite unit normals on the room shell',bool(np.all(n[:,:,3]==255)),invalid_pixels=int(np.sum(n[:,:,3]!=255)))
    h=image('hits-highp');m=image('hits-mediump')
    interior=(h[:,:,0]>=30)&(h[:,:,0]<=63)&(h[:,:,3]==255)
    missed=int(((m[:,:,3]==0)&interior).sum())
    check('mediump raymarch does not lose interior wall intersections',missed/max(1,int(interior.sum()))<.005,lost_pixels=missed,wall_pixels=int(interior.sum()))
    ids=[1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,22]
    for tier in ['low','medium','high','cinematic']:
        a=image('properties-'+tier);check(tier+' finite bounded material response',bool(np.all(a[:,:,3]==255)))
        # row 1 from bottom stores roughness, legacy specular control and metal coverage.
        params={m:a[80,c*32+8:c*32+24,:3].mean(axis=0)/255 for c,m in enumerate(ids)}
        rough={m:float(v[0]) for m,v in params.items()}
        check(tier+' perceptual roughness separates ice, wood, walls, carpet',rough[16]<rough[1]<rough[3]<rough[2],roughness=rough)
        check(tier+' brake is matte and intact cube paint is dielectric',rough[17]>.88 and params[7][2]<.02)
        layers=a[48,6*32+8:6*32+24,:3].mean(axis=0)/255
        check(tier+' independent coat roughness',(.18<=layers[1]<=.32) and (layers[0]==0 if tier=='low' else layers[0]>.2))
    for label in ['cube','obstacle','platform','jump','bumper']:
        d=np.abs(image('anchor-'+label+'-0').astype(float)-image('anchor-'+label+'-1').astype(float))
        check(label+' texture follows the object frame',d.max()<=2 and d.mean()<.08,max_byte_error=float(d.max()),mean_byte_error=float(d.mean()))
    a=image('filter')/255
    check('unresolved stripe preserves 10% coverage',bool(np.max(np.abs(a[:,:,0]-.1))<.006))
    check('unresolved noise goes to its mean and zero gradient',bool(np.max(np.abs(a[:,:,1]-.5))<.006 and a[:,:,2].max()<.006))
    for name in ['dielectric','coated','metal']:
        energy=image('furnace-'+name)[:,:,:3]/255*2
        check(name+' white-furnace energy is bounded',bool(energy.min()>.15 and energy.max()<1.07),minimum=float(energy.min()),maximum=float(energy.max()))
    wear=image('wear')[:,:,0]/255
    check('hero paint has sparse subtle wear rather than broad exposed metal',bool(wear.max()<=.20 and wear.mean()<.02),maximum=float(wear.max()),mean=float(wear.mean()))
    (OUT/'checks.json').write_text(json.dumps({'status':'passed','backend':'Chromium WebGL material diagnostics via ANGLE SwiftShader (software; not physical GPU)' if args.webgl else 'native EGL/GLES material diagnostics, not physical GPU','checks':checks},indent=2))
if __name__=='__main__':main()
