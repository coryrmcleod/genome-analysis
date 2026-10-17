import test from 'node:test';
import assert from 'node:assert/strict';
import {INSULIN_RESISTANCE_METHOD as e,verifyInsulinResistanceMethod,verifyInsulinResistanceRows} from '../scripts/insulin-resistance-method.mjs';
test('insulin-resistance approval is bound to the exact deposit, paper and additive unit definition',()=>{
 const meta={id:e.id,name:'uwGRS53_IR',publication:{PMID:27841877},weight_type:'Unweighted',method_name:'Clumping and Thresholding (C+T)',variants_number:53,variants_interactions:0,matches_publication:true};
 assert.deepEqual(verifyInsulinResistanceMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS000878'},{name:'uwGRS43_IR'},{weight_type:'beta'},{variants_number:52},{variants_interactions:1},{matches_publication:false},{publication:{PMID:1}},{method_name:'Unknown'}])assert.throws(()=>verifyInsulinResistanceMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyInsulinResistanceMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifyInsulinResistanceMethod(meta,e.originalSha256,'0'.repeat(64)));
 const metadata={pgs_id:e.id,pgs_name:'uwGRS53_IR',weight_type:'Unweighted'},rows=Array.from({length:53},(_,i)=>({rsID:'rs'+i,effect_weight:'1'}));
 assert.equal(verifyInsulinResistanceRows(metadata,rows),true);
 assert.throws(()=>verifyInsulinResistanceRows(metadata,rows.slice(1)));
 assert.throws(()=>verifyInsulinResistanceRows(metadata,[rows[0],...rows.slice(0,52)]));
 for(const weight of ['0','-1','1.01','NaN',''])assert.throws(()=>verifyInsulinResistanceRows(metadata,[{...rows[0],effect_weight:weight},...rows.slice(1)]));
});
