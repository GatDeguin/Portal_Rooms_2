// Export reproducible, input-only reference runs. No runtime debug API is added.
import {mkdirSync,writeFileSync} from 'node:fs';
import {LEVELS,COURSE_VERSION} from '../src/levels.js';
import {play} from '../tests/helpers/playthrough.mjs';
const variants=[{name:'reference-120hz',fps:120},{name:'30hz',fps:30},{name:'soft-gravity-60hz',fps:60,gravity:false},{name:'slow-144hz',fps:144,speed:1.2},{name:'fast-60hz',fps:60,speed:1.8}];
const output=new URL('../test-results/course/',import.meta.url);mkdirSync(output,{recursive:true});
let success=true;const summaries=[];
for(const variant of variants){
  const runs=LEVELS.map((_,i)=>play(i,{...variant,maxSeconds:65}));
  for(const run of runs){const {trace,events,...summary}=run;summaries.push({variant:variant.name,...summary});success&&=run.solved;}
  writeFileSync(new URL(`${variant.name}.json`,output),JSON.stringify(runs,null,2));
}
const report={status:success?'passed':'failed',courseVersion:COURSE_VERSION,method:'Reference pilot reading state and supplying bounded gravity only. No position/velocity/clock/sequence assignment after spawn. Not human playtests.',variants,runCount:summaries.length,completed:summaries.filter(x=>x.solved).length,runs:summaries};
writeFileSync(new URL('report.json',output),JSON.stringify(report,null,2));
console.table(summaries.filter(r=>r.variant===variants[0].name).map(({name,room,seconds,jumps,bumperHits,surfaces,solved})=>({room,name,solved,seconds:seconds.toFixed(2),jumps,bumperHits,surfaces:surfaces.join(', ')})));
console.log(`${report.completed}/${report.runCount} complete routes across ${variants.length} configurations.`);
if(!success)process.exitCode=1;
