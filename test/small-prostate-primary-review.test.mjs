import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {EVALUATION_REVIEW_EXCLUSIONS,verifyEvaluationPrimaryReview} from '../scripts/pgs-evaluation-review-exclusions.mjs';
import {projectEvaluationRecord} from '../scripts/pgs-evaluation-projection.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
test('four-term prostate score primary count conflict blocks publication and changed evidence requires review',()=>{
 const proof=JSON.parse(read('./fixtures/pgs/primary/small-prostate-comparison.json')),guard=EVALUATION_REVIEW_EXCLUSIONS.PGS000878;
 assert.equal(proof.id,'PGS000878');assert.equal(proof.coefficients.length,4);assert.ok(proof.coefficients.every(r=>r.matches));assert.equal(proof.primaryNormalizer,4);
 assert.deepEqual(proof.primaryCounts,{total:630,cases:506,controls:124});assert.deepEqual(proof.depositedCounts,{total:638,cases:514,controls:124});assert.equal(proof.sampleCountConflict,true);
 assert.deepEqual(proof.primaryCategoryCountRows.map(r=>r.slice(1).map(Number).reduce((a,b)=>a+b,0)),[124,506]);
 assert.equal(digest(read('./fixtures/pgs/primary/small-prostate-primary.xml')),proof.primaryXMLSHA256);
 assert.equal(digest(read('./fixtures/pgs/primary/PGS000878.txt.gz')),proof.originalSHA256);
 const bytes=read('./fixtures/pgs/evaluation/PGS000878-'+guard.sourceSha256+'.json');assert.equal(digest(bytes),guard.sourceSha256);assert.equal(proof.evaluationSHA256,guard.sourceSha256);
 const page=JSON.parse(bytes);assert.equal(page.count,1);assert.equal(page.next,null);assert.deepEqual(page.results[0],proof.record);
 const row={id:proof.id,sources:[{sha256:guard.sourceSha256}],evaluations:page.results.map(r=>projectEvaluationRecord(r,proof.id))},before=JSON.stringify(row);
 assert.throws(()=>verifyEvaluationPrimaryReview(row),/630\/506\/124/);assert.equal(JSON.stringify(row),before);
 row.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(row),/re-review/);
 row.sources[0].sha256=guard.sourceSha256;row.evaluations[0].id='PPMchanged';assert.throws(()=>verifyEvaluationPrimaryReview(row),/re-review/);
});
