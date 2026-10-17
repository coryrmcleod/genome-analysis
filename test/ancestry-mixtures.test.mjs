import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {estimateAncestry,validateAncestryReference,validateSavedAncestry} from '../public/ancestry.js';
const bytes=await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url));
const panel=validateAncestryReference(JSON.parse(bytes));
const fixtures=JSON.parse(await readFile(new URL('./fixtures/ancestry/synthetic-mixtures.json',import.meta.url)));
test('synthetic mixture extremes agree with independent simplex-face solutions and expose narrow sensitivity limits',async()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),fixtures.referenceSha256);
 const verification=await readFile(new URL('./fixtures/ancestry/synthetic-mixtures-independent.json',import.meta.url));
 assert.equal(createHash('sha256').update(verification).digest('hex'),fixtures.verificationSha256);
 assert.equal(JSON.parse(verification).challengeSha256,fixtures.challengeSha256);
 assert.equal(fixtures.cases.length,36);let rangesMissingTruth=0;
 for(const f of fixtures.cases){
  assert.equal(f.dosages.length,panel.markers.length);assert.ok(f.dosages.every(d=>Number.isInteger(d)&&d>=0&&d<=2));
  const input={build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:'Called',alleles:Array.from({length:2},(_,j)=>j<f.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))};
  const result=estimateAncestry(input,panel);assert.equal(result.status,'Estimated',f.label+': '+result.reason);
  const saved=JSON.parse(JSON.stringify(result));assert.deepEqual(validateSavedAncestry(saved),result,f.label+' saved fit');
  for(const [i,c] of fixtures.codes.entries()){
   const g=result.groups.find(g=>g.code===c);assert.ok(Math.abs(g.fraction-f.expectedFractions[i])<2e-6,f.label+' '+c);
   if(f.truth[i]<g.sensitivityLow-1e-12||f.truth[i]>g.sensitivityHigh+1e-12)rangesMissingTruth++;
  }
  assert.ok(Math.abs(result.residual-f.expectedResidual)<1e-8,f.label);
  assert.ok(result.warnings.some(w=>w.includes('not calibrated confidence intervals')));
 }
 assert.ok(rangesMissingTruth>0,'Sensitivity ranges must not be treated as confidence intervals simply because every screen passes');
});
