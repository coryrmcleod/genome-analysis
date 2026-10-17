import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateAncestryReference,estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';
const proof=JSON.parse(await readFile(new URL('fixtures/ancestry/heldout-missing-independent-corners.json',import.meta.url))),bytes=await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.referenceSha256);
const panel=validateAncestryReference(JSON.parse(bytes));assert.deepEqual(proof.groupCodes,panel.groups.map(row=>row.code));
function estimate(fixture){return estimateAncestry({build:'GRCh38',format:'VCF',results:panel.markers.flatMap((marker,index)=>{
 const dosage=fixture.dosages[index],excluded=index%11===0;if(excluded&&index%33===0)return [];
 return [{id:marker.id,status:excluded?(index%22===0?'Quality limited':'No call'):dosage===null?'No call':'Called',alleles:dosage===null?null:Array.from({length:2},(_,copy)=>copy<dosage?marker.alt:marker.mappings.GRCh38.ref)}];
})},panel);}
test('masked public cohort corner fits agree with independent simplex-face optima',()=>{
 const cases=proof.cases.filter(row=>row.expectedStatus==='Estimated');assert.equal(new Set(cases.map(row=>row.region)).size,8);
 for(const fixture of cases){const actual=estimate(fixture);assert.equal(actual.status,'Estimated');assert.equal(actual.usableMarkers,fixture.usableMarkers);for(const [index,code] of proof.groupCodes.entries())assert.ok(Math.abs(actual.groups.find(row=>row.code===code).fraction-fixture.expectedFractions[index])<2e-7,`${fixture.publicSample} ${code}`);assert.ok(Math.abs(actual.residual-fixture.expectedResidual)<1e-7);assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(actual))),actual);}
});
test('masked public coverage corners withhold results despite mathematically solvable mixtures',()=>{
 const cases=proof.cases.filter(row=>row.expectedStatus==='Unavailable');assert.equal(cases.length,2);
 for(const fixture of cases){const actual=estimate(fixture);assert.equal(actual.status,'Unavailable');assert.equal(actual.usableMarkers,fixture.usableMarkers);assert.ok(actual.coverage<.9);assert.match(actual.reason,/90% panel coverage/);assert.deepEqual(actual.groups,[]);assert.deepEqual(actual.populationAffinities,[]);assert.equal(actual.referenceSensitivity,undefined);assert.equal(validateSavedAncestry(JSON.parse(JSON.stringify(actual))).status,'Unavailable');}
});
