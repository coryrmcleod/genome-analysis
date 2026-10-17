import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {discoveryCitationReview,discoveryCitationHtml} from '../public/pgs-discovery-citation-review.js';
import {PGS_DISCOVERY_CITATION_REVIEWS} from '../public/pgs-discovery-citation-reviews.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('discovery citation notice binds primary source identities and exact deposited discovery context',()=>{
 const fixture=read('./fixtures/pgs/primary/Cystatin-discovery-citation-review.json'),review=fixture.review;
 assert.deepEqual(PGS_DISCOVERY_CITATION_REVIEWS,[review]);
 for(const source of review.sourceProofs){const name=source.destination.split('/').at(-1),bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/Cystatin-'+name,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);}
 const primary=read('./fixtures/pgs/primary/Cystatin-PMID27920155.json').resultList.result[0],wrong=read('./fixtures/pgs/primary/Cystatin-PMID28932557.json').resultList.result[0];
 assert.equal(primary.id,'27920155');assert.equal(primary.doi.toLowerCase(),'10.1681/asn.2016020131');assert.equal(wrong.id,'28932557');assert.match(wrong.title,/lung cancer/);
 const page=fs.readFileSync(new URL('./fixtures/pgs/primary/Cystatin-ckdgen-Li2017.html',import.meta.url),'utf8');assert.match(page,/27920155/);assert.match(page,/Published_eGFRcys_overall_EA.csv.gz/);
 const model=library.models.find(m=>m.id===review.id),bound=evidence.models.find(m=>m.id===review.id),before=JSON.stringify({model,bound});
 assert.equal(discoveryCitationReview(model,bound).status,'confirmed');assert.match(evaluationHtml(model,evidence),/Discovery citation mismatch/);assert.match(evaluationHtml(model,evidence),/All six original coefficients match/);assert.equal(JSON.stringify({model,bound}),before);
 for(const change of [m=>m.variantCount++,m=>m.name+=' changed',m=>m.sourceFiles.original.sha256='a'.repeat(64),m=>m.sourceFiles.metadata.sha256='b'.repeat(64),m=>m.studySamples.variantAssociation[0].source_PMID=27920155,m=>m.studySamples.variantAssociation[0].sample_number++,m=>m.publication.PMID=1]){const changed=structuredClone(model);change(changed);assert.equal(discoveryCitationReview(changed,bound).status,'changed');assert.doesNotMatch(discoveryCitationHtml(changed,bound),/All six original coefficients match/);}
 const changed=structuredClone(bound);changed.development.phenotypes[0].definition+=' changed';assert.equal(discoveryCitationReview(model,changed).status,'changed');
 const other=library.models.find(m=>m.id==='PGS003200');assert.equal(discoveryCitationReview(other,bound),null);assert.doesNotMatch(evaluationHtml(other,evidence),/Discovery citation mismatch/);
});
