import fs from 'node:fs';import {createHash} from 'node:crypto';import {estimateAncestry,validateAncestryReference} from '../public/ancestry.js';
import {resolve} from 'node:path';
const [reference,fixturePath,outputPath,...extra]=process.argv.slice(2);
if(!reference||!fixturePath||!outputPath||extra.length)throw Error('Supply reference.json public-fixtures.json output.json');
if([reference,fixturePath,'public/data/ancestry-reference.json'].some(path=>resolve(path).toLowerCase()===resolve(outputPath).toLowerCase()))throw Error('Challenge output must preserve reference and fixtures');
const bytes=fs.readFileSync(reference),fixtureBytes=fs.readFileSync(fixturePath),panel=validateAncestryReference(JSON.parse(bytes)),fixtures=JSON.parse(fixtureBytes);
const results=[];
for(const f of fixtures){
 if(f.dosages.length!==panel.markers.length||f.dosages.some(d=>d!==null&&![0,1,2].includes(d)))throw Error('Invalid public fixture dosage inventory');
 const fit=dosages=>estimateAncestry({build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:dosages[i]===null?'No call':'Called',alleles:dosages[i]===null?null:Array.from({length:2},(_,j)=>j<dosages[i]?m.alt:m.mappings.GRCh38.ref)}))},panel);
 const base=fit(f.dosages);if(base.status!=='Estimated')throw Error('Baseline unavailable');
 for(const mode of ['reference-biased','heterozygote-biased','alternate-biased'])for(const proportion of [.01,.05,.1]){
  const dosages=[...f.dosages],eligible=dosages.map((d,i)=>({d,i})).filter(({d})=>d!==null&&(mode==='reference-biased'?d!==0:mode==='heterozygote-biased'?d!==1:d!==2));
  // Fixed integer hashing spreads selection across chromosomes without reading
  // personal data. No claim that these patterns model observed laboratory error.
  eligible.sort((a,b)=>(Math.imul(a.i+1,2654435761)>>>0)-(Math.imul(b.i+1,2654435761)>>>0));
  const changed=Math.min(Math.round(panel.markers.length*proportion),eligible.length);
  for(const {i}of eligible.slice(0,changed))dosages[i]=mode==='reference-biased'?0:mode==='heterozygote-biased'?1:2;
  const altered=fit(dosages),fractions=altered.status==='Estimated'?panel.groups.map(g=>altered.groups.find(r=>r.code===g.code).fraction):[];
  results.push({publicSample:f.publicSample,mode,proportion,changed,status:altered.status,reason:altered.reason,coverage:altered.coverage,residual:altered.residual??null,maximumChange:fractions.length?Math.max(...fractions.map((v,i)=>Math.abs(v-base.groups.find(g=>g.code===panel.groups[i].code).fraction))):null,fractions,dosages});
 }
}
const output={kind:'synthetic-ancestry-call-errors',version:1,referenceSha256:createHash('sha256').update(bytes).digest('hex'),publicFixturesSha256:createHash('sha256').update(fixtureBytes).digest('hex'),limitations:['Deterministic deliberate alterations to held-out public genotype fixtures; not an empirical sequencing or array error model.','All altered calls remain treated as usable; quality-score filtering and laboratory error rates are not tested.','Differences are against each original reference fit, not known genealogical truth or calibrated personal error.'],results};
fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({cases:results.length,passing:results.filter(r=>r.status==='Estimated').length,maximumChange:Math.max(...results.map(r=>r.maximumChange??0))}));
