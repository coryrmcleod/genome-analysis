import test from 'node:test';
import assert from 'node:assert/strict';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
const header='#pgs_id=PGS000071\n#variants_number=1\n#genome_build=GRCh37\nrsID\tchr_name\tchr_position\teffect_allele\tother_allele\teffect_weight\tvariant_description\n';
test('reviewed bladder coordinate annotations must match the exact source position and allele',()=>{
 const row='rs4907479\t13\t113659108\tA\tG\t0.12221763272424911\tVariant info (UK Biobank) = 13:113659108-A\n';
 assert.equal(parseScoringFile(header+row).rows.length,1);
 for(const replacement of ['13:113659109-A','12:113659108-A','13:113659108-G','GSTM1 deletion dosage'])assert.throws(()=>parseScoringFile(header+row.replace('13:113659108-A',replacement)),/Unreviewed term condition/);
 assert.throws(()=>parseScoringFile((header+row).replace('PGS000071','PGS999999')),/Unreviewed term condition/);
});
test('a deletion proxy annotation is not an ordinary additive sequencing SNP exception',()=>{
 const row='rs36209093\t1\t110229772\tG\tA\t0.1823215567939546\tThis variant proxies the GSTM1 deletion: AA (GSTM1 del\/del), AG (GSTM1 del\/no_del) and GG (no GSTM1_del)\n';
 assert.throws(()=>parseScoringFile(header.replace('PGS000071','PGS012553')+row),/Unreviewed term condition/);
});
