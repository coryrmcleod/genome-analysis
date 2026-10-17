import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validateAncestryReference,validateAncestryValidation,validateSavedAncestry,estimateAncestry} from '../public/ancestry.js';
const panel=JSON.parse(await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url))),fixture=JSON.parse(await readFile(new URL('fixtures/ancestry/public-fixtures.json',import.meta.url)))[0];
const report=estimateAncestry({build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:fixture.dosages[i]===null?'No call':'Called',alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))},panel);
test('stored supported heterozygosity screen matches the estimator and saved acceptance gates',()=>{
 assert.equal(report.status,'Estimated');assert.equal(validateAncestryReference(panel),panel);assert.equal(validateSavedAncestry(report),report);
 for(const bounds of [[.4,.5],[0,1],[.079,.6],[.08,.601],[.081,.6],[.08,.599]]){
  const reference=structuredClone(panel),saved=structuredClone(report);for(const value of [reference.validation,saved.validation])Object.assign(value.heterozygosityScreen,{supportedMinimum:bounds[0],supportedMaximum:bounds[1]});
  assert.throws(()=>validateAncestryReference(reference),/validation evidence/);assert.throws(()=>validateSavedAncestry(saved),/validation evidence/);
 }
 assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(report))),report);
 const historical=structuredClone(report);delete historical.validation.heterozygosityScreen;assert.equal(validateSavedAncestry(historical),historical);
});
test('observed held-out extrema remain descriptive evidence rather than a claim that all pass the screen',()=>{
 const validation=structuredClone(panel.validation);validation.heterozygosityScreen.minimumHeldOut=.01;validation.heterozygosityScreen.maximumHeldOut=.9;
 assert.equal(validateAncestryValidation(validation,panel.groups.map(group=>group.code)),validation);
 assert.deepEqual([validation.heterozygosityScreen.supportedMinimum,validation.heterozygosityScreen.supportedMaximum],[.08,.6]);
});
