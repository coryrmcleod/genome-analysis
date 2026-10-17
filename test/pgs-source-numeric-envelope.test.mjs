import test from 'node:test';
import assert from 'node:assert/strict';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
const source=weights=>`#pgs_id=PGS999999\n#genome_build=GRCh38\n#variants_number=${weights.length}\nrsID\teffect_allele\tother_allele\teffect_weight\n`+weights.map((weight,index)=>`rs${index+1}\tA\tC\t${weight}`).join('\n');
test('complete source parsing rejects individual or accumulated diploid numeric overflow',()=>{
 for(const weights of [['1e308'],['-1e308'],['5e307','5e307'],['5e307','-5e307'],['-5e307','-5e307']])assert.throws(()=>parseScoringFile(source(weights)),/numeric range/);
});
test('numeric preflight preserves all source rows and decimal spelling without rescaling',()=>{
 for(const weights of [['0','-0'],['1e-100','-1e-100'],['5e-324'],['8e307'],['-8e307'],['4e307','-4e307']]){
  const text=source(weights),parsed=parseScoringFile(text);assert.equal(parsed.rows.length,weights.length);assert.deepEqual(parsed.rows.map(row=>row.effect_weight),weights);assert.equal(parsed.metadata.variants_number,String(weights.length));
 }
});
