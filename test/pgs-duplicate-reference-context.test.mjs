import test from 'node:test';import assert from 'node:assert/strict';import {calculatePGS} from '../public/pgs.js';
for(const build of ['GRCh37','GRCh38'])test(`effect-only duplicate reference context cannot select a score by row order on ${build}`,()=>{
 const term={id:'rs999999',effectAllele:'A',alleleMode:'effect-only',effectAlleleCandidates:['A'],weight:1,weightText:'1'},model={id:'PGS999999',variantCount:1,variants:[term]};
 const call=referenceAlleles=>({id:term.id,status:'Called',alleles:['A','A'],genotype:'A/A',mappings:{[build]:{alleles:referenceAlleles}}}),valid=call(['G','A']),invalid=call(['G','C']),missing={...valid,mappings:{}};
 const score=(results,definition=model)=>calculatePGS({models:[definition]},{build,format:'VCF',results})[0];const snapshot=JSON.stringify([model,valid,invalid,missing]);
 for(const rows of [[valid,invalid],[invalid,valid],[valid,invalid,valid],[invalid,valid,invalid],[valid,missing],[missing,valid]]){const actual=score(rows);assert.equal(actual.rawSum,null);assert.equal(actual.matchedSubtotal,null);assert.equal(actual.matched,0);assert.equal(actual.terms[0].status,'Conflicting records');assert.equal(actual.terms[0].dosage,null);}
 assert.deepEqual(score([valid,call(['A','G'])]),score([valid]));
 const otherBuild=build==='GRCh37'?'GRCh38':'GRCh37',unrelated=structuredClone(valid);unrelated.mappings[otherBuild]={alleles:['C','T']};unrelated.unrelated='retained';assert.deepEqual(score([valid,unrelated]),score([valid]));
 const explicit={...model,variants:[{...term,alleleMode:undefined,otherAllele:'G'}]};assert.equal(score([valid,invalid],explicit).rawSum,2);assert.equal(score([invalid,valid],explicit).rawSum,2);
 assert.equal(JSON.stringify([model,valid,invalid,missing]),snapshot);
});
