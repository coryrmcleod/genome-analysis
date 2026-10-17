import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EVALUATION_REVIEW_EXCLUSIONS,verifyEvaluationPrimaryReview} from '../scripts/pgs-evaluation-review-exclusions.mjs';
test('smoking initiation retains deposited conflicting metrics and enforces a complete-score review hold',()=>{
 const hold=EVALUATION_REVIEW_EXCLUSIONS.PGS003747;
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/evaluation/PGS003747-'+hold.sourceSha256+'.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hold.sourceSha256);
 const page=JSON.parse(bytes);assert.equal(page.next,null);assert.equal(page.results.length,4);
 const cp=page.results.find(r=>r.id==='PPM018504'),iop=page.results.find(r=>r.id==='PPM018507');
 assert.equal(cp.performance_metrics.effect_sizes[0].name_short,'OR');assert.equal(cp.performance_metrics.effect_sizes[0].estimate,0.45);
 assert.equal(iop.performance_metrics.effect_sizes[0].name_short,'OR');assert.equal(iop.performance_metrics.effect_sizes[0].estimate,-0.09);
 const row={id:'PGS003747',sources:[{sha256:hold.sourceSha256}],evaluations:page.results};
 assert.throws(()=>verifyEvaluationPrimaryReview(row),/cigarettes per day per SD/);
 row.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(row),/re-review/);
});
