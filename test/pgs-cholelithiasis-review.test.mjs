import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGS_CHOLELITHIASIS_REVIEWS} from '../public/pgs-cholelithiasis-reviews.js';
import {cholelithiasisReview,cholelithiasisHtml} from '../public/pgs-cholelithiasis-review.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const lib=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('gallstone primary comparison notice preserves both full records and requires exact evidence binding',()=>{
 const proof=read('./fixtures/pgs/primary/cholelithiasis-evaluation-review.json'),bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/cholelithiasis-primary-core.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.source.sha256);
 const article=JSON.parse(bytes).resultList.result[0];assert.equal(article.pmid,'38548025');assert.equal(article.doi,'10.1016/j.ypmed.2024.107942');
 assert.match(article.abstractText,/quintile 1/);assert.match(article.abstractText,/quintile 5/);assert.match(article.abstractText,/24%/);assert.match(article.abstractText,/1\.16-1\.32/);assert.match(article.abstractText,/1\.98/);assert.match(article.abstractText,/1\.67-2\.35/);
 assert.deepEqual(PGS_CHOLELITHIASIS_REVIEWS,proof.reviews);assert.equal(proof.reviews.length,2);
 const model=lib.models.find(m=>m.id==='PGS012582'),bound=evidence.models.find(m=>m.id===model.id),before=JSON.stringify({model,bound});assert.deepEqual(bound,proof.completeEvaluationEvidence);assert.deepEqual(model,proof.completeModel);
 for(const record of bound.evaluations){
  assert.equal(cholelithiasisReview(model,bound,record).status,'confirmed');
  for(const mutate of [r=>r.metrics[0].name+=' changed',r=>r.metrics[0].estimate++,r=>r.samples[0].count++,r=>r.covariates+=' changed',r=>r.comments+=' changed']){const changed=structuredClone(record);mutate(changed);assert.equal(cholelithiasisReview(model,bound,changed).status,'changed');assert.match(cholelithiasisHtml(model,bound,changed),/needs re-review/);}
  const changed=structuredClone(bound);changed.sources[0].sha256='a'.repeat(64);assert.equal(cholelithiasisReview(model,changed,record).status,'changed');
  assert.equal(cholelithiasisReview({...model,variantCount:12},bound,record).status,'changed');assert.equal(cholelithiasisReview({...model,publication:{...model.publication,PMID:0}},bound,record).status,'changed');
 }
 const html=evaluationHtml(model,evidence);assert.match(html,/highest and lowest quintiles \(fifths\)/);assert.match(html,/tertile label must not be used/);assert.match(html,/combined comparison/);assert.match(html,/does not verify every scoring coefficient/);assert.match(html,/Hazard ratio \(HR, high vs low tertile\): 1\.24/);assert.match(html,/1\.98/);assert.match(html,/317640 participants/);assert.equal(JSON.stringify({model,bound}),before);
 assert.equal(cholelithiasisReview(model,bound,{id:'PPM0'}),null);const other=lib.models.find(m=>m.id==='PGS012520');assert.doesNotMatch(evaluationHtml(other,evidence),/tertile label must not be used/);
});
