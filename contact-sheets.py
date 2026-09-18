#!/usr/bin/env python3
"""Build visual-review sheets from the actual offscreen GLES captures."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'test-results'/'egl'
for start in (1,9,17):
    ids=list(range(start,min(start+8,23)))
    im=Image.new('RGB',(980,40+330*((len(ids)+1)//2)),'#10171b');d=ImageDraw.Draw(im)
    d.text((12,12),'REVISION DE SALAS / GLSL real mediante OpenGL ES por software',fill='#edf2ee')
    for n,i in enumerate(ids):
        x=10+(n%2)*490;y=42+(n//2)*330
        im.paste(Image.open(p/f'room-{i:02}.png').convert('RGB'),(x,y))
        d.text((x+4,y+305),f'SALA {i:02} - vista frontal conservada',fill='#efc9a2')
    im.save(p/f'review-{start:02}-{ids[-1]:02}.jpg',quality=92)
