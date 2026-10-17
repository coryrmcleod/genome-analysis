import {INSULIN_RESISTANCE_METHOD} from '../scripts/insulin-resistance-method.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {methodEvidenceHtml} from '../public/pgs-method-evidence.js';
import {SICCA_ADDITIVE_METHOD} from '../scripts/pgs-weight-evidence.mjs';
test('reviewed method display requires exact score binding and safe escaped evidence',()=>{
 const p=SICCA_ADDITIVE_METHOD,m={id:p.id,weightType:'NR',sourceWeightType:'NR',sourceFiles:{original:{sha256:p.originalSha256}},additiveMethodEvidence:{...p}},before=JSON.stringify(m);
 assert.match(methodEvidenceHtml(m),/weight-type label: NR/);assert.match(methodEvidenceHtml(m),/unchanged/);assert.equal(JSON.stringify(m),before);
 for(const patch of [{id:'PGS999999'},{originalSha256:'0'.repeat(64)},{sourceURL:'javascript:alert(1)'},{sourceURL:'https://example.org'},{sourceSha256:'bad'}])assert.equal(methodEvidenceHtml({...m,additiveMethodEvidence:{...p,...patch}}),'');
 m.additiveMethodEvidence.method='<img src=x>';assert.match(methodEvidenceHtml(m),/&lt;img/);assert.doesNotMatch(methodEvidenceHtml(m),/<img/);assert.equal(methodEvidenceHtml({}),'');
});

test('insulin methods link is limited to the reviewed Oxford document and model',()=>{
 const p=INSULIN_RESISTANCE_METHOD,m={id:p.id,sourceWeightType:'Unweighted',sourceFiles:{original:{sha256:p.originalSha256}},additiveMethodEvidence:p};
 assert.match(methodEvidenceHtml(m),/Oxford|ora\.ox\.ac\.uk/);assert.match(methodEvidenceHtml(m),/unit weights/);
 assert.equal(methodEvidenceHtml({...m,id:'PGS000878',additiveMethodEvidence:{...p,id:'PGS000878'}}),'');
 assert.equal(methodEvidenceHtml({...m,additiveMethodEvidence:{...p,sourceURL:'https://ora.ox.ac.uk/another-document'}}),'');
});
