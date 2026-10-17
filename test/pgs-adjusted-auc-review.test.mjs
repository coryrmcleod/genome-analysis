import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {adjustedAUCReview} from '../public/pgs-adjusted-auc-review.js';
import {PGS_ADJUSTED_AUC_REVIEWS} from '../public/pgs-adjusted-auc-reviews.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const library=read('../public/data/pgs-library.json'),activeEvidence=read('../public/data/pgs-evaluation.json'),historical=read('./fixtures/pgs/primary/FinnGen-R4-coordinate-retirement-review.json');
const evidence={...activeEvidence,models:[...activeEvidence.models,historical.retiredEvaluation]};
test('historical adjusted AUC notice retains its exact source binding after source-definition withdrawal',()=>{
 const proof=read('./fixtures/pgs/primary/ExPRS-adjusted-auc-comparison.json');
 for(const [name,sha] of [['author-primary.pdf',proof.primaryPDFSHA256],['prs_models.tsv',proof.authorTableSHA256]])assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/pgs/primary/ExPRS-'+name,import.meta.url))).digest('hex'),sha);
 assert.deepEqual(proof.reviews,PGS_ADJUSTED_AUC_REVIEWS);assert.equal(proof.reviews.length,1);
 const review=proof.reviews[0],model=historical.retiredModel,bound=evidence.models.find(row=>row.id===review.id),record=bound.evaluations.find(row=>row.id===review.record.id),before=JSON.stringify({model,evidence});
 assert.equal(model.id,review.id);assert.ok(!library.models.some(row=>row.id===model.id));
 const table=fs.readFileSync(new URL('./fixtures/pgs/primary/ExPRS-prs_models.tsv',import.meta.url),'utf8').trim().split(/\r?\n/),headers=table.shift().split('\t');
 const rows=table.map(line=>Object.fromEntries(line.split('\t').map((value,index)=>[headers[index],value]))),author=rows.filter(row=>row.prs_id===review.authorRowID);assert.equal(author.length,1);assert.equal(Number(author[0].aauc),review.primaryAAUC);assert.equal(author[0].aauc_ci,review.primaryInterval);assert.equal(Number(author[0].snp_count),model.variantCount);
 const metric=record.metrics.find(row=>row.name==='Area Under the Receiver-Operating Characteristic Curve');assert.equal(metric.estimate,review.primaryAAUC);assert.equal([metric.lower,metric.upper].join('-'),review.primaryInterval);
 assert.equal(adjustedAUCReview(model,bound,record).status,'confirmed');const html=evaluationHtml(model,evidence);assert.match(html,/covariate-adjusted AUC/);assert.match(html,/depends on their distribution/);assert.match(html,/Area Under the Receiver-Operating Characteristic Curve: 0\.504/);assert.equal(JSON.stringify({model,evidence}),before);
 for(const change of [row=>row.metrics[0].estimate+=1,row=>row.covariates+=' altered',row=>row.samples[0].count+=1]){const changed=structuredClone(record);change(changed);assert.equal(adjustedAUCReview(model,bound,changed).status,'changed');}
 const changed=structuredClone(bound);changed.sources[0].sha256='a'.repeat(64);assert.equal(adjustedAUCReview(model,changed,record).status,'changed');
 assert.equal(adjustedAUCReview({...model,variantCount:model.variantCount-1},bound,record).status,'changed');assert.equal(adjustedAUCReview(model,bound,{...record,id:'PPM1'}),null);
 const other=library.models.find(row=>row.id==='PGS003310');assert.doesNotMatch(evaluationHtml(other,evidence),/Metric definition: the study reports covariate-adjusted/);
});
