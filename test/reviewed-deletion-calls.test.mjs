import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadCervicalDeletionProof} from '../scripts/cervical-deletion-proof.mjs';
import {reviewedDeletionDefinition,countReviewedDeletion} from '../scripts/reviewed-deletion-calls.mjs';
const fixtures=new URL('./fixtures/pgs/cervical-deletion/',import.meta.url);
const windows=Object.fromEntries(['GRCh37','GRCh38'].map(build=>{const s=JSON.parse(fs.readFileSync(new URL(build+'-sequence.json',fixtures))),start=build==='GRCh37'?31495409:31527632;return [build,{build,chrom:'6',start,sequence:s.seq}];}));
const original=w=>({position:w.start+99,ref:'AAG',alt:'A'});
const call=(w,GT='0/1',shift=0)=>({chrom:'6',position:w.start+99+shift,ref:shift?'AGA':'AAG',alt:'A',GT,GQ:'60',DP:'30',filter:'PASS'});
test('reviewed deletion prototype counts only explicit diploid calls in either proven representation on both builds',async()=>{
 await loadCervicalDeletionProof();
 for(const w of Object.values(windows)){
  const definition=reviewedDeletionDefinition(w,original(w));assert.deepEqual(definition.equivalents.map(r=>r.position),[w.start+99,w.start+100]);
  for(const shift of [0,1])for(const [gt,dosage] of [['0/0',0],['0/1',1],['1/0',1],['1/1',2],['0|1',1],['1|0',1]]){
   const record=call(w,gt,shift),before=JSON.stringify(record),result=countReviewedDeletion(w,original(w),[record],w.build);
   assert.equal(result.status,'Called');assert.equal(result.dosage,dosage);assert.equal(result.genotype,gt);assert.equal(result.phase,gt.includes('|')?'phased':'unphased');assert.equal(JSON.stringify(record),before);
  }
 }
});
test('deletion prototype withholds missing, low-quality, duplicate and overlapping records',()=>{
 for(const w of Object.values(windows)){
  const count=records=>countReviewedDeletion(w,original(w),records,w.build);
  assert.equal(count([]).dosage,null);assert.equal(count([]).status,'Not observed');
  for(const GT of ['./.','0/.','.|1'])assert.equal(count([call(w,GT)]).status,'No call');
  for(const GT of ['1','0/1/1','0/2','01/1'])assert.equal(count([call(w,GT)]).status,'Unsupported call');
  for(const override of [{filter:'.'},{filter:'LowQual'},{GQ:'19'},{DP:'9'},{GQ:undefined},{DP:'NaN'},{GQ:'Infinity'}])assert.equal(count([{...call(w),...override}]).status,'Quality limited');
  for(const records of [[call(w),call(w)],[call(w),call(w,'1/1',1)]]){assert.equal(count(records).status,'Duplicate records');assert.equal(count(records).dosage,null);}
  for(const extra of [{...call(w),ref:'A',alt:'C'},{...call(w),position:w.start,ref:'A',alt:'<DEL>',end:w.start+150,GQ:undefined}]){assert.equal(count([call(w),extra]).status,'Overlapping records');assert.equal(count([call(w),extra]).dosage,null);}
  for(const GT of ['./.','0/.',undefined,'0/2','1'])assert.equal(count([call(w),{...call(w),ref:'A',alt:'C',GT,GQ:undefined}]).status,'Overlapping records');
  assert.equal(count([call(w),{...call(w),ref:'A',alt:'C',GT:'0/0'}]).status,'Called');
  for(const GT of ['0/0','0/1','0/2']){const multi={...call(w,GT),alt:'A,C'};assert.equal(count([multi]).status,'Unsupported representation');assert.equal(count([call(w),multi]).status,'Duplicate records');}
  assert.equal(count([{...call(w),GT:'0/0',alt:'<NON_REF>',end:w.start+150}]).status,'Not observed');
  assert.equal(countReviewedDeletion(w,original(w),[call(w)],w.build==='GRCh37'?'GRCh38':'GRCh37').status,'Unsupported build');
 }
});
test('deletion prototype never infers identity from a nearby coordinate, allele length or reverse complement',()=>{
 for(const w of Object.values(windows)){
  for(const override of [{position:w.start+98},{ref:'AAA'},{ref:'CTT',alt:'T'},{ref:'AAG',alt:'AG'},{chrom:'7'}])assert.equal(countReviewedDeletion(w,original(w),[{...call(w),...override}],w.build).dosage,null);
  assert.throws(()=>reviewedDeletionDefinition(w,{...original(w),ref:'AAA'}),/REF\/window/);
  assert.throws(()=>reviewedDeletionDefinition({...w,sequence:'N'+w.sequence.slice(1)},original(w)),/window/);
  assert.throws(()=>reviewedDeletionDefinition({...w,sequence:'A'.repeat(203)},{position:w.start+99,ref:'AAA',alt:'A'}),/context boundary/);
 }
});
