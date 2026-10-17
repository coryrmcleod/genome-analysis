// Public genotypes only. Builds an uncertainty comparison, never a calibrated PGS CDF.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {isPalindromic} from '../public/pgs.js';import {referenceDefinition} from '../public/pgs-reference.js';import {validateSensitivityReference} from '../public/pgs-sensitivity.js';
import {matchReferenceGenotypes} from './pgs-reference-genotypes.mjs';
import {readEuropeanCohort,validateEuropeanSampleIds} from './european-reference-cohort.mjs';
import {finitePGSMidpoint} from '../public/pgs-numeric.js';
const root=process.argv[2];if(!root)throw Error('Supply public reference directory');
const read=p=>JSON.parse(fs.readFileSync(p));
const library=read(process.argv[3]||new URL('../public/data/pgs-library.json',import.meta.url)),archive=read(path.join(root,'archive-provenance.json')),sample=read(path.join(root,'sample-provenance.json'));
const rows=new Map();let sampleCount=0;
const expectedIds=readEuropeanCohort(root);
for(const line of fs.readFileSync(path.join(root,'eur-score-targets.vcf'),'utf8').split(/\r?\n/)){
 if(line.startsWith('#CHROM')){const ids=line.split('\t').slice(9);validateEuropeanSampleIds(ids,expectedIds);sampleCount=ids.length;continue;}if(!line||line.startsWith('#'))continue;
 const f=line.split('\t'),key=f[0]+':'+f[1],alleles=[f[3],...f[4].split(',')];
 if(!rows.has(key))rows.set(key,[]);rows.get(key).push({ref:f[3],alleles,format:f[8].split(':'),samples:f.slice(9)});
}
if(sampleCount!==sample.sampleCount)throw Error('Sample count mismatch');
const targets=new Map(library.targets.map(t=>[t.id,t])),models=[];
for(const model of library.models){
 if(model.variants.some(v=>v.kind==='reviewed-deletion')){models.push({id:model.id,status:'Unavailable',reason:'Full-model sensitivity comparison unavailable: certified deletion genotypes have not been independently verified across this public cohort. No partial model or deletion-genotype substitution is used.'});continue;}
 const r={id:model.id,status:'Unavailable'},low=Array(sampleCount).fill(0),high=Array(sampleCount).fill(0),center=Array(sampleCount).fill(0),basis={baseScores:Array(sampleCount).fill(0),terms:[]};let uncertainTerms=0,uncertainWeight=0;const errors=[],unusedAlleleRecords=[],missingReferenceTerms=[];
 for(const t of model.variants){
  const m=targets.get(t.id).mappings.GRCh37,found=rows.get(m.chrom+':'+m.position)||[],x=matchReferenceGenotypes(t,m,found,sampleCount);
  if(x.status==='missing'){
   // Keep the entire published term: absent reference genotypes are bounded,
   // never treated as reference calls or silently removed from the model.
   missingReferenceTerms.push({id:t.id,weight:t.weight,lower:Math.min(0,2*t.weight),upper:Math.max(0,2*t.weight)});
   x.genotypes=Array.from({length:sampleCount},()=>[]);
  }else if(x.status!=='matched'){errors.push({id:t.id,status:x.status,reason:x.reason||'Reference position absent'});continue;}
  if(x.record?.alleles.length>2)unusedAlleleRecords.push({id:t.id,listedAlleles:x.record.alleles,unusedAlleles:x.unusedAlleles});
  const candidates=t.alleleMode==='effect-only'?t.effectAlleleCandidates:isPalindromic(t.effectAllele,t.otherAllele)?[t.effectAllele,t.otherAllele]:[t.effectAllele];
  if(candidates.length>1){uncertainTerms++;uncertainWeight+=Math.abs(t.weight);}
  const vectors=candidates.map(a=>x.genotypes.map(g=>g.filter(b=>b===a).length*t.weight));
  if(candidates.length>1)basis.terms.push({id:t.id,candidates,contributions:vectors});
  else for(let i=0;i<sampleCount;i++)basis.baseScores[i]+=vectors[0][i];
  for(let i=0;i<sampleCount;i++){const values=candidates.map(a=>x.genotypes[i].filter(b=>b===a).length*t.weight),a=Math.min(...values),b=Math.max(...values);low[i]+=a;high[i]+=b;center[i]+=finitePGSMidpoint(a,b);}
 }
 if(errors.length){r.reason=`Sensitivity comparison unavailable: ${errors.length} reference terms have absent, incompatible, overlapping or incomplete records.`;r.excludedTerms=errors.map(e=>e.id);r.excludedTermDetails=errors;models.push(r);continue;}
 if(!uncertainTerms&&!missingReferenceTerms.length)continue; // Exact distributions serve complete orientation-resolved models.
 const referenceLower=missingReferenceTerms.reduce((s,t)=>s+t.lower,0),referenceUpper=missingReferenceTerms.reduce((s,t)=>s+t.upper,0);
 basis.referenceLower=referenceLower;basis.referenceUpper=referenceUpper;
 r.missingReferenceTerms=missingReferenceTerms;
 for(let i=0;i<sampleCount;i++){low[i]+=referenceLower;high[i]+=referenceUpper;center[i]+=finitePGSMidpoint(referenceLower,referenceUpper);}
 r.unusedAlleleRecords=unusedAlleleRecords;
 r.orientationBasis=basis;
 const definitions=Object.fromEntries(['GRCh37','GRCh38'].map(b=>[b,referenceDefinition(model,b,library.targets)]));
 Object.assign(r,{status:'Available',sampleCount,uncertainTerms,uncertainWeightFraction:uncertainWeight/model.variants.reduce((s,t)=>s+Math.abs(t.weight),0),definitions,modelSha256:createHash('sha256').update(JSON.stringify(definitions)).digest('hex'),lowerScores:low.sort((a,b)=>a-b),centralScores:center.sort((a,b)=>a-b),upperScores:high.sort((a,b)=>a-b)});models.push(r);
}
const result=validateSensitivityReference({version:'1.0.0',population:'EUR',retrievedAt:new Date().toISOString(),sourceURL:archive.url,archiveSha256:archive.sha256,sampleCount,models});
const output=process.argv[4]||new URL('../public/data/pgs-score-sensitivity.json',import.meta.url),partial=process.argv[4]?process.argv[4]+'.partial':new URL('../public/data/pgs-score-sensitivity.json.partial',import.meta.url);
fs.writeFileSync(partial,JSON.stringify(result)+'\n');fs.renameSync(partial,output);
console.log(JSON.stringify({available:models.filter(m=>m.status==='Available').length,unavailable:models.filter(m=>m.status!=='Available').map(m=>({id:m.id,reason:m.reason}))}));
