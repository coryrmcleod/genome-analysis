import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {sampleCountReview} from '../public/pgs-sample-count-review.js';
import {PGS_SAMPLE_COUNT_REVIEWS} from '../public/pgs-sample-count-reviews.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('primary count conflicts remain visible without overwriting deposited records',()=>{
 const proof=read('./fixtures/pgs/primary/Monti-sample-count-comparison.json');
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/pgs/primary/Monti-metrics.rda',import.meta.url))).digest('hex'),'08b2aeaec9155a5defbc769d604bec9cabd0fa2fcff37f22aa3cf2a76ded09b8');
 assert.deepEqual(proof.reviews,PGS_SAMPLE_COUNT_REVIEWS);assert.equal(proof.reviews.length,9);assert.deepEqual(proof.metricConflicts,[]);
 const expected=new Map([['PPM019221',[199274,2097,197177]],['PPM019222',[389004,7815,381189]],['PPM019223',[44057,466,43591]],['PPM019224',[66865,1769,65096]],['PPM019227',[199274,2097,197177]],['PPM019228',[389004,7815,381189]],['PPM019229',[44057,466,43591]],['PPM019230',[66865,1769,65096]],['PPM019437',[199274,4515,194759]]]);
 const before=JSON.stringify({library,evidence});
 for(const review of proof.reviews){
  assert.deepEqual([review.primaryCounts.count,review.primaryCounts.cases,review.primaryCounts.controls],expected.get(review.record.id));
  const model=library.models.find(m=>m.id===review.id),bound=evidence.models.find(m=>m.id===review.id),record=bound.evaluations.find(r=>r.id===review.record.id);
  assert.equal(sampleCountReview(model,bound,record).status,'confirmed');
  const html=evaluationHtml(model,evidence);assert.match(html,/Participant counts conflict with the author results data/);assert.match(html,/retained for traceability/);assert.ok(html.includes(record.samples[0].count+' participants'));
  for(const mutate of [r=>r.samples[0].count++,r=>r.covariates+=' altered',r=>r.metrics[0].estimate+=1]){const changed=structuredClone(record);mutate(changed);assert.equal(sampleCountReview(model,bound,changed).status,'changed');}
  const altered=structuredClone(bound);altered.sources[0].sha256='a'.repeat(64);assert.equal(sampleCountReview(model,altered,record).status,'changed');
  assert.equal(sampleCountReview({...model,variantCount:model.variantCount-1},bound,record).status,'changed');assert.equal(sampleCountReview({...model,publication:{PMID:1}},bound,record).status,'changed');
  assert.equal(sampleCountReview(model,bound,{...record,id:'PPM1'}),null);
 }
 assert.equal(JSON.stringify({library,evidence}),before);
 const unaffected=library.models.find(m=>m.id==='PGS004118');assert.doesNotMatch(evaluationHtml(unaffected,evidence),/Participant counts conflict/);
});
