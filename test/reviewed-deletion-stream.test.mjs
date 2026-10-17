import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createReviewedDeletionStream} from '../scripts/reviewed-deletion-stream.mjs';
const sequence=JSON.parse(fs.readFileSync(new URL('./fixtures/pgs/cervical-deletion/GRCh37-sequence.json',import.meta.url))).seq;
const window={build:'GRCh37',chrom:'6',start:31495409,sequence},representation={position:31495508,ref:'AAG',alt:'A'};
const config={build:'GRCh37',sampleCount:2,sampleIndex:1};
const row=(overrides={})=>{const r={chrom:'6',pos:'31495508',ref:'AAG',alt:'A',filter:'PASS',info:'.',format:'GT:GQ:DP',first:'1/1:60:30',selected:'0|1:60:30',...overrides};return [r.chrom,r.pos,'.',r.ref,r.alt,'80',r.filter,r.info,r.format,r.first,r.selected];};
test('deletion stream keeps only relevant records and uses only the explicitly selected sample',()=>{
 const s=createReviewedDeletionStream(window,representation,config);
 for(let i=0;i<10000;i++)s.consume(row({pos:'1000',ref:'A',alt:'C'}));
 s.consume(row());const result=s.finish();assert.equal(result.dosage,1);assert.equal(result.phase,'phased');assert.equal(result.consumed,10001);assert.equal(result.retained,1);
 assert.throws(()=>s.consume(row()),/finalized/);
 const other=createReviewedDeletionStream(window,representation,{...config,sampleIndex:0});other.consume(row({chrom:'chr6'}));assert.equal(other.finish().dosage,2);
 assert.throws(()=>createReviewedDeletionStream(window,representation,{...config,sampleIndex:2}));
 const mutableWindow={...window},mutableRepresentation={...representation},snapshot=createReviewedDeletionStream(mutableWindow,mutableRepresentation,config);
 mutableWindow.sequence='A'.repeat(203);mutableRepresentation.position=1;snapshot.consume(row());assert.equal(snapshot.finish().dosage,1);
});
test('deletion stream does not use partial, malformed or structurally uncertain inventories',()=>{
 for(const bad of [row().slice(0,-1),row({format:'GT:GQ:GQ'}),row({format:'GQ:GT:DP'}),row({info:'END=31495510;END=31495511'}),row({info:'END=bad'}),row({alt:'<DEL>',pos:'1'}),row({alt:'A[6:31495508[',pos:'1',info:'END=31495510'}),row({alt:'<DEL>',info:'END=31495510;CIPOS=-10,10'})]){
  const s=createReviewedDeletionStream(window,representation,config);s.consume(row());s.consume(bad);assert.equal(s.finish().status,'Stream withheld');assert.equal(s.finish().dosage,null);
 }
 const capped=createReviewedDeletionStream(window,representation,{...config,maxRecords:1});capped.consume(row());capped.consume(row());assert.equal(capped.finish().status,'Stream withheld');
 const duplicate=createReviewedDeletionStream(window,representation,config);duplicate.consume(row());duplicate.consume(row({pos:'31495509',ref:'AGA'}));assert.equal(duplicate.finish().status,'Duplicate records');
 const missing=createReviewedDeletionStream(window,representation,config);missing.consume(row({selected:'./.'}));assert.equal(missing.finish().status,'No call');
 const absent=createReviewedDeletionStream(window,representation,config);absent.consume(row({alt:'<NON_REF>',selected:'0/0:60:30',info:'END=31495530'}));assert.equal(absent.finish().dosage,null);
});
