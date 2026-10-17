import test from 'node:test';import assert from 'node:assert/strict';
import {matchReferenceTerm} from '../scripts/pgs-reference-matching.mjs';
const term={effectAllele:'A',otherAllele:'G'},mapping={ref:'G',alleles:['G','A']};
const row={id:'rs1',ref:'G',alleles:['G','A'],format:['GT'],samples:['0|0','0|1','1|1']};
test('reference matching keeps genomic allele orientation and phased diploid dosages',()=>{
 assert.deepEqual(matchReferenceTerm(term,mapping,[row],3).dosages,[0,1,2]);
 assert.deepEqual(matchReferenceTerm({...term,effectAllele:'G',otherAllele:'A'},mapping,[row],3).dosages,[2,1,0]);
});
test('absent, duplicate, wrong-reference and third-allele records are never filled or rescued',()=>{
 assert.equal(matchReferenceTerm(term,mapping,[],3).status,'missing');
 for(const rows of [[row,row],[{...row,ref:'A'}],[{...row,alleles:['G','T']}],[{...row,alleles:['G','A','T']}]])assert.equal(matchReferenceTerm(term,mapping,rows,3).status,'incompatible');
});
test('one missing or malformed reference genotype blocks the term for the full sample',()=>{
 for(const gt of ['./.','0/.','0','0/2','x/y'])assert.equal(matchReferenceTerm(term,mapping,[{...row,samples:['0/0',gt,'1/1']}],3).status,'incomplete');
 assert.equal(matchReferenceTerm(term,mapping,[{...row,format:['DS']}],3).status,'incompatible');
});
test('reference frequencies cannot choose a palindromic or effect-only orientation',()=>{
 assert.equal(matchReferenceTerm({effectAllele:'A',otherAllele:'T'},mapping,[row],3).status,'ambiguous');
 assert.equal(matchReferenceTerm({effectAllele:'A',otherAllele:null,alleleMode:'effect-only',effectAlleleCandidates:['A','T']},mapping,[row],3).status,'ambiguous');
});
