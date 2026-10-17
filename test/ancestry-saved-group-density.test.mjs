import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateAncestryReference,estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';
const panel=validateAncestryReference(JSON.parse(fs.readFileSync('public/data/ancestry-reference.json')));
const fixture=JSON.parse(fs.readFileSync('test/fixtures/ancestry/public-fixtures.json'))[0];
const report=estimateAncestry({build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:fixture.dosages[i]===null?'No call':'Called',alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,c)=>c<fixture.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))},panel);
test('saved ancestry requires all seven group entries, including zero-fraction groups',()=>{
 assert.equal(report.status,'Estimated');assert.equal(validateSavedAncestry(report),report);
 const historical=structuredClone(report);delete historical.validation;delete historical.referenceSensitivity;
 assert.equal(validateSavedAncestry(historical),historical);
 for(let index=0;index<7;index++)for(const value of ['hole',undefined,null]){
  const changed=structuredClone(historical);if(value==='hole')delete changed.groups[index];else changed.groups[index]=value;
  assert.throws(()=>validateSavedAncestry(changed),/Invalid saved ancestry result/);
  assert.throws(()=>validateSavedAncestry(JSON.parse(JSON.stringify(changed))),/Invalid saved ancestry result/);
 }
 assert.deepEqual(report,JSON.parse(JSON.stringify(report)));
 const withheld={status:'Unavailable',reason:'Coverage',groups:[],populationAffinities:[],usableMarkers:0,markerCount:panel.markers.length,coverage:0,warnings:[]};assert.equal(validateSavedAncestry(withheld),withheld);
});
