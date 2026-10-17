import test from 'node:test';import assert from 'node:assert/strict';import {estimatePGS} from '../public/pgs-estimate.js';
function model(dosages=[0,2],weight=.2){return {inputFormat:'VCF',matched:1,terms:[{id:'rs1',weight:.1,status:'Called',dosage:1,contribution:.1},{id:'rs2',weight,status:'Effect orientation unresolved',genotype:'C/T',alleleMode:'effect-only',possibleDosages:dosages,contribution:null}]}}
test('missing measured dosage alternatives withhold the whole scenario before arithmetic',()=>{
 for(const population of ['none','EUR'])for(const dosages of [[0,2],[0,1]])for(let index=0;index<dosages.length;index++)for(const value of ['hole',undefined,null,NaN,Infinity,'0']){
  const changed=model([...dosages]);if(value==='hole')delete changed.terms[1].possibleDosages[index];else changed.terms[1].possibleDosages[index]=value;
  const before=structuredClone(changed),result=estimatePGS(changed,null,population);assert.equal(result.lower,null);assert.equal(result.upper,null);assert.equal(result.unconditionalLower,null);assert.equal(result.unconditionalUpper,null);assert.equal(result.bestGuess,null);assert.equal(result.assumedTerms,0);assert.equal(result.terms.length,0);assert.match(result.reason,/Resolve unresolved genotype\/model matching conflicts/);assert.deepEqual(changed,before);
 }
});
test('complete measured alternatives preserve signed contribution bounds and source arrays',()=>{
 for(const dosages of [[0,2],[0,1]])for(const weight of [.2,-.2]){
  const original=model(dosages,weight),before=structuredClone(original),result=estimatePGS(original,null,'none'),values=dosages.map(d=>d*weight);
  assert.equal(result.lower,.1+Math.min(...values));assert.equal(result.upper,.1+Math.max(...values));assert.equal(result.unconditionalLower,result.lower);assert.equal(result.unconditionalUpper,result.upper);assert.equal(result.orientationTerms,1);assert.equal(result.assumedTerms,0);assert.deepEqual(result.terms[0].dosages,dosages);assert.equal(result.bestGuess,null);assert.deepEqual(original,before);
  assert.deepEqual(estimatePGS(JSON.parse(JSON.stringify(original)),null,'none'),result);
 }
});
