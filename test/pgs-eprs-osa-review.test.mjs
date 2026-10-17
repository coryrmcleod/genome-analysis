import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGS_EPRS_OSA_REVIEWS} from '../public/pgs-eprs-osa-reviews.js';
import {eprsOSAReview} from '../public/pgs-eprs-osa-review.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const lib=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('all eight OSA records retain distinct conventional/residual results and unresolved primary discrepancies',()=>{
 const proof=read('./fixtures/pgs/primary/ePRS-OSA-evaluation-review.json');
 assert.deepEqual(PGS_EPRS_OSA_REVIEWS,proof.reviews);assert.equal(proof.reviews.length,8);
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/ePRS-OSA-supplementary-data-1.xlsx',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.primarySupplementSource.sha256);
 assert.equal(proof.reviews.filter(r=>!r.seMatches).length,2);
 assert.equal(proof.reviews.filter(r=>r.sheet==='ePRS results').length,4);
 for(const review of proof.reviews){
  const model=lib.models.find(m=>m.id===review.id),bound=evidence.models.find(m=>m.id===review.id),record=bound.evaluations.find(r=>r.id===review.record.id),before=JSON.stringify({model,bound});
  assert.equal(eprsOSAReview(model,bound,record).status,'confirmed');
  assert.equal(review.depositedCount,16422);assert.equal(review.primaryCount,review.primaryRow['model adjustment']==='local_ePRS'?16416:16423);
  assert.equal(Math.round(review.primaryBeta*1000)/1000,record.metrics[0].estimate);
  assert.equal(Math.round(review.primarySE*1000)/1000===record.metrics[0].standardError,review.seMatches);
  for(const mutate of [r=>r.metrics[0].standardError+=0.001,r=>r.samples[0].count++,r=>r.comments+=' changed',r=>r.covariates+=' changed']){const changed=structuredClone(record);mutate(changed);assert.equal(eprsOSAReview(model,bound,changed).status,'changed');}
  const changed=structuredClone(bound);changed.sources[0].sha256='a'.repeat(64);assert.equal(eprsOSAReview(model,changed,record).status,'changed');
  assert.equal(eprsOSAReview({...model,variantCount:model.variantCount-1},bound,record).status,'changed');
  const html=evaluationHtml(model,evidence);assert.match(html,/Their composition is not reconciled/);assert.match(html,/GA does not calculate/);assert.match(html,/Do not use the deposited standard error/);
  assert.equal(JSON.stringify({model,bound}),before);
 }
 const other=lib.models.find(m=>m.id==='PGS012582');assert.doesNotMatch(evaluationHtml(other,evidence),/Published evaluation scope and source discrepancies/);
});
