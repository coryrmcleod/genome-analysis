import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePGS} from '../public/pgs.js';
import {estimatePGS} from '../public/pgs-estimate.js';
const term={id:'rs999999',effectAllele:'A',otherAllele:'G',weight:1,weightText:'1'};
const models=[{id:'PGS999999',variantCount:1,variants:[term]},{id:'PGS999998',variantCount:1,variants:[{...term,otherAllele:undefined,effectAlleleCandidates:['A'],alleleMode:'effect-only'}]}];
test('PGS never converts absent diploid array entries into measured zero dosage',()=>{
 for(const model of models)for(const build of ['GRCh37','GRCh38']){
  const score=alleles=>calculatePGS({version:'synthetic',models:[model]},{build,format:'VCF',results:[{id:term.id,status:'Called',alleles,genotype:'SYNTHETIC',mappings:{[build]:{alleles:['G','A']}}}]})[0];
  const sparse=['G',,];
  for(const alleles of [sparse,Array(2),[, 'A'],[undefined,'A'],[null,'A'],['','A'],'GA',{0:'G',1:'A',length:2},new Uint8Array([0,1])]){
   const actual=score(alleles);assert.equal(actual.rawSum,null);assert.equal(actual.matchedSubtotal,null);assert.equal(actual.matched,0);assert.equal(actual.terms.length,1);assert.equal(actual.terms[0].genotype,'SYNTHETIC');assert.equal(actual.terms[0].dosage,null);assert.equal(actual.terms[0].contribution,null);assert.equal(actual.terms[0].status,'Model allele mismatch');assert.match(actual.terms[0].note,/two explicit allele calls/);assert.equal(estimatePGS(actual,null,'EUR').bestGuess,null);
  }
  assert.equal(Object.hasOwn(sparse,1),false);
  for(const [alleles,dosage] of [[['G','G'],0],[['G','A'],1],[['A','G'],1],[['A','A'],2]]){
   const before=JSON.stringify(alleles),actual=score(alleles);assert.equal(actual.rawSum,dosage);assert.equal(actual.matched,1);assert.equal(actual.terms[0].dosage,dosage);assert.equal(actual.status,'Complete raw sum');assert.equal(JSON.stringify(alleles),before);
  }
 }
});
