import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {loadAncestryReference} from '../public/ancestry-reference-loader.js';import {estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';import {ancestryHtml} from '../public/ancestry-view.js';import {validateAncestryNumericalVerification} from '../public/ancestry-numerical-verification.js';
const bytes=fs.readFileSync('public/data/ancestry-reference.json'),evidenceBytes=fs.readFileSync('public/data/ancestry-numerical-verification.json'),evidence=JSON.parse(evidenceBytes);
test('numerical evidence preserves successful public fits on both builds and survives restoration',async()=>{
 const panel=await loadAncestryReference(new Response(bytes),new Response(evidenceBytes));
 const original=await loadAncestryReference(new Response(bytes));
 const fixtures=JSON.parse(fs.readFileSync('test/fixtures/ancestry/public-fixtures.json'));
 for(const build of ['GRCh37','GRCh38'])for(const fixture of fixtures){
  const report={build,format:'VCF',results:panel.markers.map((marker,i)=>({id:marker.id,status:fixture.dosages[i]===null?'No call':'Called',alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[i]?marker.alt:marker.mappings[build].ref)}))};
  const before=JSON.stringify(report),result=estimateAncestry(report,panel),baseline=estimateAncestry(report,original);
  assert.equal(result.status,'Estimated');assert.equal(JSON.stringify(report),before);
  assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(result))),result);
  assert.deepEqual(result.numericalVerification,evidence);
  const withoutEvidence=structuredClone(result);delete withoutEvidence.numericalVerification;
  assert.deepEqual(withoutEvidence,baseline,'Optional calculation evidence must not change fitted results');
  assert.match(ancestryHtml(result),/Independent calculation checks/);
  assert.doesNotMatch(ancestryHtml(baseline),/Independent calculation checks/);
 }
});
test('optional numerical evidence binds the exact reference and reaches saved results and display',async()=>{
 const panel=await loadAncestryReference(new Response(bytes),new Response(evidenceBytes));assert.deepEqual(panel.numericalVerification,evidence);const result=estimateAncestry({build:'GRCh38',format:'VCF',results:[]},panel);assert.equal(result.status,'Unavailable');assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(result))),result);const html=ancestryHtml(result);assert.ok(html.includes('646 held-out public individuals'));assert.ok(html.includes('636 of 646'));assert.ok(html.includes('10 were withheld'));assert.ok(html.includes('not family-history accuracy or personal ancestry precision'));
 const historical=structuredClone(result);delete historical.numericalVerification;assert.equal(validateSavedAncestry(historical),historical);assert.ok(!ancestryHtml(historical).includes('Independent calculation checks'));
});
test('absent, malformed or mismatched optional evidence leaves the original reference usable',async()=>{
 for(const response of [null,new Response('missing',{status:404}),new Response('{'),new Response(JSON.stringify({...evidence,referenceSha256:'0'.repeat(64)}))]){const panel=await loadAncestryReference(new Response(bytes),response);assert.equal(panel.markers.length,11345);assert.equal(panel.numericalVerification,undefined);}
 const changed=JSON.parse(bytes);changed.note='Different exact reference bytes';changed.numericalVerification=evidence;const panel=await loadAncestryReference(new Response(JSON.stringify(changed)),new Response(evidenceBytes));assert.equal(panel.numericalVerification,undefined);
});
test('restored numerical evidence rejects contradictory cohorts, unsupported agreement and provenance',async()=>{
 const panel=await loadAncestryReference(new Response(bytes),new Response(evidenceBytes)),result=estimateAncestry({build:'GRCh38',format:'VCF',results:[]},panel),before=JSON.stringify(result);
 for(const change of [e=>e.referenceSha256='0'.repeat(64),e=>e.original.components=6,e=>e.original.estimated=645,e=>e.missing.withheld=9,e=>e.missing.cases=645,e=>e.missing.maximumFractionDifference=NaN,e=>e.original.maximumFractionDifference=2.1e-7,e=>e.original.maximumResidualDifference=1.1e-7,e=>e.missing.excludedMarkerStep=1,e=>e.original.independentProofSha256='unknown',e=>e.scope='',e=>delete e.original]){const changed=structuredClone(result);change(changed.numericalVerification);assert.throws(()=>validateSavedAncestry(changed),/numerical verification/);assert.ok(!ancestryHtml(changed).includes('Independent calculation checks'));}
 assert.throws(()=>validateAncestryNumericalVerification(evidence,evidence.referenceSha256,645));assert.equal(JSON.stringify(result),before);
});
