import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {loadAncestryReference} from '../public/ancestry-reference-loader.js';
import {ancestryTargetCatalog,validateSavedAncestry} from '../public/ancestry.js';import {analyzeText} from '../public/engine.js';import {ancestryHtml} from '../public/ancestry-view.js';
const bytes=fs.readFileSync('public/data/ancestry-reference.json'),fixtureBytes=fs.readFileSync('test/fixtures/ancestry/public-fixtures.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'),'0413c01df04fe979fe313718ef6956a0c23504ed05d97bbb05e3ea4a38e60b68');
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),'15faab1628ce2629a898d8369ebe937fe1a8aa06fd11a0e059a9467ad4312892');
const panel=await loadAncestryReference(new Response(bytes),new Response(fs.readFileSync('public/data/ancestry-numerical-verification.json'))),fixtures=JSON.parse(fixtureBytes),complement={A:'T',C:'G',G:'C',T:'A'};
function input(fixture,build,format,reverse=false){
 const header=format==='23andMe'?`# 23andMe raw data\n# genome ${build}\n# rsid chromosome position genotype\n`:`# AncestryDNA raw data\n# genome ${build}\nrsid chromosome position allele1 allele2\n`;
 return header+panel.markers.map((m,i)=>{const a=m.mappings[build],d=fixture.dosages[i],alleles=d===null?['-','-']:Array.from({length:2},(_,copy)=>{const base=copy<d?m.alt:a.ref;return reverse?complement[base]:base;});return [m.id,a.chrom,a.position,...(format==='Ancestry'?alleles:[alleles.join('')])].join('\t');}).join('\n');
}
for(const build of ['GRCh37','GRCh38'])for(const format of ['23andMe','Ancestry'])test(`${format} public inputs retain independent ancestry fits and quality limits on ${build}`,()=>{
 assert.equal(fixtures.length,7);
 for(const fixture of fixtures){
  const report=analyzeText(input(fixture,build,format),ancestryTargetCatalog(panel),{ancestryReference:panel}),actual=report.ancestry;
  assert.equal(report.build,build);assert.equal(report.format,format);assert.equal(actual.status,'Estimated');
  assert.equal(actual.usableMarkers,fixture.dosages.filter(d=>d!==null).length);
  for(const [index,group] of panel.groups.entries())assert.ok(Math.abs(actual.groups.find(row=>row.code===group.code).fraction-fixture.expectedFractions[index])<=2e-7,`${fixture.publicSample}:${group.code}`);
  assert.ok(Math.abs(actual.residual-fixture.expectedResidual)<=1e-7);
  assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(actual))),actual);
  assert.deepEqual(actual.numericalVerification,panel.numericalVerification);
  assert.match(ancestryHtml(actual),/Consumer-array genotypes have no sequencing quality metrics/);
 }
});
test('consumer inputs never infer a strand from reverse-complemented calls at forward loci',()=>{
 for(const build of ['GRCh37','GRCh38'])for(const format of ['23andMe','Ancestry']){
  const actual=analyzeText(input(fixtures[0],build,format,true),ancestryTargetCatalog(panel),{ancestryReference:panel}).ancestry;
  assert.equal(actual.status,'Unavailable');assert.equal(actual.usableMarkers,0);assert.equal(actual.coverage,0);assert.deepEqual(actual.groups,[]);assert.deepEqual(actual.populationAffinities,[]);
  assert.deepEqual(validateSavedAncestry(JSON.parse(JSON.stringify(actual))),actual);
 }
});
