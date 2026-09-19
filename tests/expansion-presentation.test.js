import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMPAIGN_LEVELS} from '../src/campaign.js';
const view=await import('../src/campaign-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('previews use active room data, include all targets and render vertical movement on z',()=>{
  assert.equal(typeof view.previewSVG,'function');
  for(const l of CAMPAIGN_LEVELS){const svg=view.previewSVG(l);assert.equal((svg.match(/data-preview="goal"/g)??[]).length,l.sequence?.length??1);assert.ok(svg.includes(l.name));}
  const svg=view.previewSVG(CAMPAIGN_LEVELS[30]);assert.match(svg,/data-axis="z"/);assert.match(svg,/0\.58/);
});
test('preview text is escaped and IDs cannot inject markup',()=>{
  assert.equal(typeof view.previewSVG,'function');const room={...CAMPAIGN_LEVELS[22],name:'<script>alert(1)</script>'};
  const s=view.previewSVG(room,{prefix:'x" onclick="bad'});assert.doesNotMatch(s,/<script|onclick=/);assert.match(s,/&lt;script&gt;/);
});
test('runtime injects composed campaign and offers expansion without silently selecting it',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/CAMPAIGN_LEVELS as LEVELS/);assert.match(app,/case 'start-expansion'/);assert.match(app,/data-preview-room/);assert.match(app,/data-chapter/);
});
test('HTML presents 42 rooms and has actionable chapter and continuation controls',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="startExpansionBtn"/);assert.match(html,/id="finalCount"/);assert.match(html,/42 SALAS/);assert.doesNotMatch(html,/22 SALAS|22 <span>\/ 22/);
});
test('new rooms keep a full-width landscape playfield in portrait without altering cameraRay',()=>{
  const css=readFileSync(new URL('../styles/game.css',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
  assert.match(css,/\.app\.expansion-room #gl/);assert.match(css,/56\.25vw/);
  assert.match(ui,/classList\.toggle\('expansion-room'/);assert.match(app,/ui\.update\(engine,store\);renderer\?\.resize\(\)/);
});
