import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {developmentPrimaryReview,developmentReviewHtml} from '../public/pgs-development-review.js';
import {PGS_DEVELOPMENT_REVIEWS} from '../public/pgs-development-reviews.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const library=JSON.parse(fs.readFileSync('public/data/pgs-library.json'));
const evidence=JSON.parse(fs.readFileSync('public/data/pgs-evaluation.json'));
test('review counts match frozen primary rows and exact deposited metadata',()=>{
 const proof=JSON.parse(fs.readFileSync('test/fixtures/pgs/primary/TPMI-primary-development-table.json'));
 const workbook=fs.readFileSync('test/fixtures/pgs/primary/TPMI-primary-tables.xlsx');
 assert.equal(createHash('sha256').update(workbook).digest('hex'),proof.primaryWorkbookSha256);
 for(const review of PGS_DEVELOPMENT_REVIEWS){
  const primary=proof.values[review.primaryRow-1];
  assert.equal(String(primary[0]),review.code);
  assert.equal(primary[1],review.primaryEndpoint);
  assert.deepEqual(review.primaryDiscovery,{cases:primary[12],controls:primary[13]});
  assert.deepEqual(review.primaryTraining,{cases:primary[14],controls:primary[15]});
  assert.equal(review.primaryWorkbookSha256,proof.primaryWorkbookSha256);
  assert.ok(review.matchingOtherPrimaryRows.length);
  for(const match of review.matchingOtherPrimaryRows){
   const other=proof.values[match.row-1];
   assert.equal(String(other[0]),match.code);assert.notEqual(match.code,review.code);
   assert.equal(other[1],match.endpoint);
   assert.deepEqual(review.depositedDiscovery,{cases:other[12],controls:other[13]});
   assert.deepEqual(review.depositedTraining,{cases:other[14],controls:other[15]});
  }
  const bytes=fs.readFileSync('test/fixtures/pgs/evidence/'+review.id+'.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),review.metadataSha256);
  const metadata=JSON.parse(bytes);
  assert.deepEqual(review.depositedDiscovery,{cases:metadata.samples_variants[0].sample_cases,controls:metadata.samples_variants[0].sample_controls});
  assert.deepEqual(review.depositedTraining,{cases:metadata.samples_training[0].sample_cases,controls:metadata.samples_training[0].sample_controls});
 }
});
test('all eleven installed primary count discrepancies are visible without modifying evidence',()=>{
 assert.equal(PGS_DEVELOPMENT_REVIEWS.length,11);
 const before=JSON.stringify({library,evidence});
 for(const review of PGS_DEVELOPMENT_REVIEWS){
  const model=library.models.find(m=>m.id===review.id),row=evidence.models.find(m=>m.id===review.id);
  assert.equal(developmentPrimaryReview(model,row).status,'confirmed');
  const html=evaluationHtml(model,evidence);
  for(const counts of [review.primaryTraining,review.primaryDiscovery,review.depositedTraining,review.depositedDiscovery])assert.ok(html.includes(counts.cases+' cases and '+counts.controls+' controls'));
  assert.match(html,/does not establish an error in the scoring weights/);
 }
 assert.equal(JSON.stringify({library,evidence}),before);
});
test('changed metadata, definitions, original score or term count requires re-review',()=>{
 const review=PGS_DEVELOPMENT_REVIEWS[0],model=library.models.find(m=>m.id===review.id),row=evidence.models.find(m=>m.id===review.id);
 for(const changed of [{...model,variantCount:model.variantCount-1},{...model,sourceFiles:{...model.sourceFiles,metadata:{sha256:'a'.repeat(64)}}},{...model,sourceFiles:{...model.sourceFiles,original:{sha256:'b'.repeat(64)}}}]){
  assert.equal(developmentPrimaryReview(changed,row).status,'changed');
  assert.doesNotMatch(developmentReviewHtml(changed,row),/discovery \d/);
 }
 assert.equal(developmentPrimaryReview(model,{...row,development:{...row.development,phenotypes:[]}}).status,'changed');
 assert.equal(developmentPrimaryReview({id:'PGS000001'},{}),null);
});
