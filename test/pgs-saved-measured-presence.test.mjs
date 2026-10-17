import test from 'node:test';import assert from 'node:assert/strict';import {validateSaved} from '../public/workspace.js';
function snapshot(presence,measured=true){const term={id:'rs1',weight:1,status:measured?'Called':'Not observed',dosage:measured?1:null,contribution:measured?1:null,genotype:measured?'A/C':'—',effectAllele:'A',otherAllele:'C'};if(presence!==undefined)term.recordObserved=presence;return {build:'GRCh38',stats:{records:measured?1:0},warnings:[],results:[],polygenicScores:[{id:'PGS999999',matched:measured?1:0,total:1,rawSum:measured?1:null,terms:[term],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:measured?50:null,lower:0,upper:100,measured}}]};}
test('saved measured ranks cannot contradict an explicit unobserved contributing call',()=>{
 for(const dosage of [0,1,2])for(const weight of [-2,0,2]){
  const report=snapshot(false),model=report.polygenicScores[0];Object.assign(model.terms[0],{dosage,weight,contribution:dosage*weight,genotype:['C/C','A/C','A/A'][dosage]});model.rawSum=dosage*weight;
  const before=JSON.stringify(report);assert.throws(()=>validateSaved(JSON.parse(before)),/explicitly unobserved/);assert.equal(JSON.stringify(report),before);
 }
});
test('observed and historical presence records remain compatible with measured or hypothetical results',()=>{
 for(const presence of [true,null,undefined]){const report=snapshot(presence),before=JSON.stringify(report);assert.deepEqual(validateSaved(JSON.parse(before)).report,JSON.parse(before));assert.equal(JSON.stringify(report),before);}
 const hypothetical=snapshot(false,false);assert.equal(validateSaved(hypothetical).report,hypothetical);
});
