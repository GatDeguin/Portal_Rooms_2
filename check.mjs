import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const files=(await readdir(new URL('../src/',import.meta.url))).filter(f=>f.endsWith('.js'));
for(const file of files){const result=spawnSync(process.execPath,['--check',`src/${file}`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
const html=await readFile('index.html','utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids');
for(const [,path] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))await readFile(path);
for(const file of files){const text=await readFile(`src/${file}`,'utf8');assert.doesNotMatch(text,/\b(?:eval|new Function)\s*\(/);for(const [,path] of text.matchAll(/from ['"](\.\/.+?)['"]/g))await readFile(new URL(`../src/${path}`,import.meta.url));}
console.log(`Syntax, relative imports and HTML checked: ${files.length} modules, ${ids.length} unique IDs.`);
