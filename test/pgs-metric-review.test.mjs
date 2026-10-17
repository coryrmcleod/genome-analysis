import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {evaluationHtml} from '../public/pgs-evaluation.js';
import {PGS_METRIC_REVIEWS} from '../public/pgs-metric-reviews.js';
import {metricPrimaryReview} from '../public/pgs-metric-review.js';
import {verifyEvaluationPrimaryReview,EVALUATION_REVIEW_EXCLUSIONS} from '../scripts/pgs-evaluation-review-exclusions.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('breast cancer fold 3 primary AUPRC conflict blocks publication with changed-source protection',()=>{
 const proof=read('./fixtures/pgs/primary/GenoBoost-breast-metric-comparison.json'),guard=EVALUATION_REVIEW_EXCLUSIONS.PGS004298;
 assert.equal(proof.fullTerms,900);assert.equal(proof.fold,3);assert.equal(proof.cells['Supplementary Figure 4c'].cell,'E165');assert.equal(proof.cells['Supplementary Figure 4c'].value,0.136456888169858);assert.equal(proof.depositedMetrics.AUPRC,0.641685169362975);
 const raw=fs.readFileSync(new URL('./fixtures/pgs/evaluation/PGS004298-'+guard.sourceSha256+'.json',import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),guard.sourceSha256);const page=JSON.parse(raw);assert.equal(page.results.length,1);assert.equal(page.results[0].id,guard.record);
 const row={id:proof.id,sources:[{sha256:guard.sourceSha256}],evaluations:[{id:guard.record}]};assert.throws(()=>verifyEvaluationPrimaryReview(row),/primary evaluation metric unresolved/);row.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(row),/re-review/);
});
test('primary discrepancies retain frozen workbook bindings and block each proposed definition',()=>{
 const proof=read('./fixtures/pgs/primary/GenoBoost-metric-comparison.json');
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/pgs/primary/GenoBoost-supplementary-data1.xlsx',import.meta.url))).digest('hex'),proof.sha256);
 assert.equal(proof.records.length,7);
 for(const row of proof.records){const review=PGS_METRIC_REVIEWS[row.id];assert.equal(review.primaryWorkbookSha256,proof.sha256);assert.equal(review.primaryAUPRC,row.primaryAUPRC);assert.equal(review.primaryAUPRCCell,row.primaryAUPRCCell);
  const bytes=fs.readFileSync(new URL('./fixtures/pgs/evaluation/'+row.id+'-'+review.evaluationSourceSha256+'.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),review.evaluationSourceSha256);
  const candidate={id:row.id,sources:[{sha256:review.evaluationSourceSha256}],evaluations:[{id:row.evaluation}]},before=JSON.stringify(candidate);
  if(row.id!=='PGS004285'){assert.throws(()=>verifyEvaluationPrimaryReview(candidate),/primary evaluation metric unresolved/);candidate.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(candidate),/re-review/);candidate.sources[0].sha256=review.evaluationSourceSha256;}
  assert.equal(JSON.stringify(candidate),before);
 }
});
test('installed Alzheimer metric notice distinguishes deposited and primary values without mutation',()=>{
 const model=library.models.find(m=>m.id==='PGS004285'),row=evidence.models.find(m=>m.id===model.id),record=row.evaluations[0],metric=record.metrics.find(m=>m.name==='AUPRC'),before=JSON.stringify({model,evidence});
 assert.equal(metricPrimaryReview(model,row,record,metric).status,'confirmed');
 const html=evaluationHtml(model,evidence);assert.match(html,/Do not use this metric/);assert.match(html,/0\.833604804388662/);assert.match(html,/Primary study AUPRC: 0\.0416733103250011/);assert.match(html,/Supplementary Figure 4c!E152/);
 assert.equal(JSON.stringify({model,evidence}),before);
 const changed=structuredClone(row);changed.sources[0].sha256='a'.repeat(64);assert.equal(metricPrimaryReview(model,changed,record,metric).status,'changed');
 const alteredMetric={...metric,estimate:0.5};assert.equal(metricPrimaryReview(model,row,record,alteredMetric).status,'changed');
 for(const mutate of [r=>r.samples[0].count++,r=>r.covariates+=' altered',r=>r.endpoint+=' altered',r=>r.metrics.find(m=>m.name!=='AUPRC').estimate+=1]){const changedRecord=structuredClone(record);mutate(changedRecord);assert.equal(metricPrimaryReview(model,row,changedRecord,changedRecord.metrics.find(m=>m.name==='AUPRC')).status,'changed');}
 for(const changedModel of [{...model,name:model.name+' altered'},{...model,variantCount:model.variantCount-1},{...model,publication:{PMID:1}}])assert.equal(metricPrimaryReview(changedModel,row,record,metric).status,'changed');
 const changedRecord=structuredClone(record);changedRecord.covariates+=' altered';const changedEvidence=structuredClone(evidence);changedEvidence.models.find(m=>m.id===model.id).evaluations[0]=changedRecord;const changedHtml=evaluationHtml(model,changedEvidence);assert.match(changedHtml,/re-review required/);assert.doesNotMatch(changedHtml,/Primary study AUPRC:/);
 assert.equal(metricPrimaryReview(model,row,{...record,id:'PPM1'},metric),null);
 assert.equal(metricPrimaryReview(model,row,record,record.metrics.find(m=>m.name!=='AUPRC')),null);
 const other=library.models.find(m=>m.id==='PGS004270');assert.doesNotMatch(evaluationHtml(other,evidence),/Do not use this metric/);
});
