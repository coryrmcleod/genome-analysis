import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {estimateAncestry,validateAncestryReference,validateSavedAncestry} from '../public/ancestry.js';
test('chromosome-wise synthetic source assignments agree with independent solutions and retain interpretation limits',async()=>{
 const bytes=await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url)),panel=validateAncestryReference(JSON.parse(bytes));
 const fixture=JSON.parse(await readFile(new URL('./fixtures/ancestry/chromosome-mixtures.json',import.meta.url))),verification=await readFile(new URL('./fixtures/ancestry/chromosome-mixtures-independent.json',import.meta.url));
 const hash=b=>createHash('sha256').update(b).digest('hex');
 assert.equal(hash(bytes),fixture.referenceSha256);assert.equal(hash(verification),fixture.verificationSha256);assert.equal(JSON.parse(verification).challengeSha256,fixture.challengeSha256);
 assert.equal(fixture.cases.length,15);assert.ok(fixture.limitations.some(s=>s.includes('not genome-length fractions')));
 for(const f of fixture.cases){
  assert.equal(f.dosages.length,panel.markers.length);assert.ok(f.dosages.every(d=>Number.isInteger(d)&&d>=0&&d<=2));
  const share=panel.markers.filter(m=>f.chromosomes.includes(m.mappings.GRCh38.chrom)).length/(2*panel.markers.length);
  assert.deepEqual(f.assignedMarkerShares,fixture.codes.map(c=>c===f.firstSource?1-share:c===f.secondSource?share:0));
  const input={build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:'Called',alleles:Array.from({length:2},(_,j)=>j<f.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))};
  const fit=estimateAncestry(input,panel);assert.equal(fit.status,'Estimated',f.label);assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(fit))),fit);
  for(const [i,c]of fixture.codes.entries())assert.ok(Math.abs(fit.groups.find(g=>g.code===c).fraction-f.expectedFractions[i])<2e-6,f.label+' '+c);
  assert.ok(Math.abs(fit.residual-f.expectedResidual)<1e-8,f.label);assert.ok(fit.warnings.some(w=>w.includes('not calibrated confidence intervals')));
 }
});
