import test from 'node:test';import assert from 'node:assert/strict';
import {proveEquivalentDeletion as prove} from '../scripts/pgs-deletion-equivalence.mjs';
const window={build:'GRCh37',chrom:'6',start:1000,sequence:'C'.repeat(50)+'AAGA'+'T'.repeat(50)};
const first={build:'GRCh37',chrom:'6',strand:1,position:1050,ref:'AAG',alt:'A'},second={...first,position:1051,ref:'AGA'};
test('shifted deletion representations require identical full reference and alternate haplotypes',()=>{
 const before=JSON.stringify({window,first,second}),p=prove(window,first,second);assert.equal(p.deletedBases,2);assert.match(p.scope,/no scoring admission/);assert.deepEqual(prove(window,second,first),p);assert.equal(JSON.stringify({window,first,second}),before);
 const longer={...window,sequence:'C'.repeat(50)+'AAGAAGA'+'T'.repeat(50)};
 assert.equal(prove(longer,first,second).deletedBases,2);
 // Equal deletion length and an rsID-like label cannot make distinct edits equal.
 assert.throws(()=>prove(window,first,{...second,position:1054,ref:'TTT',alt:'T'}),/different haplotypes/);
});
test('deletion proof refuses wrong build, strand, coordinates, REF, symbols and boundary edits',()=>{
 for(const patch of [{build:'GRCh38'},{chrom:'7'},{strand:-1},{position:1050.5},{position:1049},{ref:'AGG'},{ref:'A'},{ref:'<DEL>'},{alt:'*'},{alt:''},{alt:'G'},{alt:'AA'}])assert.throws(()=>prove(window,{...first,...patch},second));
 for(const patch of [{build:'hg19'},{chrom:'X'},{start:0},{sequence:window.sequence.replace('G','N')},{sequence:'A'.repeat(99)}])assert.throws(()=>prove({...window,...patch},first,second));
 assert.throws(()=>prove({...window,start:1050},first,second),/flanks/);
});
