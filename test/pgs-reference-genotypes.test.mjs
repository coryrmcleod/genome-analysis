import test from 'node:test';import assert from 'node:assert/strict';
import {matchReferenceGenotypes} from '../scripts/pgs-reference-genotypes.mjs';
const term={effectAllele:'G',otherAllele:'A'},mapping={ref:'A',alleles:['A','C','G']};
const row={ref:'A',alleles:['A','C','G'],format:['DP','GT'],samples:['30:0|0','30:2|0','30:2|2']};
test('unused verified ALT allele does not block exact model genotypes at index 2',()=>{
 const r=matchReferenceGenotypes(term,mapping,[row],3);
 assert.equal(r.status,'matched');assert.deepEqual(r.dosages,[0,1,2]);assert.deepEqual(r.unusedAlleles,['C']);assert.deepEqual(r.genotypes,[['A','A'],['G','A'],['G','G']]);
});
test('an actually observed third allele is never collapsed into zero model dosage',()=>{
 const r=matchReferenceGenotypes(term,mapping,[{...row,samples:['30:0/0','30:1/2','30:2/2']}],3);
 assert.equal(r.status,'incompatible');assert.match(r.reason,/outside the model/);
});
test('multiallelic decoding retains missingness, allele and duplicate gates',()=>{
 for(const gt of ['0/.','3/0','02/0','-1/0','0','./.','x/y'])assert.equal(matchReferenceGenotypes(term,mapping,[{...row,samples:['30:0/0','30:'+gt,'30:2/2']}],3).status,'incomplete');
 for(const rows of [[row,row],[{...row,ref:'G'}],[{...row,alleles:['A','T','G']}],[{...row,format:['DP']}],[{...row,samples:row.samples.slice(1)}]])assert.equal(matchReferenceGenotypes(term,mapping,rows,3).status,'incompatible');
});
