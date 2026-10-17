import test from 'node:test';
import assert from 'node:assert/strict';
import {empiricalPercentile,referenceDefinition,referencePercentile,validateScoreReference} from '../public/pgs-reference.js';
const model={id:'PGS000001',effectType:'additive',build:'GRCh38',inputFormat:'VCF',rawSum:null,terms:[{id:'rs1',weight:1,effectAllele:'A',otherAllele:'G',mapping:{chrom:'1',position:10,ref:'G',alleles:['A','G']}}]};
const definition=referenceDefinition(model,'GRCh38');
const library={version:'1.0.0',population:'EUR',retrievedAt:'2026-09-08',models:[{id:model.id,status:'Available',sampleCount:100,scores:Array.from({length:100},(_,i)=>i/50),definitions:{GRCh37:'other build',GRCh38:definition},modelSha256:'a'.repeat(64)}]};
test('empirical percentile uses midranks and bounded tails without Gaussian extrapolation',()=>{
 assert.equal(empiricalPercentile([0,1,1,2],1),50);
 assert.equal(empiricalPercentile([0,1,1,2],-1),0);
 assert.equal(empiricalPercentile([0,1,1,2],3),100);
 assert.equal(empiricalPercentile([0,1,1,2],1+1e-12),50);
 assert.throws(()=>empiricalPercentile([],1));
 assert.throws(()=>empiricalPercentile([0,NaN],1));
});

test('published coefficient units do not collapse small-score percentile distinctions',()=>{
 for(const scale of [1e-100,1e-15,1,1e15,1e100]){
  assert.equal(empiricalPercentile([0,scale,scale,2*scale],scale),50);
  assert.equal(empiricalPercentile([0,scale,scale,2*scale],0),12.5);
  assert.equal(empiricalPercentile([0,scale,scale,2*scale],1.5*scale),75);
 }
});
test('incomplete scenario maps raw bounds monotonically and retains provenance',()=>{
 const estimate={bestGuess:1,unconditionalLower:0,unconditionalUpper:2};
 const snapshot=JSON.stringify({model,estimate,library});
 const r=referencePercentile(model,estimate,validateScoreReference(library));
 assert.equal(r.point,50.5);assert.equal(r.lower,0.5);assert.equal(r.upper,100);assert.equal(r.measured,false);assert.equal(r.sampleCount,100);assert.match(r.reason,/not a confidence interval/);
 assert.equal(JSON.stringify({model,estimate,library}),snapshot);
});
test('complete measured score ignores hypothetical center and has no missing-term interval',()=>{
 const r=referencePercentile({...model,rawSum:0.5},{bestGuess:1,unconditionalLower:0,unconditionalUpper:2},library);
 assert.equal(r.point,25.5);assert.equal(r.lower,r.point);assert.equal(r.upper,r.point);assert.equal(r.measured,true);
});
test('missing reference, other populations, conflicts, allele or build changes never yield percentiles',()=>{
 const e={bestGuess:1,unconditionalLower:0,unconditionalUpper:2};
 for(const m of [{...model,build:'GRCh37'},{...model,terms:[{...model.terms[0],weight:2}]},{...model,terms:[{...model.terms[0],effectAllele:'G'}]}])assert.equal(referencePercentile(m,e,library).point,null);
 assert.equal(referencePercentile(model,e,null).point,null);
 assert.equal(referencePercentile(model,e,library,'EAS').point,null);
 assert.equal(referencePercentile(model,{...e,unconditionalLower:null},library).point,null);
 assert.equal(referencePercentile(model,e,{models:[{id:model.id,status:'Unavailable',reason:'Unresolved allele orientation'}]}).point,null);
});
test('reference validation rejects unsorted, incomplete or degenerate distributions',()=>{
 for(const scores of [[1,2],Array(100).fill(1),Array.from({length:100},(_,i)=>100-i)])assert.throws(()=>validateScoreReference({...library,models:[{...library.models[0],scores}]}));
});
