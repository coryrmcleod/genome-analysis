import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {referenceTemplateSensitivity,validateReferenceTemplateSensitivity} from '../public/ancestry-reference-sensitivity.js';
import {estimateAncestry,validateAncestryReference,validateSavedAncestry} from '../public/ancestry.js';
import {ancestryHtml} from '../public/ancestry-view.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const panelBytes=await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url)),panel=validateAncestryReference(JSON.parse(panelBytes));
const fixtureBytes=await readFile(new URL('fixtures/ancestry/public-fixtures.json',import.meta.url)),fixtures=JSON.parse(fixtureBytes);
const groups=fixture=>panel.groups.map((group,index)=>({...group,fraction:fixture.expectedFractions[index]}));
const calls=fixture=>({build:'GRCh38',format:'VCF',results:panel.markers.map((marker,index)=>({id:marker.id,status:fixture.dosages[index]===null?'No call':'Called',alleles:fixture.dosages[index]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[index]?marker.alt:marker.mappings.GRCh38.ref)}))});

test('sensitivity inputs reject missing array entries before reading reference templates',()=>{
 const boundary={markers:[{}],get groups(){throw Error('Reference templates must not be read for invalid input');}};
 const points=Array(7).fill(1/7),sparsePoints=Array(7).fill(1/6);delete sparsePoints[6];
 for(const dosages of [Array(1),[undefined],new Uint8Array([0]),{0:0,length:1},'0',null])assert.throws(()=>referenceTemplateSensitivity(boundary,dosages,points),/Invalid ancestry sensitivity inputs/);
 for(const fractions of [sparsePoints,Array(7),new Float64Array(points),{...points,length:7},null])assert.throws(()=>referenceTemplateSensitivity(boundary,[null],fractions),/Invalid ancestry sensitivity inputs/);
 assert.equal(Object.hasOwn(sparsePoints,6),false);
 const tiny={groups:points.map((_,i)=>({code:'G'+i})),populations:Array.from({length:14},(_,i)=>({code:'P'+i,label:'P'+i,region:'G'+Math.floor(i/2)})),markers:[{frequencies:Array(7).fill(.2),populationFrequencies:Array(14).fill(.2)}]};
 for(const dosage of [null,0,1,2]){
  const result=referenceTemplateSensitivity(tiny,[dosage],points);
  assert.equal(result.status,'Unavailable');assert.equal(result.usableMarkers,dosage===null?0:1);assert.equal(result.maximumAbsoluteChange,0);
 }
});
test('reference perturbation ranges preserve all independently verified public omission experiments',async()=>{
 const bytes=await readFile(new URL('fixtures/ancestry/template-sensitivity-experiment.json',import.meta.url)),source=JSON.parse(bytes);
 const verification=JSON.parse(await readFile(new URL('fixtures/ancestry/template-sensitivity-independent.json',import.meta.url)));
 assert.equal(source.referenceSha256,hash(panelBytes));assert.equal(source.publicFixturesSha256,hash(fixtureBytes));assert.equal(verification.experimentSha256,hash(bytes));assert.equal(verification.checks.length,7);
 for(const fixture of fixtures){
  const before=JSON.stringify({panel,fixture}),result=referenceTemplateSensitivity(panel,fixture.dosages,fixture.expectedFractions),expected=source.results.find(row=>row.publicSample===fixture.publicSample);
  assert.equal(result.attempted,74);assert.equal(result.evaluated,74);assert.equal(result.status,'Complete');
  validateReferenceTemplateSensitivity(result,groups(fixture),fixture.dosages.filter(value=>value!==null).length);
  result.groups.forEach((group,index)=>{assert.ok(Math.abs(group.low-expected.componentLow[index])<2e-7);assert.ok(Math.abs(group.high-expected.componentHigh[index])<2e-7)});
  assert.equal(JSON.stringify({panel,fixture}),before);if(result.maximumAbsoluteChange===0)assert.equal(result.largestChangeOmission,null);
 }
});
test('incoherent averages and uninformative calls report unavailable diagnostics without invented ranges',()=>{
 const changed=structuredClone(panel);changed.markers[0].frequencies[0]+=.01;
 const fixture=fixtures[0],result=referenceTemplateSensitivity(changed,fixture.dosages,fixture.expectedFractions);
 assert.equal(result.status,'Unavailable');assert.equal(result.attempted,0);assert.equal(result.maximumAbsoluteChange,0);assert.match(result.reason,/population averages/);
 validateReferenceTemplateSensitivity(result,groups(fixture),fixture.dosages.filter(value=>value!==null).length);
 const missing=referenceTemplateSensitivity(panel,Array(panel.markers.length).fill(null),fixture.expectedFractions);
 assert.equal(missing.status,'Unavailable');assert.equal(missing.failures.length,74);assert.ok(missing.failures.every(row=>row.reason==='Numerically indistinguishable components'));validateReferenceTemplateSensitivity(missing,groups(fixture),0);
});

