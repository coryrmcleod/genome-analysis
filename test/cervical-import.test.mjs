import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {importReviewedCervical,verifyInstalledCervical} from '../scripts/import-reviewed-cervical.mjs';
import {analyzeText} from '../public/engine.js';import {pgsTargetCatalog} from '../public/pgs.js';import {estimatePGS} from '../public/pgs-estimate.js';
const selected=JSON.parse(await readFile(new URL('../scripts/cervical-selection.json',import.meta.url)))[0];
test('cervical admission is frozen and complete, not a generic deletion exception',async()=>{
 const lib=await importReviewedCervical(selected),m=lib.models[0];assert.equal(await verifyInstalledCervical(m,lib.targets),true);assert.equal(m.variantCount,15);assert.equal(m.variants.filter(v=>v.kind==='reviewed-deletion').length,1);assert.equal(lib.targets.length,15);assert.ok(!m.researchOnly);
 for(const patch of [{id:'PGS001522'},{count:14},{reviewedCervicalDeletion:false},{coverageContext:'safe'}])await assert.rejects(importReviewedCervical({...selected,...patch}));
 for(const mutate of [x=>x.variants[0].weight+=0.1,x=>x.variants.pop(),x=>x.variants[0].sourceEffectAllele='N',x=>x.reviewedDeletionEvidence.mergeChain.pop(),x=>x.sourceFiles.GRCh38.sha256='bad']){const bad=structuredClone(m);mutate(bad);await assert.rejects(verifyInstalledCervical(bad,lib.targets));}
});
test('missing certified deletion never receives a population or neutral genotype substitution',async()=>{
 const lib=await importReviewedCervical(selected),t=lib.targets[0],m=t.mappings.GRCh38,alts=m.alleles.filter(a=>a!==m.ref).join(','),vcf='##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n'+[m.chrom,m.position,t.id,m.ref,alts,80,'PASS','.','GT:GQ:DP','0/1:60:30'].join('\t');
 const score=analyzeText(vcf,pgsTargetCatalog(lib),{pgsLibrary:lib}).polygenicScores[0];assert.equal(score.total,15);assert.equal(score.rawSum,null);const estimate=estimatePGS(score,null,'EUR');assert.equal(estimate.bestGuess,null);assert.equal(estimate.point,null);assert.match(estimate.reason,/certified deletion/);
});
