import test from 'node:test';import assert from 'node:assert/strict';
import {coordinateReferenceCandidates as discover,validateCoordinateCandidate as validate} from '../scripts/coordinate-reference-candidates.mjs';
const row={rsID:'coordinate:GRCh38:1:100',coordinateSource:true,chr_name:'1',chr_position:'100',effect_allele:'A',effect_weight:'0.1'};
const original={metadata:{genome_build:'GRCh38'},rows:[row]},hm={rows:[{...row,hm_chr:'1',hm_pos:'110'}]};
test('public reference IDs are candidate-only and require exact source identity',()=>{
 const r=discover(original,hm,'#CHROM\tPOS\tID\tREF\tALT\n1\t110\trs123\tA\tG\n');
 assert.equal(validate(row,r.candidates[row.rsID],'GRCh38'),'rs123');
 assert.equal(r.unresolved,0);assert.throws(()=>validate({...row,chr_position:'101'},r.candidates[row.rsID],'GRCh38'));
 assert.throws(()=>validate(row,r.candidates[row.rsID],'GRCh37'));
 assert.throws(()=>discover(original,{rows:[{...hm.rows[0],effect_weight:'0.2'}]},''));
});
test('duplicate, missing, non-SNV and non-rsID public records do not provide a chosen identifier',()=>{
 for(const text of ['', '1\t110\t.\tA\tG', '1\t110\trs1\tA\tAG','1\t110\trs1\tA\tG\n1\t110\trs2\tA\tG','1\t110\trs1\tA\tA']){const r=discover(original,hm,text);assert.deepEqual(r.candidates,{});assert.equal(r.unresolved,1);}
});
