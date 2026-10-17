import test from 'node:test';import assert from 'node:assert/strict';import {verifyLogOddsWeights} from '../scripts/pgs-weight-evidence.mjs';
import {SICCA_ADDITIVE_METHOD,verifySiccaAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';
import {verifyWeightTypeAgreement} from '../scripts/pgs-weight-evidence.mjs';
import {JIA_ADDITIVE_METHOD,verifyJIAAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';
import {HODGKIN_ADDITIVE_METHOD,verifyHodgkinAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';
import {MYELOMA_ADDITIVE_METHOD,verifyMyelomaAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';

test('myeloma method review is bound to the full22-term GWAS-Hits deposit',()=>{
 const e=MYELOMA_ADDITIVE_METHOD,meta={id:e.id,publication:{PMID:32991828},weight_type:'NR',method_name:'GWAS Hits',name:'PRSWEB_PHECODE204.4_GWAS-Catalog-r2019-05-03-X204.4_P_5e-08_UKB_20200608',variants_number:22,matches_publication:true};
 assert.deepEqual(verifyMyelomaAdditiveMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS000654'},{publication:{PMID:1}},{weight_type:'OR'},{method_name:'P+T'},{name:'other'},{variants_number:21},{matches_publication:false}])assert.throws(()=>verifyMyelomaAdditiveMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyMyelomaAdditiveMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifyMyelomaAdditiveMethod(meta,e.originalSha256,'0'.repeat(64)));
 assert.match(e.method,/Catalog weight type remains NR/);assert.match(e.method,/not an independent coefficient-by-coefficient/);
});

test('Hodgkin methods review rejects any different model, unit, method or source bytes',()=>{
 const e=HODGKIN_ADDITIVE_METHOD,meta={id:e.id,publication:{PMID:32991828},weight_type:'NR',method_name:'GWAS Hits',name:'PRSWEB_PHECODE201_GWAS-Catalog-r2019-05-03-X201_P_5e-08_MGI_20200608',variants_number:16,matches_publication:true};
 assert.deepEqual(verifyHodgkinAdditiveMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS000639'},{publication:{PMID:1}},{weight_type:'OR'},{method_name:'P+T'},{name:'other'},{variants_number:20},{matches_publication:false}])assert.throws(()=>verifyHodgkinAdditiveMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyHodgkinAdditiveMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifyHodgkinAdditiveMethod(meta,e.originalSha256,'0'.repeat(64)));
 assert.match(e.method,/Catalog weight type remains NR/);assert.match(e.method,/not an independent coefficient-by-coefficient/);
});
test('JIA additive review is exact-deposit evidence, never a general NR exemption',()=>{
 const e=JIA_ADDITIVE_METHOD,meta={id:e.id,publication:{PMID:32887683},weight_type:'NR',method_name:'SparSNP',name:'GRS-JIA-20',variants_number:26,matches_publication:true};
 assert.deepEqual(verifyJIAAdditiveMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS000325'},{publication:{PMID:1}},{weight_type:'OR'},{method_name:'snpnet'},{name:'other'},{variants_number:25},{matches_publication:false}])assert.throws(()=>verifyJIAAdditiveMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyJIAAdditiveMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifyJIAAdditiveMethod(meta,e.originalSha256,'0'.repeat(64)));
 assert.match(e.method,/Catalog weight type remains NR/);assert.match(e.method,/not treated as log odds/);
});
test('unreported weight semantics require agreement with every original odds ratio',()=>{
 const good=[{OR:'1.5',effect_weight:String(Math.log(1.5))},{OR:'0.7',effect_weight:String(Math.log(0.7))}];assert.equal(verifyLogOddsWeights(good).verifiedRows,2);
 for(const bad of [{OR:'1.5',effect_weight:'1.5'},{OR:'0',effect_weight:'0'},{OR:'',effect_weight:'0'},{OR:'1.5',effect_weight:String(Math.log10(1.5))}])assert.throws(()=>verifyLogOddsWeights([...good,bad]));
});
test('log-OR evidence accepts precise published decimal rounding without altering weights',()=>{
 const rows=[{OR:'3.39',effect_weight:'1.220829921'},{OR:'0.37',effect_weight:'-0.994252273'}],before=JSON.stringify(rows);
 assert.equal(verifyLogOddsWeights(rows).decimalRoundingRows,2);assert.equal(JSON.stringify(rows),before);
 for(const weight of ['1.220829920','1.220831','1.22','1.2','3.390000000','0.530199698'])assert.throws(()=>verifyLogOddsWeights([{OR:'3.39',effect_weight:weight}]));
 assert.equal(verifyLogOddsWeights([{OR:'3.39',effect_weight:'1.220830'}]).decimalRoundingRows,1);
 assert.equal(verifyLogOddsWeights([{OR:'3.39',effect_weight:'1.2208299'}]).decimalRoundingRows,1);
});
test('Catalog and complete-file unit labels must agree without numerical or logarithmic inference',()=>{
 assert.equal(verifyWeightTypeAgreement('beta','Beta'),true);assert.equal(verifyWeightTypeAgreement('NR','NR'),true);
 for(const pair of [['beta','OR'],['log(OR)','OR'],['beta','NR'],['NR',''],['beta',undefined],['log(OR)','log(HR)']])assert.throws(()=>verifyWeightTypeAgreement(...pair));
});
test('sicca NR additive review is pinned to the exact complete deposit, method and primary document',()=>{
 const e=SICCA_ADDITIVE_METHOD,meta={id:e.id,publication:{PMID:35324888},weight_type:'NR',method_name:'snpnet',name:'GBE_HC321',variants_number:7,matches_publication:true};
 assert.deepEqual(verifySiccaAdditiveMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS001309'},{publication:{PMID:1}},{weight_type:'OR'},{method_name:'unweighted'},{name:'different'},{variants_number:6},{matches_publication:false}])assert.throws(()=>verifySiccaAdditiveMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifySiccaAdditiveMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifySiccaAdditiveMethod(meta,e.originalSha256,'0'.repeat(64)));
 assert.match(e.method,/Catalog weight type remains NR/);assert.match(e.method,/not converted to odds ratios/);
});
