import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateAncestryReference,estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';
const proof=JSON.parse(fs.readFileSync('test/fixtures/ancestry/heldout-original-independent-corners.json')),bytes=fs.readFileSync('public/data/ancestry-reference.json');assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.referenceSha256);
const panel=validateAncestryReference(JSON.parse(bytes));assert.deepEqual(proof.groupCodes,panel.groups.map(g=>g.code));
for(const build of ['GRCh37','GRCh38'])test(`original public held-out corners retain all seven independent optimum fractions on ${build}`,()=>{
 assert.equal(new Set(proof.cases.map(c=>c.region)).size,8);
 for(const fixture of proof.cases){const result=estimateAncestry({build,format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:fixture.dosages[i]===null?'No call':'Called',alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[i]?m.alt:m.mappings[build].ref)}))},panel);
  assert.equal(result.status,'Estimated',fixture.publicSample);assert.equal(result.usableMarkers,fixture.usableMarkers);assert.equal(result.coverage,fixture.usableMarkers/panel.markers.length);
  for(const [i,code] of proof.groupCodes.entries())assert.ok(Math.abs(result.groups.find(g=>g.code===code).fraction-fixture.expectedFractions[i])<2e-7,`${fixture.publicSample} ${code}`);
  assert.ok(Math.abs(result.residual-fixture.expectedResidual)<1e-7);assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(result))),result);
 }
});
