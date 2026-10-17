import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePGS} from '../public/pgs.js';
import {estimatePGS} from '../public/pgs-estimate.js';
const variant={id:'rs999999',effectAllele:'A',otherAllele:'G',weight:1,weightText:'1'};
const models=[{id:'PGS999999',variantCount:1,variants:[variant]},{id:'PGS999998',variantCount:1,variants:[{...variant,otherAllele:undefined,alleleMode:'effect-only',effectAlleleCandidates:['A']}]}];
test('direct PGS scorer withholds conflicting duplicates regardless of order and preserves identical diploid calls',()=>{
 for(const model of models)for(const build of ['GRCh37','GRCh38']){
  const call=alleles=>({id:variant.id,status:'Called',alleles,genotype:alleles.join('/'),mappings:{[build]:{chrom:'1',position:100,ref:'G',alleles:['G','A']}}});
  const first=call(['A','A']),second=call(['G','G']),heterozygous=call(['A','G']),reversed=call(['G','A']);
  const calculate=results=>calculatePGS({version:'synthetic',models:[model]},{build,format:'VCF',results})[0];
  const snapshot=JSON.stringify({model,first,second,heterozygous,reversed});
  for(const results of [[first,second],[second,first],[first,second,first],[first,{...first,status:'No call'}],[{...first,status:'No call'},first]]){
   const score=calculate(results);assert.equal(score.rawSum,null);assert.equal(score.matchedSubtotal,null);assert.equal(score.matched,0);assert.equal(score.terms[0].status,'Conflicting records');assert.equal(score.terms[0].genotype,'—');assert.equal(score.terms[0].contribution,null);assert.equal(score.terms[0].dosage,null);assert.deepEqual(score.terms[0].mapping,first.mappings[build]);assert.equal(estimatePGS(score,null,'EUR').bestGuess,null);
  }
  assert.deepEqual(calculate([first,first]),calculate([first]));
  // Phasing/order and unrelated reporting fields do not change additive dosage.
  for(const results of [[heterozygous,reversed],[reversed,heterozygous]]){const score=calculate(results);assert.equal(score.rawSum,1);assert.equal(score.matched,1);assert.equal(score.terms[0].dosage,1);assert.equal(score.status,'Complete raw sum');}
  assert.equal(JSON.stringify({model,first,second,heterozygous,reversed}),snapshot);
 }
});
