import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const source=process.argv[2];if(!source)throw Error('Pass the supplied Mano_Atelier_v03.html path.');
const html=await readFile(source,'utf8'),code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const section=(a,b)=>code.slice(code.indexOf(a),code.indexOf(b,code.indexOf(a)));
await mkdir(new URL('../assets/hands/',import.meta.url),{recursive:true});
for(const [id,name,compressed] of [['mesh-data','atelier-v03.bin',true],['detail-data','atelier-detail.png',false]]){
 const base64=html.match(new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)<\\/script>'))[1];
 const bytes=Buffer.from(base64.replace(/\s/g,''),'base64');await writeFile(new URL('../assets/hands/'+name,import.meta.url),compressed?gunzipSync(bytes):bytes);
}
let rig='// Rig adapted from the user-supplied Mano Atelier v03. See assets/hands/README.md.\nconst clamp=(x,a,b)=>Math.max(a,Math.min(b,x));\n';
rig+=section('const REST=','/** Authored');rig+=section('const CHAINS=','const LINKS=');
rig+=section('const distance=','/** Four extra');rig+=section('const BONE_COUNT=','class GestureState');
rig=rig.replace('const REST=','export const REST=').replace('class HandRig','export class HandRig');
await writeFile(new URL('../src/hand-rig.js',import.meta.url),rig);
// Retain material detail and BRDF; lighting is adapted to the game below.
const material=section('const HAND_FS=','const LINE_VS=');
await writeFile(new URL('../src/hand-material.js',import.meta.url),material.replace('const HAND_FS=','export const ATELIER_MATERIAL='));
const hash=createHash('sha256').update(html).digest('hex');
await writeFile(new URL('../assets/hands/README.md',import.meta.url),'# Mano Atelier v03\n\nMalla, textura y rig extraídos del HTML aportado por el usuario: `Mano_Atelier_v03.html`. No se ejecuta ni incorpora su interfaz, seguimiento, worker o conexiones externas.\n\nSHA-256 del HTML: `'+hash+'`.\n\nExtracción reproducible: `node scripts/import-atelier.mjs <ruta-al-HTML>`. La adaptación al juego está en `src/hand-renderer.js`, `src/hand-shaders.js` y `src/hand-view.js`.\n');
console.log('Extracted mesh, detail texture, rig and material from the supplied reference.');
