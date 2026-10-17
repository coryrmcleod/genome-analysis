import test from 'node:test';import assert from 'node:assert/strict';
import {validateSaved} from '../public/workspace.js';
function snapshot(patch={}){const term={id:'rs1',weight:1,status:'Called',dosage:1,contribution:1,genotype:'A/C',effectAllele:'A',otherAllele:'C',mapping:{alleles:['A','C']},...patch};return {build:'GRCh38',stats:{records:1},warnings:[],results:[],polygenicScores:[{id:'PGS999999',matched:1,total:1,rawSum:term.contribution,terms:[term],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:50,lower:50,upper:50,measured:true}}]};}
test('saved measured DNA genotypes reject dosage and explicit model-allele contradictions',()=>{
 for(const patch of [{genotype:'A/A'},{genotype:'C/C'},{genotype:'A'},{genotype:'A/C/G'},{genotype:'G/G',dosage:0,contribution:0},{genotype:'G/G',dosage:0,contribution:0,mapping:{alleles:['A','C','G']}}]){const report=snapshot(patch),before=JSON.stringify(report);assert.throws(()=>validateSaved(JSON.parse(before)));assert.equal(JSON.stringify(report),before);}
});
test('saved measured effect-only calls retain every explicit allele direction',()=>{
 for(const patch of [{genotype:'A/A',dosage:2,contribution:2,effectAlleleCandidates:['A','C']},{effectAlleleCandidates:[]},{effectAlleleCandidates:['A',null]},{genotype:'G/G',dosage:0,contribution:0,effectAlleleCandidates:['A','C']}])assert.throws(()=>validateSaved(snapshot({alleleMode:'effect-only',otherAllele:null,...patch})));
 for(const patch of [{genotype:'A|C',effectAlleleCandidates:['A','C']},{genotype:'C/G',dosage:0,contribution:0,effectAlleleCandidates:['A','T'],mapping:{alleles:['A','T','C','G']}}])assert.equal(validateSaved(snapshot({alleleMode:'effect-only',otherAllele:null,...patch})).report.polygenicScores[0].referenceComparison.measured,true);
});
test('saved forward calls preserve phase, canonical sequence alleles and historical missing fields',()=>{
 for(const patch of [{genotype:'A|C'},{genotype:'A/A',dosage:2,contribution:2},{genotype:'C/C',dosage:0,contribution:0},{sourceEffectAllele:'T',sourceOtherAllele:'G',reverseComplemented:true},{kind:'reviewed-deletion',otherAllele:'AGA',genotype:'AGA|A',sourceOtherAllele:'AAG',inputGenotype:'0|1',inputRepresentation:{ref:'AAG',alt:'A'}},{genotype:'—'},{genotype:'0/1'},{genotype:undefined},{effectAllele:undefined}]){const report=snapshot(patch),serialized=JSON.stringify(report),parsed=JSON.parse(serialized);assert.deepEqual(validateSaved(parsed).report,parsed);assert.equal(JSON.stringify(parsed),serialized);}
 const historical=snapshot({genotype:'A/A'});delete historical.polygenicScores[0].terms[0].dosage;assert.equal(validateSaved(historical).report,historical);
});
