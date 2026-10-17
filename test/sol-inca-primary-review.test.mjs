import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {EVALUATION_REVIEW_EXCLUSIONS,verifyEvaluationPrimaryReview} from '../scripts/pgs-evaluation-review-exclusions.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
test('SOL-INCA cognitive sample count conflicts enforce source-bound whole-score admission holds',()=>{
 const tables=read('./fixtures/pgs/primary/SOL-INCA-tables.json');
 for(const [id,record,study,trait,n]of [['PGS003955','PPM019092','Jun et al.','G-Factor change',4435],['PGS003956','PPM019096','Kunkle et al.2021','SEVLT recall change',4613]]){
  const exclusion=EVALUATION_REVIEW_EXCLUSIONS[id];assert.equal(exclusion.record,record);
  const bytes=fs.readFileSync(new URL('./fixtures/pgs/evaluation/'+id+'-'+exclusion.sourceSha256+'.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),exclusion.sourceSha256);
  const deposited=JSON.parse(bytes).results.find(r=>r.id===record);assert.equal(deposited.sampleset.samples[0].sample_number,4189);
  let currentTrait='',analysis='',matched=null;
  for(const row of tables[6].slice(1)){if(row[1])currentTrait=row[1];if(row[5])analysis=row[5];if(row[0]===study&&currentTrait===trait&&analysis==='Without adjusting for APOE alleles')matched=row;}
  assert.ok(matched);assert.equal(Number(matched[2]),n);assert.notEqual(n,4189);
  const evidence={id,sources:[{sha256:exclusion.sourceSha256}],evaluations:[{id:record}]};
  assert.throws(()=>verifyEvaluationPrimaryReview(evidence),/sample count 4189 conflicts/);
  evidence.sources[0].sha256='a'.repeat(64);assert.throws(()=>verifyEvaluationPrimaryReview(evidence),/re-review/);
 }
});
