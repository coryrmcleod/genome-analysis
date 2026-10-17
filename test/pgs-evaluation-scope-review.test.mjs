import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {evaluationHtml} from '../public/pgs-evaluation.js';
import {evaluationScopeReview,evaluationScopeHtml} from '../public/pgs-evaluation-scope-review.js';
import {PGS_EVALUATION_SCOPE_REVIEWS} from '../public/pgs-evaluation-scope-reviews.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('primary partial-definition notices bind all twelve records without altering scores or evidence',()=>{
 const proof=read('./fixtures/pgs/primary/Qatar-partial-evaluation-audit.json');
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/Qatar-prediabetes-tables.xlsx',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.primaryWorkbookSha256);
 assert.equal(PGS_EVALUATION_SCOPE_REVIEWS.length,12);
 const before=JSON.stringify({library,evidence});
 for(const review of PGS_EVALUATION_SCOPE_REVIEWS){
  const m=library.models.find(m=>m.id===review.id),e=evidence.models.find(e=>e.id===review.id),r=e.evaluations.find(r=>r.id===review.evaluation);
  assert.equal(evaluationScopeReview(m,e,r).status,'confirmed');
  const html=evaluationScopeHtml(m,e,r);assert.match(html,new RegExp(review.evaluatedTerms+' of '+review.fullTerms));
  if(r.sampleSet==='PSS012081')assert.match(html,/both baseline prediabetes and normoglycaemia/);else assert.match(html,/age-matched/);
  assert.match(evaluationHtml(m,evidence),/Partial scoring definition/);
  const frozen=fs.readFileSync(new URL('./fixtures/pgs/evaluation/'+m.id+'-'+review.evaluationSourceSha256+'.json',import.meta.url));
  assert.equal(createHash('sha256').update(frozen).digest('hex'),review.evaluationSourceSha256);
  assert.equal(review.primaryWorkbookSha256,proof.primaryWorkbookSha256);
 }
 assert.equal(JSON.stringify({library,evidence}),before);
});
test('changed source, score count, endpoint or metric requires scope re-review; other records stay unchanged',()=>{
 const review=PGS_EVALUATION_SCOPE_REVIEWS[0],m=library.models.find(m=>m.id===review.id),e=evidence.models.find(e=>e.id===review.id),r=e.evaluations.find(r=>r.id===review.evaluation);
 for(const changed of [{...r,endpoint:'Changed endpoint'},{...r,metrics:r.metrics.map((v,i)=>i? v:{...v,estimate:0.1})}]){
  assert.equal(evaluationScopeReview(m,e,changed).status,'changed');assert.doesNotMatch(evaluationScopeHtml(m,e,changed),/233 of 287/);
 }
 assert.equal(evaluationScopeReview({...m,variantCount:m.variantCount-1},e,r).status,'changed');
 assert.equal(evaluationScopeReview(m,{...e,sources:[]},r).status,'changed');
 assert.equal(evaluationScopeReview({...m,sourceFiles:{original:{sha256:'a'.repeat(64)}}},e,r).status,'changed');
 assert.equal(evaluationScopeReview(m,e,{...r,id:'PPM1'}),null);
 const other=library.models.find(m=>m.id==='PGS004270');assert.doesNotMatch(evaluationHtml(other,evidence),/Partial scoring definition/);
});
