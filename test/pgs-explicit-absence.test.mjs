import test from 'node:test';import assert from 'node:assert/strict';import {calculatePGS} from '../public/pgs.js';import {estimatePGS} from '../public/pgs-estimate.js';
const library=variant=>({version:'synthetic',models:[{id:'PGS999999',variantCount:1,variants:[{id:'rs1',weight:-.25,effectAllele:'A',otherAllele:'C',...variant}]}]});
const call=(presence,other='C')=>({id:'rs1',status:'Called',recordObserved:presence,alleles:['A',other],genotype:`A/${other}`,mappings:{GRCh37:{alleles:['A',other]},GRCh38:{alleles:['A',other]}}});
const score=(lib,results,build='GRCh38')=>calculatePGS(lib,{build,format:'VCF',results})[0];
test('explicitly absent called genotypes cannot contribute or receive population substitutes',()=>{
 for(const build of ['GRCh37','GRCh38'])for(const variant of [{},{alleleMode:'effect-only',otherAllele:null,effectAlleleCandidates:['A']},{kind:'reviewed-deletion',otherAllele:'AGA'}])for(const dosage of [0,1,2]){
  const other=variant.kind==='reviewed-deletion'?'AGA':'C',row=call(false,other);row.alleles=Array.from({length:2},(_,i)=>i<dosage?'A':other);row.genotype=row.alleles.join('/');
  const before=JSON.stringify(row),model=score(library(variant),[row],build),term=model.terms[0];assert.equal(model.rawSum,null);assert.equal(term.status,'Conflicting records');assert.equal(term.dosage,null);assert.equal(term.possibleDosages,null);assert.equal(term.contribution,null);assert.equal(term.recordObserved,false);assert.equal(JSON.stringify(row),before);
  const scenario=estimatePGS(model,{records:{rs1:{status:'Verified public forward mapping',populations:{EUR:{sampleCount:100,genotypes:[{genotype:'A/A',count:100}]}}}}},'EUR');assert.equal(scenario.bestGuess,null);assert.equal(scenario.assumedTerms,0);
 }
});
test('contradictory duplicate presence is order-independent and sticky',()=>{
 const lib=library({}),valid=call(),absent=call(false),expected=score(lib,[valid,absent]);assert.equal(expected.terms[0].recordObserved,null);assert.equal(expected.terms[0].status,'Conflicting records');assert.equal(expected.rawSum,null);
 for(const rows of [[absent,valid],[valid,absent,valid],[absent,valid,absent],[valid,valid,absent]])assert.deepEqual(score(lib,rows),expected);
});
test('valid observed calls and historical omitted or unknown flags retain scoring',()=>{
 const lib=library({});for(const presence of [true,null,undefined])assert.equal(score(lib,[call(presence)]).rawSum,-.25);
 assert.deepEqual(score(lib,[call(true),call(undefined)]),score(lib,[call(undefined),call(true)]));
});
