import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAncestryReference,estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';
const panel=validateAncestryReference(JSON.parse(await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url))));
const fixture=JSON.parse(await readFile(new URL('fixtures/ancestry/public-fixtures.json',import.meta.url)))[0];
const calls={build:'GRCh38',format:'VCF',results:panel.markers.map((marker,index)=>({id:marker.id,status:fixture.dosages[index]===null?'No call':'Called',alleles:fixture.dosages[index]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[index]?marker.alt:marker.mappings.GRCh38.ref)}))};
test('saved population rankings require every entry before restoration',()=>{
 const report=estimateAncestry(calls,panel);assert.equal(report.status,'Estimated');assert.equal(report.populationAffinities.length,8);
 assert.equal(validateSavedAncestry(report),report);assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(report))),report);
 for(let index=0;index<report.populationAffinities.length;index++)for(const value of ['hole',undefined,null]){
  const changed=structuredClone(report);if(value==='hole')delete changed.populationAffinities[index];else changed.populationAffinities[index]=value;
  assert.throws(()=>validateSavedAncestry(changed),/Invalid saved ancestry result/);
 }
 const historical=structuredClone(report);delete historical.referenceSensitivity;historical.populationAffinities.pop();assert.equal(validateSavedAncestry(historical),historical);
 const missing=structuredClone(historical);delete missing.populationAffinities[6];assert.throws(()=>validateSavedAncestry(missing),/Invalid saved ancestry result/);
});
