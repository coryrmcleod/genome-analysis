import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {referenceDefinition,validateScoreReference,referencePercentile} from '../public/pgs-reference.js';
import {pgsTargetCatalog,calculatePGS,isPalindromic} from '../public/pgs.js';
import {analyzeText} from '../public/engine.js';import {estimatePGS} from '../public/pgs-estimate.js';
import {referenceAncestryEligibility} from '../public/pgs-ancestry-eligibility.js';
import {termForBuild} from '../public/pgs-build-alleles.js';
const library=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
const targetsById=new Map(library.targets.map(t=>[t.id,t]));assert.equal(targetsById.size,library.targets.length);
const reference=validateScoreReference(JSON.parse(fs.readFileSync(new URL('../public/data/pgs-score-reference.json',import.meta.url))));
test('installed EUR distributions bind exact full models on both builds and have complete verification',()=>{
 assert.equal(reference.models.length,library.models.length);assert.equal(reference.sampleCount,503);
 assert.equal(Object.values(reference.subpopulations).reduce((a,b)=>a+b,0),503);
 assert.match(reference.archiveSha256,/^[a-f0-9]{64}$/);
 const available=reference.models.filter(r=>r.status==='Available');assert.equal(available.length,116);
 const melanoma=reference.models.find(r=>r.id==='PGS000745');assert.equal(melanoma.status,'Unavailable');assert.match(melanoma.reason,/1 scoring terms still have unresolved effect-allele orientation/);
 for(const id of ['PGS001812','PGS001817','PGS001847','PGS001858','PGS001859','PGS001863','PGS001874','PGS001906','PGS001967'])assert.ok(available.some(row=>row.id===id),'complete expansion model has a verified reference: '+id);
 for(const r of available){
  const model=library.models.find(m=>m.id===r.id);assert.equal(r.variantCount,model.variantCount);
  assert.equal(r.verification.sampleComparisons,503);assert.equal(r.verification.terms,model.variantCount);
  assert.ok(model.variants.every(v=>v.alleleMode==='effect-only'?v.effectAlleleCandidates.length===1:!isPalindromic(v.effectAllele,v.otherAllele)));
  assert.equal(r.modelSha256,createHash('sha256').update(JSON.stringify(r.definitions)).digest('hex'));
  for(const build of ['GRCh37','GRCh38'])assert.equal(r.definitions[build],referenceDefinition(model,build,library.targets));
 }
});
test('synthetic sequencing reports produce measured ranks on both builds for every admitted model',()=>{
 for(const build of ['GRCh37','GRCh38'])for(const r of reference.models.filter(r=>r.status==='Available')){
  const m=library.models.find(m=>m.id===r.id),lines=['##fileformat=VCFv4.3','##reference='+build,'#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC'];
  for(const [i,original] of m.variants.entries()){
   const v=termForBuild(original,build);
   const map=targetsById.get(v.id).mappings[build],all=[map.ref,...map.alleles.filter(a=>a!==map.ref)],other=v.otherAllele||all.find(a=>a!==v.effectAllele);
   const pair=[[other,other],[other,v.effectAllele],[v.effectAllele,v.effectAllele]][i%3],gt=pair.map(a=>all.indexOf(a)).join('/');
   // The assembly reference may be an unused third allele. Use actual model
   // genotypes, retaining the full reference allele list and its VCF indices.
   lines.push([map.chrom,map.position,v.id,map.ref,all.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',gt+':60:30'].join('\t'));
  }
  const scan=analyzeText(lines.join('\n')+'\n',pgsTargetCatalog(library));
  const score=calculatePGS(library,scan).find(s=>s.id===m.id),estimate=estimatePGS(score,null,'EUR'),rank=referencePercentile(score,estimate,reference);
  assert.notEqual(score.rawSum,null,JSON.stringify({id:m.id,build,unusable:score.terms.filter(t=>t.contribution===null).map(t=>({id:t.id,status:t.status,genotype:t.genotype,effect:t.effectAllele,other:t.otherAllele}))}));
  if(referenceAncestryEligibility(m).status==='mismatch'){assert.equal(rank.point,null);assert.match(rank.reason,/reported evaluation populations/);}
  else{assert.equal(rank.measured,true);assert.ok(rank.point>=0&&rank.point<=100);assert.equal(rank.lower,rank.upper);}
 }
});