test('synthetic mixture omission extremes preserve independent verification and uncalibrated ranges',async()=>{
 const mixtureBytes=await readFile(new URL('fixtures/ancestry/synthetic-mixtures.json',import.meta.url)),mixtures=JSON.parse(mixtureBytes);
 const challengeBytes=await readFile(new URL('fixtures/ancestry/template-mixture-sensitivity.json',import.meta.url)),challenge=JSON.parse(challengeBytes);
 const independent=JSON.parse(await readFile(new URL('fixtures/ancestry/template-mixture-sensitivity-independent.json',import.meta.url)));
 assert.equal(challenge.referenceSha256,hash(panelBytes));assert.equal(challenge.fixturesSha256,hash(mixtureBytes));
 assert.equal(independent.referenceSha256,hash(panelBytes));assert.equal(independent.fixturesSha256,hash(mixtureBytes));assert.equal(independent.challengeSha256,hash(challengeBytes));
 assert.equal(challenge.results.length,36);assert.equal(independent.checks.length,36);assert.equal(challenge.summary.evaluated,2664);
 for(const [index,fixture] of mixtures.cases.entries()){
  const expected=challenge.results[index],proof=independent.checks[index];
  assert.equal(expected.label,fixture.label);assert.equal(expected.replicate,fixture.replicate);assert.equal(proof.label,fixture.label);
  const report=estimateAncestry(calls(fixture),panel),actual=report.referenceSensitivity;
  assert.equal(report.status,'Estimated');assert.equal(actual.status,'Complete');assert.equal(actual.evaluated,74);
  report.groups.forEach(group=>assert.ok(Math.abs(group.fraction-fixture.expectedFractions[mixtures.codes.indexOf(group.code)])<2e-7));
  assert.equal(actual.largestChangeOmission.code,proof.omittedPopulation);
  assert.ok(Math.abs(actual.maximumAbsoluteChange-expected.referenceSensitivity.maximumAbsoluteChange)<1e-9);
  actual.groups.forEach(group=>{
   const stored=expected.referenceSensitivity.groups.find(row=>row.code===group.code),value=proof.independentFractions[mixtures.codes.indexOf(group.code)];
   assert.ok(Math.abs(group.low-stored.low)<1e-9&&Math.abs(group.high-stored.high)<1e-9);
   assert.ok(value>=group.low-2e-7&&value<=group.high+2e-7);
  });
  const independentChange=Math.max(...proof.independentFractions.map((value,i)=>Math.abs(value-fixture.expectedFractions[i])));
  assert.ok(Math.abs(independentChange-actual.maximumAbsoluteChange)<2e-7);
  assert.equal(expected.chromosomeRangesContainTruth,false);assert.equal(expected.templateRangesContainTruth,false);
 }
});
test('saved diagnostics reject incoherent inventories and unsupported ranges',()=>{
 const fixture=fixtures[0],valid=referenceTemplateSensitivity(panel,fixture.dosages,fixture.expectedFractions),usable=fixture.dosages.filter(value=>value!==null).length;
 for(const change of [s=>s.status='Partial',s=>s.evaluated--,s=>s.attempted=121,s=>s.usableMarkers--,s=>s.groups[0].low=1,s=>s.maximumAbsoluteChange+=.1,s=>s.largestChangeOmission=null,s=>s.largestChangeOmission.region='unknown',s=>s.largestChangeOmission.label=null,s=>s.groups[1].code=s.groups[0].code,s=>s.omittedSinglePopulationGroups=['unknown']]){
  const bad=structuredClone(valid);change(bad);assert.throws(()=>validateReferenceTemplateSensitivity(bad,groups(fixture),usable),/reference sensitivity/);
 }
});
test('saved sensitivity diagnostics require every group and omission entry to be explicit',async()=>{
 const source=JSON.parse(await readFile(new URL('fixtures/ancestry/template-mixture-sensitivity.json',import.meta.url))),mixtures=JSON.parse(await readFile(new URL('fixtures/ancestry/synthetic-mixtures.json',import.meta.url)));
 const valid=source.results[0].referenceSensitivity,points=mixtures.codes.map((code,index)=>({code,fraction:source.results[0].pointFractions[index]}));
 assert.equal(validateReferenceTemplateSensitivity(valid,points,valid.usableMarkers),valid);
 for(let index=0;index<7;index++){
  const missing=structuredClone(valid);delete missing.groups[index];
  assert.throws(()=>validateReferenceTemplateSensitivity(missing,points,valid.usableMarkers),/reference sensitivity/);
  const absent=structuredClone(points);delete absent[index];
  assert.throws(()=>validateReferenceTemplateSensitivity(valid,absent,valid.usableMarkers),/reference sensitivity/);
 }
 const partial=structuredClone(valid);partial.status='Partial';partial.evaluated--;partial.failures=Array(1);
 assert.throws(()=>validateReferenceTemplateSensitivity(partial,points,valid.usableMarkers),/reference sensitivity/);
 const omitted=structuredClone(valid);omitted.status='Partial';omitted.omittedSinglePopulationGroups=Array(1);
 assert.throws(()=>validateReferenceTemplateSensitivity(omitted,points,valid.usableMarkers),/reference sensitivity/);
 const invalid=structuredClone(points);invalid[0].fraction=NaN;
 assert.throws(()=>validateReferenceTemplateSensitivity(valid,invalid,valid.usableMarkers),/reference sensitivity/);
 assert.throws(()=>validateReferenceTemplateSensitivity(valid,null,valid.usableMarkers),/reference sensitivity/);
 assert.equal(validateReferenceTemplateSensitivity(JSON.parse(JSON.stringify(valid)),points,valid.usableMarkers).status,'Complete');
});
test('a group represented by one population leaves an explicit partial diagnostic',()=>{
 const changed=structuredClone(panel),code=panel.groups.at(-1).code;
 const remaining=panel.populations.map((population,index)=>({population,index})).filter(({population},index,array)=>population.region!==code||array.findIndex(row=>row.population.region===code)===index);
 changed.populations=remaining.map(row=>row.population);
 changed.markers.forEach(marker=>{
  marker.populationFrequencies=remaining.map(row=>marker.populationFrequencies[row.index]);
  marker.frequencies[panel.groups.length-1]=marker.populationFrequencies[changed.populations.findIndex(population=>population.region===code)];
 });
 const fixture=fixtures[0],result=referenceTemplateSensitivity(changed,fixture.dosages,fixture.expectedFractions);
 assert.equal(result.status,'Partial');assert.deepEqual(result.omittedSinglePopulationGroups,[code]);assert.ok(result.evaluated>0);assert.ok(result.attempted<74);
 validateReferenceTemplateSensitivity(result,groups(fixture),fixture.dosages.filter(value=>value!==null).length);
 const report=estimateAncestry(calls(fixture),panel);report.referenceSensitivity=result;
 assert.ok(ancestryHtml(report).includes('Groups with only one sampled population were not tested'));
});
test('production reports preserve point fits, saved compatibility and sensitivity interpretation',()=>{
 const fixture=fixtures[2],result=estimateAncestry(calls(fixture),panel);
 result.groups.forEach(group=>assert.ok(Math.abs(group.fraction-fixture.expectedFractions[panel.groups.findIndex(row=>row.code===group.code)])<2e-7));
 assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(result))),result);assert.equal(result.referenceSensitivity.status,'Complete');assert.ok(result.referenceSensitivity.maximumAbsoluteChange>.24);
 const html=ancestryHtml(result);assert.ok(html.includes('Reference-panel sensitivity'));assert.ok(html.includes('not confidence intervals'));assert.ok(html.includes('74 of 74'));
 const hostile=structuredClone(result);hostile.referenceSensitivity.largestChangeOmission.label='<img src=x onerror=alert(1)>';assert.ok(!ancestryHtml(hostile).includes('<img src=x'));
 const historical=structuredClone(result);delete historical.referenceSensitivity;validateSavedAncestry(historical);assert.ok(!ancestryHtml(historical).includes('Reference-panel sensitivity'));
 const malformed=structuredClone(result);malformed.referenceSensitivity.groups[0].high=NaN;assert.throws(()=>validateSavedAncestry(malformed),/reference sensitivity/);
});
