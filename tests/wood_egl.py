#!/usr/bin/env python3
"""Timber-specific production GLSL tests via EGL; not a photorealism score or GPU test."""
import json,subprocess,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'wood'
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 p=OUT/'packet.json';p.write_bytes(subprocess.check_output(['node','tests/export-wood-fixtures.mjs'],cwd=ROOT))
 subprocess.run([sys.executable,'tests/shaders_egl.py','--packet',str(p),'--output',str(OUT)],cwd=ROOT,check=True)
 checks=[]
 def record(name,condition,**data):
  assert condition,(name,data)
  checks.append({'name':name,**data});print('PASS',name,flush=True)
 def img(name):return np.array(Image.open(OUT/(name+'.png')))
 for k in ['low-highp','medium-highp','high-highp','cinematic-highp','low-mediump','cinematic-mediump']:
  for c in ['color','response','normal']:
   im=img(k+'-'+c);record(k+' '+c+' bounds and unit normals',bool((im[:,:,3]==255).all()),invalid=int((im[:,:,3]!=255).sum()))
  a=img(k+'-color')[:,:,:3].astype(float)
  record(k+' warm timber retains pigment and spatial variation',a[:,:,0].mean()>a[:,:,1].mean()>a[:,:,2].mean() and a[:,:,0].std()>3.,red_std=float(a[:,:,0].std()))
 f=img('wood-filter')[:,:,:3]/255.
 record('unresolved growth rings preserve mean coverage',np.max(np.abs(f[:,:,0]-.19))<.006)
 record('subpixel fibres and pores do not crawl at distance',np.max(np.abs(f[:,:,1]-.5))<.006 and f[:,:,2].max()<.006)
 (OUT/'checks.json').write_text(json.dumps({'status':'passed','backend':'native EGL/GLES via Mesa software','checks':checks},indent=2))
if __name__=='__main__':main()
