import test from 'node:test';import assert from 'node:assert/strict';import {estimatePGS} from '../public/pgs-estimate.js';
const observed={id:'rs1',effectAllele:'A',otherAllele:'G',weight:1,dosage:1,contribution:1,status:'Called'};
const missing={id:'rs2',effectAllele:'C',otherAllele:'T',weight:-2,dosage:null,contribution:null,status:'Not observed',genotype:'—'};
const model=(terms)=>({inputFormat:'VCF',matched:1,terms:[observed,...terms]});
const ref=(genotypes)=>({records:{rs2:{status:'Verified public forward mapping',populations:{EUR:{sampleCount:10,genotypes}}}}});
test('unavailable scenarios distinguish absence from input and matching failures',()=>{
 const absent={inputFormat:'VCF',matched:0,terms:[missing]};
 const e=estimatePGS(absent,null,'EUR');assert.equal(e.bestGuess,null);assert.match(e.reason,/No usable measured/);assert.doesNotMatch(e.reason,/matching conflicts/);
 const consumer=estimatePGS({...absent,inputFormat:'23andMe'},null,'EUR');assert.match(consumer.reason,/consumer-array/);
 const conflict=estimatePGS({...absent,terms:[{...missing,status:'Overlapping records'}]},null,'EUR');assert.match(conflict.reason,/matching conflicts/);assert.equal(conflict.lower,null);
});

test('small nonzero coefficients retain unresolved dosage intervals',()=>{
 for(const scale of [1e-100,1e-15,1,1e15]){
  const e=estimatePGS({inputFormat:'VCF',matched:1,terms:[{...observed,weight:scale,contribution:scale},{...missing,weight:-2*scale}]},null,'EUR');
  assert.equal(e.point,null);assert.ok(e.lower<e.upper);assert.equal(e.unresolvedTerms,1);
 }
});
test('uses observed genotype mode including heterozygotes; preserves measured terms',()=>{const m=model([missing]);const e=estimatePGS(m,ref([{genotype:'C/T',count:6},{genotype:'T/T',count:4}]),'EUR');assert.equal(e.point,-1);assert.equal(e.assumedTerms,1);assert.equal(m.terms[1].contribution,null);assert.equal(e.unconditionalLower,-3);assert.equal(e.unconditionalUpper,1);});
test('known palindromic genotype is not overwritten by a population mode',()=>{const e=estimatePGS(model([{...missing,effectAllele:'A',otherAllele:'T',status:'Strand ambiguous',genotype:'A/A'}]),ref([{genotype:'A/T',count:10}]),'EUR');assert.equal(e.point,null);assert.equal(e.assumedTerms,0);assert.equal(e.orientationTerms,1);assert.equal(e.lower,-3);assert.equal(e.upper,1);});
test('tied modes, absent frequencies, and unmodeled alleles retain uncertainty',()=>{for(const r of [null,ref([{genotype:'C/C',count:5},{genotype:'T/T',count:5}]),ref([{genotype:'A/A',count:10}])]){const e=estimatePGS(model([missing]),r,'EUR');assert.equal(e.point,null);assert.equal(e.lower,-3);assert.equal(e.upper,1);}});
test('consumer input and incompatible model genotypes are not given an estimate',()=>{assert.equal(estimatePGS({...model([missing]),inputFormat:'23andMe'},null).lower,null);assert.equal(estimatePGS(model([{...missing,status:'Model allele mismatch'}]),null).lower,null);});

test('unknown or structurally withheld call statuses cannot turn into hypothetical missing genotypes',()=>{
 for(const status of ['Stream withheld','Duplicate records','Unsupported representation','Unsupported build','Normalization required','Unrecognized future status',undefined]){
  const e=estimatePGS(model([{...missing,status}]),ref([{genotype:'C/C',count:10}]),'EUR');assert.equal(e.bestGuess,null);assert.equal(e.lower,null);assert.equal(e.unconditionalLower,null);assert.equal(e.assumedTerms,0);
 }
});

test('central scenario retains signed bounds and identifies neutral orientation assumptions',()=>{
 const m=model([{...missing,effectAllele:'A',otherAllele:'T',status:'Strand ambiguous',genotype:'A/A'}]),before=structuredClone(m);
 const e=estimatePGS(m,ref([{genotype:'A/T',count:10}]),'EUR');
 assert.equal(e.bestGuess,-1);assert.equal(e.point,null);assert.equal(e.neutralTerms,1);assert.equal(e.assumedTerms,0);assert.equal(e.terms[0].centralContribution,-2);assert.match(e.terms[0].centralMethod,/Neutral midpoint/);assert.deepEqual(m,before);
 assert.ok(e.bestGuess>=e.unconditionalLower&&e.bestGuess<=e.unconditionalUpper);assert.equal(e.percentile,null);
});
test('common genotype best guess never collapses the full missing-genotype bounds',()=>{
 const e=estimatePGS(model([missing]),ref([{genotype:'C/T',count:6},{genotype:'T/T',count:4}]),'EUR');
 assert.equal(e.bestGuess,-1);assert.equal(e.lower,e.upper);assert.equal(e.unconditionalLower,-3);assert.equal(e.unconditionalUpper,1);assert.equal(e.neutralTerms,0);
 const absent=estimatePGS(model([missing]),null,'EUR');assert.equal(absent.bestGuess,-1);assert.equal(absent.neutralTerms,1);assert.equal(absent.assumedTerms,0);assert.equal(absent.unresolvedTerms,1);
});
test('no-substitution and incompatible calls never acquire a guessed score or percentile',()=>{
 assert.equal(estimatePGS(model([missing]),null,'none').bestGuess,null);
 for(const status of ['Model allele mismatch','Conflicting records','Overlapping records']){const e=estimatePGS(model([{...missing,status}]),null,'EUR');assert.equal(e.bestGuess,null);assert.equal(e.lower,null);}
 assert.match(estimatePGS(model([missing]),null,'EUR').percentileReason,/correlations/);
});
