import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGS_TRAINING_SAMPLE_REVIEWS} from '../public/pgs-training-sample-reviews.js';
import {trainingSampleReview,trainingSampleReviewHtml} from '../public/pgs-training-sample-review.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const library=JSON.parse(fs.readFileSync('public/data/pgs-library.json'));
const evidence=JSON.parse(fs.readFileSync('public/data/pgs-evaluation.json'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('all training contexts reproduce exact frozen author rows and deposited metadata',()=>{
 const bytes=fs.readFileSync('test/fixtures/pgs/primary/portability-phenotype-info.csv');
 const [header,...lines]=bytes.toString().trim().split(/\r?\n/),columns=header.split(',');
 const rows=new Map(lines.map(line=>{const fields=line.split(',');assert.equal(fields.length,columns.length);return [fields[0],Object.fromEntries(columns.map((key,index)=>[key,fields[index]]))];}));
 const expected=library.models.filter(model=>model.publication?.PMID===34995502&&model.name.startsWith('portability-PLR_')).map(model=>model.id).sort();
 assert.ok(expected.length>=27);
 assert.deepEqual(PGS_TRAINING_SAMPLE_REVIEWS.map(row=>row.id).sort(),expected,'every installed score from the reviewed training resource has context');
 for(const review of PGS_TRAINING_SAMPLE_REVIEWS){
  assert.equal(hash(bytes),review.primaryTableSha256);
  const primary=rows.get(review.phenotypeKey);assert.ok(primary);
  const value=key=>primary[key]===''?null:Number(primary[key]);
  const total=value('N')??value('N_case')+value('N_control');
  assert.deepEqual(review.phenotypeTraining,{quantitative:value('N'),cases:value('N_case'),controls:value('N_control'),total});
  const metadataBytes=fs.readFileSync('test/fixtures/pgs/evidence/'+review.id+'.json');assert.equal(hash(metadataBytes),review.metadataSha256);
  const metadata=JSON.parse(metadataBytes),training=metadata.samples_training[0];assert.equal(metadata.name,'portability-PLR_'+review.phenotypeKey);
  assert.deepEqual(review.depositedTraining,{total:training.sample_number,cases:training.sample_cases,controls:training.sample_controls});
  assert.ok(total>0&&total<review.depositedTraining.total);
 }
});
test('binary and quantitative training counts render without altering score or evaluation evidence',()=>{
 const before=JSON.stringify({library,evidence});
 for(const review of PGS_TRAINING_SAMPLE_REVIEWS){
  const model=library.models.find(row=>row.id===review.id),row=evidence.models.find(row=>row.id===review.id);
  assert.equal(trainingSampleReview(model,row).status,'confirmed');
  const html=evaluationHtml(model,evidence);assert.ok(html.includes('Training sample context.'));assert.ok(html.includes(review.depositedTraining.total.toLocaleString('en-US')));
  assert.ok(html.includes(review.phenotypeTraining.total.toLocaleString('en-US')));
  assert.match(html,/not an additional cohort/);assert.match(html,/Neither count measures predictive accuracy/);
  if(review.phenotypeTraining.quantitative!==null)assert.match(html,/participants with this measurement/);
  else for(const key of ['cases','controls'])assert.ok(html.includes(review.phenotypeTraining[key].toLocaleString('en-US')+' '+key));
 }
 assert.equal(JSON.stringify({library,evidence}),before);
});
test('changed definition or evidence withdraws phenotype counts and requests re-review',()=>{
 const review=PGS_TRAINING_SAMPLE_REVIEWS[0],model=library.models.find(row=>row.id===review.id),row=evidence.models.find(row=>row.id===review.id);
 for(const change of [m=>m.name+='changed',m=>m.variantCount--,m=>m.publication.PMID=1,m=>m.sourceFiles.original.sha256='a'.repeat(64),m=>m.sourceFiles.metadata.sha256='b'.repeat(64)]){
  const changed=structuredClone(model);change(changed);assert.equal(trainingSampleReview(changed,row).status,'changed');
  const html=trainingSampleReviewHtml(changed,row);assert.match(html,/needs re-review/);assert.doesNotMatch(html,/reports an overall training cohort/);
 }
 for(const changed of [{...row,originalSha256:'c'.repeat(64)},{...row,development:{...row.development,phenotypes:[{stage:'Score development/training',definition:'Changed'}]}}])assert.equal(trainingSampleReview(model,changed).status,'changed');
 assert.equal(trainingSampleReview({id:'PGS000001'},null),null);
 assert.equal(trainingSampleReviewHtml({id:'PGS000001'},null),'');
});
