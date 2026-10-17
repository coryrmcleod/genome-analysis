import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateAncestryReference,estimateAncestry} from '../public/ancestry.js';
const proof=JSON.parse(await readFile(new URL('fixtures/ancestry/population-likelihood-independent.json',import.meta.url)));
for(const [path,hash] of Object.entries(proof.sources))assert.equal(createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex'),hash);
const panel=validateAncestryReference(JSON.parse(await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url)))),fixtures=JSON.parse(await readFile(new URL('fixtures/ancestry/public-fixtures.json',import.meta.url)));
for(const pattern of ['original','every-25th-marker-excluded'])test(`population similarity agrees with independent scalar likelihoods: ${pattern}`,()=>{
 const cases=proof.cases.filter(row=>row.pattern===pattern);assert.equal(cases.length,7);
 for(const expected of cases)for(const build of ['GRCh37','GRCh38']){
  const fixture=fixtures.find(row=>row.publicSample===expected.publicSample);
  const results=panel.markers.flatMap((marker,index)=>{
   const excluded=pattern!=='original'&&index%25===0,dosage=fixture.dosages[index];if(excluded&&index%75===0)return [];
   return [{id:marker.id,status:excluded?(index%50===0?'Quality limited':'No call'):dosage===null?'No call':'Called',alleles:excluded||dosage===null?null:Array.from({length:2},(_,copy)=>copy<dosage?marker.alt:marker.mappings[build].ref)}];
  });
  const actual=estimateAncestry({build,format:'VCF',results},panel);assert.equal(actual.status,'Estimated',`${fixture.publicSample}: ${actual.reason}`);assert.equal(actual.usableMarkers,expected.usableMarkers);assert.deepEqual(actual.populationAffinities.map(row=>row.code),expected.topEight.map(row=>row.code));
  for(const [index,row] of actual.populationAffinities.entries())assert.ok(Math.abs(row.meanLogLikelihood-expected.topEight[index].meanLogLikelihood)<1e-12,`${fixture.publicSample} ${build} ${row.code}`);
 }
});
