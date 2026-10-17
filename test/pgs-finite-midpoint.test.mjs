import test from 'node:test';
import assert from 'node:assert/strict';
import {finitePGSMidpoint,validatePGSNumericEnvelope} from '../public/pgs-numeric.js';
import {estimatePGS} from '../public/pgs-estimate.js';
test('finite midpoints preserve extreme, opposite-sign, zero and subnormal endpoints',()=>{
 for(const value of [Number.MAX_VALUE,-Number.MAX_VALUE,1.6e308,-1.6e308,Number.MIN_VALUE,-Number.MIN_VALUE,0,-0])assert.equal(finitePGSMidpoint(value,value),value);
 assert.equal(finitePGSMidpoint(-Number.MAX_VALUE,Number.MAX_VALUE),0);assert.equal(finitePGSMidpoint(Number.MIN_VALUE,2*Number.MIN_VALUE),2*Number.MIN_VALUE);
 for(const [a,b] of [[1.5e308,1.6e308],[-1.6e308,-1.5e308]]){const value=finitePGSMidpoint(a,b);assert.ok(Number.isFinite(value)&&value>=a&&value<=b);}
 for(const value of [NaN,Infinity,-Infinity,null,undefined,'1'])assert.throws(()=>finitePGSMidpoint(value,1));
});
test('measured finite contributions retain finite common-genotype scenario centres',()=>{
 for(const weight of [8e307,-8e307,Number.MAX_VALUE/2,Number.MIN_VALUE,-Number.MIN_VALUE,1e-100,-1e-100]){
  const term={id:'rs1',weight,status:'Called',dosage:2,contribution:2*weight,genotype:'A/A',effectAllele:'A',otherAllele:'C',mapping:{alleles:['A','C']}},model={id:'PGS999999',inputFormat:'VCF',matched:1,total:1,rawSum:term.contribution,terms:[term]};validatePGSNumericEnvelope(model.terms);const before=JSON.stringify(model);
  for(const population of ['none','EUR']){const result=estimatePGS(model,null,population);assert.equal(result.lower,term.contribution);assert.equal(result.upper,term.contribution);assert.equal(result.bestGuess,term.contribution);assert.equal(result.point,term.contribution);}
  assert.equal(JSON.stringify(model),before);
 }
});
test('a finite population-modal contribution is preserved without shrinking full unresolved bounds',()=>{
 const model={id:'PGS999999',inputFormat:'VCF',matched:1,total:2,rawSum:null,terms:[{id:'rs0',weight:0,status:'Called',dosage:0,contribution:0},{id:'rs1',weight:8e307,status:'Not observed',dosage:null,contribution:null,effectAllele:'A',otherAllele:'C',genotype:'—'}]},reference={records:{rs1:{status:'Verified public forward mapping',populations:{EUR:{sampleCount:503,genotypes:[{genotype:'A/A',count:503}]}}}}};
 const result=estimatePGS(model,reference,'EUR');assert.equal(result.bestGuess,1.6e308);assert.equal(result.terms[0].centralContribution,1.6e308);assert.equal(result.unconditionalLower,0);assert.equal(result.unconditionalUpper,1.6e308);assert.equal(result.assumedTerms,1);
});
