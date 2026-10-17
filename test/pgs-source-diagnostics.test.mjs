import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseSourceTerms} from '../scripts/pgs-source-diagnostics.mjs';
test('source diagnostics preserve exact unsupported terms without dropping or repairing rows',()=>{
 const header='rsID\tchr_name\tchr_position\teffect_allele\tother_allele\teffect_weight';
 const text='#variants_number=4\n'+header+'\nrs1\t1\t123\tA\tG\t0.10\nrs2\t2\t456\tA\tATT\t-0.0200\nrs3\t3\t789\tD\tI\t0.3\nrs4\t4\t999\tT\tT\tNaN\n';
 const d=diagnoseSourceTerms(text);assert.equal(d.rowCount,4);assert.equal(d.flaggedRowCount,3);
 assert.deepEqual(d.findings[0],{row:2,sourceId:'rs2',chrom:'2',position:'456',effectAllele:'A',otherAllele:'ATT',weightText:'-0.0200',issues:['non-SNV other allele']});
 assert.deepEqual(d.findings[2].issues,['identical effect/other alleles','invalid weight']);
 assert.equal(diagnoseSourceTerms('effect_allele\teffect_weight\nA\t0.2').flaggedRowCount,0);
 assert.throws(()=>diagnoseSourceTerms(header+'\nA\tB'),/Malformed/);
 assert.throws(()=>diagnoseSourceTerms('effect_allele\teffect_allele'),/columns/);
});
