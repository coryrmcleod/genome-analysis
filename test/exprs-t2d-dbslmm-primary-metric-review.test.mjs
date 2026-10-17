import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {EVALUATION_REVIEW_EXCLUSIONS,verifyEvaluationPrimaryReview} from '../scripts/pgs-evaluation-review-exclusions.mjs';
import {validateExpansionEvaluations} from '../scripts/validate-expansion-evaluations.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url))),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('complete diabetes primary metric review preserves numeric agreement but blocks ordinary AUC labeling',()=>{
 const proof=read('fixtures/pgs/primary/ExPRS-T2D-DBSLMM-metric-scope-review.json'),guard=EVALUATION_REVIEW_EXCLUSIONS.PGS003107;
 assert.equal(proof.modelId,'PGS003107');assert.equal(proof.primaryTable.matchedModelRows.length,1);assert.equal(proof.primaryTable.matchedModelRows[0].excelRow,432);assert.equal(proof.primaryTable.metricLabel,'AAUC (95% CI)');assert.equal(proof.primaryTable.matchedModelRows[0].values[8],proof.modelName);assert.equal(proof.primaryTable.matchedModelRows[0].values[11],'0.541;(0.523,0.557)');
 assert.equal(hash(fs.readFileSync(new URL('fixtures/pgs/primary/ExPRS-publisher-DataS1.xlsx',import.meta.url))),proof.sourceBindings['publisher-DataS1.xlsx']);
 const bytes=fs.readFileSync(new URL('fixtures/pgs/evaluation/PGS003107-'+guard.sourceSha256+'.json',import.meta.url));assert.equal(hash(bytes),guard.sourceSha256);const page=JSON.parse(bytes);assert.equal(page.count,1);assert.equal(page.next,null);assert.equal(page.results.length,1);assert.equal(page.results[0].id,guard.record);assert.deepEqual(page.results[0].performance_metrics.class_acc[0],proof.depositedMetric);assert.equal(proof.depositedMetric.name_short,'AUROC');assert.match(proof.primaryMethodsExcerpt,/covariate-adjusted/);assert.match(proof.primaryMethodsExcerpt,/conventional AUC/);
 const candidate={id:proof.modelId,sources:[{sha256:guard.sourceSha256}],evaluations:[{id:guard.record}]},before=JSON.stringify(candidate);assert.throws(()=>verifyEvaluationPrimaryReview(candidate),/covariate-adjusted AUC/);assert.equal(JSON.stringify(candidate),before);candidate.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(candidate),/re-review/);candidate.evaluations=[];assert.throws(()=>verifyEvaluationPrimaryReview(candidate),/re-review/);
});
test('diabetes review exclusion preserves the complete installed library evaluation inventory',()=>{
 const library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');assert.equal(library.models.length,354);assert.ok(!library.models.some(model=>model.id==='PGS003107'));assert.equal(validateExpansionEvaluations(evidence,library),evidence);
});
