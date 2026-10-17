import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {estimateAncestry,validateAncestryReference,validateSavedAncestry} from '../public/ancestry.js';
test('deliberately biased calls retain independent arithmetic checks without implying that passing screens establishes precision',async()=>{
 const panelBytes=await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url)),panel=validateAncestryReference(JSON.parse(panelBytes)),publicBytes=await readFile(new URL('./fixtures/ancestry/public-fixtures.json',import.meta.url));
 const publicFixtures=JSON.parse(publicBytes),frozen=JSON.parse(await readFile(new URL('./fixtures/ancestry/call-errors.json',import.meta.url))),verification=await readFile(new URL('./fixtures/ancestry/call-errors-independent.json',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(panelBytes),frozen.referenceSha256);assert.equal(hash(publicBytes),frozen.publicFixturesSha256);assert.equal(hash(verification),frozen.verificationSha256);assert.equal(JSON.parse(verification).challengeSha256,frozen.challengeSha256);assert.equal(frozen.cases.length,8);
 for(const f of frozen.cases){
  const original=publicFixtures.find(r=>r.publicSample===f.publicSample);assert.ok(original);
  assert.equal(f.dosages.length,panel.markers.length);assert.equal(f.dosages.filter((d,i)=>d!==original.dosages[i]).length,f.changed);
  const input={build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:f.dosages[i]===null?'No call':'Called',alleles:f.dosages[i]===null?null:Array.from({length:2},(_,j)=>j<f.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))};
  const result=estimateAncestry(input,panel);assert.equal(result.status,'Estimated');assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(result))),result);
  const fractions=panel.groups.map(g=>result.groups.find(r=>r.code===g.code).fraction);
  fractions.forEach((v,i)=>assert.ok(Math.abs(v-f.expectedFractions[i])<2e-6));assert.ok(Math.abs(result.residual-f.expectedResidual)<1e-8);
  const change=Math.max(...fractions.map((v,i)=>Math.abs(v-original.expectedFractions[i])));assert.ok(Math.abs(change-f.maximumChange)<2e-6);
 }
 assert.ok(frozen.cases.some(f=>f.maximumChange>.16));assert.ok(frozen.limitations.some(s=>s.includes('not an empirical')));
});
