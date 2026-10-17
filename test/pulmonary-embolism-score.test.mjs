import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {referencePercentile} from '../public/pgs-reference.js';import {referenceAncestryEligibility} from '../public/pgs-ancestry-eligibility.js';
test('pulmonary embolism keeps its complete source and withholds EUR transfer despite an arithmetically verified reference',async()=>{
 const l=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),r=JSON.parse(await readFile(new URL('../public/data/pgs-score-reference.json',import.meta.url))),m=l.models.find(m=>m.id==='PGS003861');
 assert.equal(m.variantCount,288);assert.equal(m.variants.length,288);assert.equal(m.sourceFiles.original.sha256,'c30b8e6044c1f6fffe7e987952e81346569424360603dc872c3fc7a4454297ed');assert.deepEqual(m.ancestry.eval.dist,{EAS:100});assert.equal(referenceAncestryEligibility(m).status,'mismatch');
 assert.match(m.coverageContext,/threshold was selected/);assert.match(m.coverageContext,/quantile label is inconsistent/);assert.match(m.coverageContext,/current clot/);
 const ref=r.models.find(x=>x.id===m.id);assert.equal(ref.status,'Available');assert.equal(ref.verification.terms,288);assert.equal(ref.verification.sampleComparisons,503);
 const score={...m,build:'GRCh38',inputFormat:'VCF',rawSum:0,terms:m.variants},rank=referencePercentile(score,null,r);assert.equal(rank.point,null);assert.match(rank.reason,/withheld/);assert.equal(score.rawSum,0);
});
