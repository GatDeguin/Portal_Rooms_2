// Expansion reference runs use the production composed catalog and only bounded inputs.
// Original rooms remain covered by their unchanged regression suite; this is NOT a 42-room human playtest.
import {mkdirSync,writeFileSync} from 'node:fs';
import {playExpansion,replay} from '../tests/helpers/expansion-pilot.mjs';
const out=new URL('../test-results/expansion/',import.meta.url);mkdirSync(out,{recursive:true});
const results=[];
function record(id,options,group){
  const r=playExpansion(id,{...options,trace:group==='base'&&options.fps===60&&options.strongGravity===true});
  const reproduced=replay(r);const verified=r.solved&&reproduced.solved&&r.seq===reproduced.seq;
  if(r.path.length)writeFileSync(new URL(`room-${id}.json`,out),JSON.stringify(r));
  const {frames,path,final,events,...summary}=r;
  results.push({...summary,group,verified,frameCount:frames.length,jumps:events.filter(e=>e.type==='jump').length,bumperHits:events.filter(e=>e.type==='bumper').length});
  if(!verified)console.error('FAIL',id,group,options,r.failure);
}
for(let id=23;id<=42;id++)for(const fps of [30,60,120,144])for(const strongGravity of [true,false])record(id,{fps,strongGravity},'base');
for(let id=23;id<=42;id++)for(const strongGravity of [true,false])record(id,{keyboard:true,strongGravity},'keyboard');
for(const id of [28,29,30,31,32,36,39,41,42])for(const delay of [1.1,2.7,5.4])for(const strongGravity of [true,false])record(id,{delay,strongGravity},'phase-delay');
for(const [id,variant] of [[24,'return-ice'],[25,'bumper'],[26,'right'],[38,'jump'],[39,'bumper'],[40,'jump']])for(const strongGravity of [true,false])record(id,{variant,strongGravity},'alternative');
for(const id of [34,42])for(const strongGravity of [true,false])record(id,{variant:'recovery',strongGravity},'recovery');
for(const id of [23,29,31,34,42])record(id,{pauseAt:2},'pause');
const groups=Object.fromEntries([...new Set(results.map(r=>r.group))].map(g=>[g,{passed:results.filter(r=>r.group===g&&r.verified).length,total:results.filter(r=>r.group===g).length}]));
const report={status:results.every(r=>r.verified)?'passed':'failed',scope:'Rooms 23–42, production GameEngine with CAMPAIGN_LEVELS; original 1–22 unchanged and unit-regression tested',method:'Reference pilot reads state and supplies gravity only after spawn. Independent replay of recorded inputs; no position, velocity, time or sequence assignment. Not human playtests.',groups,passed:results.filter(r=>r.verified).length,total:results.length,runs:results};
writeFileSync(new URL('report.json',out),JSON.stringify(report,null,2));console.table(groups);console.log(`${report.passed}/${report.total} expansion routes verified and replayed.`);
if(report.status!=='passed')process.exitCode=1;
