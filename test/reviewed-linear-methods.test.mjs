import test from 'node:test';
import assert from 'node:assert/strict';
import {REVIEWED_LINEAR_METHODS,verifyReviewedLinearMethod} from '../scripts/reviewed-linear-methods.mjs';
import {methodEvidenceHtml} from '../public/pgs-method-evidence.js';

test('reviewed NR methods cannot authorize another deposit or changed coefficients',()=>{
 for(const e of Object.values(REVIEWED_LINEAR_METHODS)){
  const meta={id:e.id,publication:{PMID:Number(e.publicationPMID)},name:e.name,method_name:e.methodName,variants_number:e.count,variants_interactions:0,weight_type:'NR',matches_publication:true};
  const before=JSON.stringify(meta);
  assert.deepEqual(verifyReviewedLinearMethod(meta,e.originalSha256,e.sourceSha256),e);
  for(const patch of [{id:'PGS999999'},{publication:{PMID:1}},{name:'different'},{method_name:'unweighted'},{variants_number:e.count-1},{variants_interactions:1},{weight_type:'OR'},{matches_publication:false}])assert.throws(()=>verifyReviewedLinearMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
  assert.throws(()=>verifyReviewedLinearMethod(meta,'0'.repeat(64),e.sourceSha256));
  assert.throws(()=>verifyReviewedLinearMethod(meta,e.originalSha256,'0'.repeat(64)));
  assert.equal(JSON.stringify(meta),before);
  assert.match(e.method,/Catalog weight type remains NR/);
 }
});

test('reviewed primary PDF links are restricted to the exact model and URL',()=>{
 for(const id of ['PGS000043','PGS000137']){
  const e=REVIEWED_LINEAR_METHODS[id],m={id,sourceWeightType:'NR',sourceFiles:{original:{sha256:e.originalSha256}},additiveMethodEvidence:{...e}};
  assert.match(methodEvidenceHtml(m),/Primary methods source/);
  assert.equal(methodEvidenceHtml({...m,additiveMethodEvidence:{...e,sourceURL:e.sourceURL+'?other=1'}}),'');
  assert.equal(methodEvidenceHtml({...m,id:'PGS999999',additiveMethodEvidence:{...e,id:'PGS999999'}}),'');
 }
});
