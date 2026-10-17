import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {estimateAncestry,validateSavedAncestry} from '../public/ancestry.js';import {loadAncestryReference} from '../public/ancestry-reference-loader.js';
const bytes=fs.readFileSync('public/data/ancestry-reference.json'),fixtureBytes=fs.readFileSync('test/fixtures/ancestry/public-fixtures.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'),'0413c01df04fe979fe313718ef6956a0c23504ed05d97bbb05e3ea4a38e60b68');assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),'15faab1628ce2629a898d8369ebe937fe1a8aa06fd11a0e059a9467ad4312892');
const panel=await loadAncestryReference(new Response(bytes),new Response(fs.readFileSync('public/data/ancestry-numerical-verification.json'))),fixtures=JSON.parse(fixtureBytes);
for(const build of ['GRCh37','GRCh38'])test(`public ancestry fits, usable masks and saved evidence survive record permutations on ${build}`,()=>{
 for(const fixture of fixtures){
  const records=panel.markers.map((m,i)=>({id:m.id,status:fixture.dosages[i]===null?'No call':'Called',recordObserved:true,alleles:fixture.dosages[i]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[i]?m.alt:m.mappings[build].ref)})),original=JSON.stringify(records),fit=results=>estimateAncestry({build,format:'VCF',results},panel),baseline=fit(records);
  const bits=fixture.dosages.map(d=>d===null?'0':'1').join(''),expectedMask=bits.padEnd(Math.ceil(bits.length/4)*4,'0').match(/.{4}/g).map(chunk=>parseInt(chunk,2).toString(16)).join('');assert.equal(baseline.usableMarkerMaskHex,expectedMask);assert.equal(baseline.usableMarkers,fixture.dosages.filter(d=>d!==null).length);assert.equal(baseline.status,'Estimated');for(const [i,g] of panel.groups.entries())assert.ok(Math.abs(baseline.groups.find(row=>row.code===g.code).fraction-fixture.expectedFractions[i])<=2e-7,fixture.publicSample+':'+g.code);assert.ok(Math.abs(baseline.residual-fixture.expectedResidual)<=1e-7);
  const interleaved=[...records.filter((_,i)=>i%2===1),...records.filter((_,i)=>i%2===0)];const duplicates=records.filter((_,i)=>i%97===0).map(row=>({...row,alleles:row.alleles?.slice().reverse()??null}));
  for(const variant of [[...records].reverse(),interleaved,[...duplicates,...records,...duplicates].reverse()]){const before=JSON.stringify(variant),actual=fit(variant);assert.deepEqual(actual,baseline,fixture.publicSample);assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(actual))),actual);assert.equal(JSON.stringify(variant),before);}
  assert.equal(JSON.stringify(records),original);
 }
});
