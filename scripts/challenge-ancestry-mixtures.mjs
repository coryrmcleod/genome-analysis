// Synthetic algorithm challenges only: no personal genotypes, network or writes
// to the installed panel. Independent alleles omit LD and local ancestry tracts.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateAncestry,validateAncestryReference} from '../public/ancestry.js';
const [output,reference,...extra]=process.argv.slice(2);
if(!output||extra.length)throw Error('Usage: node scripts/challenge-ancestry-mixtures.mjs output.json [reference.json]');
const installedReference=fileURLToPath(new URL('../public/data/ancestry-reference.json',import.meta.url));
if([installedReference,reference].filter(Boolean).some(path=>resolve(path).toLowerCase()===resolve(output).toLowerCase()))throw Error('Challenge output must not replace a reference panel');
const bytes=await readFile(reference??new URL('../public/data/ancestry-reference.json',import.meta.url)),panel=validateAncestryReference(JSON.parse(bytes));
const codes=panel.groups.map(g=>g.code),replicates=20,seed=0x6a09e667;
let state=seed;
function random(){state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
const cases=[];
for(const code of codes)cases.push({label:`Pure ${code} aggregate`,components:{[code]:1}});
for(const [a,b] of [['EUR','MENA'],['EUR','SAS'],['EUR','AFR'],['EAS','IAM'],['EAS','OCE']])for(const fraction of [.02,.05,.1,.25,.5])cases.push({label:`${a} + ${fraction*100}% ${b}`,components:{[a]:1-fraction,[b]:fraction}});
cases.push({label:'Three-way AFR/EUR/EAS',components:{AFR:.25,EUR:.5,EAS:.25}});
// Within-group population templates expose reference misspecification while the
// generating broad-group labels remain known by construction, not genealogy.
for(const pop of ['HGDP:Sardinian','HGDP:Bedouin','HGDP:Kalash'])cases.push({label:`Population template ${pop}`,population:pop,components:{[panel.populations.find(p=>p.code===pop).region]:1}});
const quantile=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.ceil(q*xs.length)-1]??null;
const results=[];
for(const scenario of cases){
 const truth=codes.map(c=>scenario.components[c]||0),populationIndex=scenario.population?panel.populations.findIndex(p=>p.code===scenario.population):-1;
 const frequencies=panel.markers.map(m=>populationIndex>=0?m.populationFrequencies[populationIndex]:m.frequencies.reduce((s,f,i)=>s+f*truth[i],0));
 const runs=[];let worstCase=null;
 for(let replicate=0;replicate<replicates;replicate++){
  const input={build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:'Called',alleles:Array.from({length:2},()=>random()<frequencies[i]?m.alt:m.mappings.GRCh38.ref)}))};
  const fit=estimateAncestry(input,panel),groups=fit.status==='Estimated'?codes.map(c=>fit.groups.find(g=>g.code===c)):[];
  runs.push({replicate,status:fit.status,reason:fit.reason,residual:fit.residual??null,fractions:groups.map(g=>g.fraction),maximumAbsoluteError:groups.length?Math.max(...groups.map((g,i)=>Math.abs(g.fraction-truth[i]))):null,allSensitivityRangesContainTruth:groups.length?groups.every((g,i)=>g.sensitivityLow<=truth[i]+1e-12&&g.sensitivityHigh>=truth[i]-1e-12):null,sensitivityWidths:groups.map(g=>g.sensitivityHigh-g.sensitivityLow)});
  if(groups.length&&(!worstCase||runs.at(-1).maximumAbsoluteError>worstCase.maximumAbsoluteError))worstCase={...runs.at(-1),dosages:input.results.map((r,i)=>r.alleles.filter(a=>a===panel.markers[i].alt).length)};
 }
 const passing=runs.filter(r=>r.status==='Estimated');
 results.push({...scenario,truth,runs,worstCase,summary:{passing:passing.length,replicates,maximumAbsoluteError:passing.length?Math.max(...passing.map(r=>r.maximumAbsoluteError)):null,percentile95AbsoluteError:quantile(passing.map(r=>r.maximumAbsoluteError),.95),allSensitivityRangesContainTruth:passing.filter(r=>r.allSensitivityRangesContainTruth).length,maximumSensitivityWidth:passing.length?Math.max(...passing.flatMap(r=>r.sensitivityWidths)):null}});
 console.log(scenario.label+': '+JSON.stringify(results.at(-1).summary));
}
const result={kind:'synthetic-ancestry-mixture-challenges',version:1,seed,randomGenerator:'Mulberry32',replicates,codes,referenceSha256:createHash('sha256').update(bytes).digest('hex'),method:panel.method,limitations:['Synthetic independent binomial alleles drawn from the supplied aggregate or population frequencies; no real genomes or genealogical fractions.','No linkage disequilibrium, local ancestry tracts, sequencing errors, platform ascertainment or missingness.','The aggregate generating templates equal the fitted templates and therefore favor the estimator. Population-template cases probe misspecification, not independent accuracy.','Containment counts describe this synthetic experiment; chromosome deletion sensitivity ranges remain uncalibrated and must not be described as confidence intervals.'],results};
await writeFile(output,JSON.stringify(result,null,2)+'\n');
