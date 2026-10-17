import test from 'node:test';import assert from 'node:assert/strict';
import {preflightHarmonizedRows as check} from '../scripts/import-pgs-library.mjs';
const row={rsID:'coordinate:GRCh38:19:39907575',chr_name:'19',chr_position:'39907575',coordinateSource:true,effect_allele:'A',effect_weight:'-1.2061e-05'};
const original={metadata:{pgs_id:'PGS018943',genome_build:'GRCh38'},rows:[row]};
const fixture=build=>({metadata:{pgs_id:'PGS018943',HmPOS_build:build},rows:[{...row,hm_chr:'19',hm_pos:build==='GRCh38'?'39907575':'40407680'}]});
test('harmonized coordinate preflight rejects missing rows and changed source terms before identifier lookup',()=>{
 for(const build of ['GRCh37','GRCh38'])assert.equal(check(original,fixture(build),build).size,1);
 for(const mutation of [p=>p.rows[0].hm_chr='',p=>p.rows[0].hm_pos='',p=>p.rows[0].hm_pos='9007199254740993',p=>p.rows[0].effect_weight='1',p=>p.rows[0].effect_allele='C',p=>p.rows=[],p=>p.rows.push({...p.rows[0]}),p=>p.metadata.pgs_id='PGS000001']){
  const p=fixture('GRCh37');mutation(p);assert.throws(()=>check(original,p,'GRCh37'));
 }
 const missing=fixture('GRCh37');missing.rows[0].hm_pos='';assert.throws(()=>check(original,missing,'GRCh37'),/GRCh37 harmonized coordinate: coordinate:GRCh38:19:39907575/);
 const moved=fixture('GRCh38');moved.rows[0].hm_pos='39907576';assert.throws(()=>check(original,moved,'GRCh38'),/Source coordinate changed/);
});
