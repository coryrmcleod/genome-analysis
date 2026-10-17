import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateAncestryReference,estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';
const panel=validateAncestryReference(JSON.parse(fs.readFileSync('public/data/ancestry-reference.json'))),fixture=JSON.parse(fs.readFileSync('test/fixtures/ancestry/public-fixtures.json'))[0];
const calls=build=>panel.markers.map((m,i)=>({id:m.id,status:fixture.dosages[i]===null?'No call':'Called',recordObserved:true,alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[i]?m.alt:m.mappings[build].ref)}));
const fit=(build,results)=>estimateAncestry({build,format:'VCF',results},panel);
test('ancestry excludes explicitly absent calls and conflicting duplicates on both builds',()=>{
 for(const build of ['GRCh37','GRCh38']){
  const results=calls(build),before=JSON.stringify(results),absent=fit(build,results.map(r=>({...r,recordObserved:false})));assert.equal(absent.status,'Unavailable');assert.equal(absent.usableMarkers,0);assert.equal(absent.coverage,0);assert.deepEqual(absent.groups,[]);assert.deepEqual(absent.populationAffinities,[]);validateSavedAncestry(JSON.parse(JSON.stringify(absent)));
  const index=results.findIndex(r=>r.status==='Called'),original=results[index],bad={...original,recordObserved:false},expected=fit(build,results.map((r,i)=>i===index?{...r,status:'Conflicting records',alleles:null}:r));
  for(const rows of [[...results,bad],[bad,...results],[...results,bad,original]])assert.deepEqual(fit(build,rows),expected);
  assert.equal(expected.usableMarkers,fit(build,results).usableMarkers-1);assert.equal(expected.callStatuses['Conflicting records'],1);assert.equal(JSON.stringify(results),before);
 }
});
test('ancestry preserves valid observed calls and historical missing or unknown presence flags',()=>{
 for(const build of ['GRCh37','GRCh38']){const results=calls(build),expected=fit(build,results);assert.equal(expected.status,'Estimated');for(const presence of [null,undefined])assert.deepEqual(fit(build,results.map(r=>({...r,recordObserved:presence}))),expected);}
});
