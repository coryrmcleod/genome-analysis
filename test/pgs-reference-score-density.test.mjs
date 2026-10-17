import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {validateScoreReference,empiricalPercentile} from '../public/pgs-reference.js';
const bytes=await readFile(new URL('../public/data/pgs-score-reference.json',import.meta.url)),library=JSON.parse(bytes),model=library.models.find(row=>row.status==='Available'),point=model.scores[Math.floor(model.sampleCount/2)];
test('every public reference score must be explicit before validation or percentile ranking',()=>{
 assert.equal(model.sampleCount,503);assert.equal(validateScoreReference(library),library);assert.equal(empiricalPercentile(model.scores,point),50);
 for(let index=0;index<model.sampleCount;index++){
  const changed={...library,models:[structuredClone(model)]};delete changed.models[0].scores[index];assert.throws(()=>validateScoreReference(changed),/reference score distribution/);assert.throws(()=>empiricalPercentile(changed.models[0].scores,point),/percentile input/);assert.equal(Object.hasOwn(changed.models[0].scores,index),false);
 }
 for(const value of [undefined,null,NaN,Infinity,-Infinity])for(const index of [0,251,502]){
  const changed={...library,models:[structuredClone(model)]};changed.models[0].scores[index]=value;assert.throws(()=>validateScoreReference(changed),/reference score distribution/);assert.throws(()=>empiricalPercentile(changed.models[0].scores,point),/percentile input/);
 }
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'505ae02e9dc6fe4b3bb3bcf6234291627073c5602814ff8397e6b917aa1dcd6b');assert.deepEqual(validateScoreReference(JSON.parse(bytes)),library);
});
test('complete distributions retain ties, coefficient scale and direct typed-array compatibility',()=>{
 for(const scores of [[0,1,1,2],[0,1e-12,1e-12,2e-12]]){
  assert.equal(empiricalPercentile(scores,scores[1]),50);assert.equal(empiricalPercentile(Float64Array.from(scores),scores[1]),50);assert.equal(empiricalPercentile(scores,-1),0);assert.equal(empiricalPercentile(scores,3),100);
 }
 const changed={...library,models:[structuredClone(model)]};changed.models[0].scores=Float64Array.from(model.scores);assert.throws(()=>validateScoreReference(changed),/reference score distribution/);
});
