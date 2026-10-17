import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {effectDirection,personalDirection,traitFamily,clusterTraits} from '../public/traits.js';
import {analyzeText} from '../public/engine.js';
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
const study=catalog.records.find(r=>r.id==='rs13266634');
test('explicit study decrease retains the named allele, exact trait and units',()=>{
  const d=effectDirection(study);assert.equal(d.direction,'lower');assert.equal(d.allele,'T');assert.equal(d.raw,'0.0575 unit decrease');assert.match(d.label,/unreviewed/);assert.ok(d.text.includes(study.trait));
  assert.match(personalDirection({...study,status:'Called',copies:1}),/withheld/);
});
test('ambiguous text, bare betas, conflicting direction and wrong allele cannot imply a direction',()=>{
  for(const raw of [null,'0.1','-0.1 unit increase','0 unit increase','0.1 increase or decrease','1.2 odds ratio','Infinity unit increase','1e999 unit increase']) assert.equal(effectDirection({...study,association:{...study.association,reportedEffect:raw}}).direction,'unknown');
  assert.equal(effectDirection({...study,effectAllele:'C'}).direction,'unknown');
});
test('missing and failed calls never get a personal direction, and zero copies never invert it',()=>{
  for(const status of ['Not observed','No call','Quality limited','Allele / ID mismatch','Conflicting records']) assert.match(personalDirection({...study,status,copies:null}),/not interpreted/);
  assert.match(personalDirection({...study,status:'Called',copies:0}),/does not establish an opposite effect/);
});
test('lactase marker is allele-specific and dominant without a percentile',()=>{
  const r=catalog.records.find(r=>r.id==='rs4988235');
  assert.equal(effectDirection(r).direction,'higher');assert.equal(effectDirection({...r,effectAllele:'G'}).direction,'unknown');
  for(const copies of [1,2]) assert.match(personalDirection({...r,status:'Called',copies}),/supports the lactase-persistence marker/);
  assert.match(effectDirection(r).caveat,/not interpreted as twice/);
  assert.equal(clusterTraits([r])[0].score.percentile,null);
});
test('families retain endpoints and do not merge ratio traits, HbA1c and diabetes',()=>{
  assert.equal(traitFamily({trait:'LDL cholesterol levels'}),'LDL cholesterol');
  assert.equal(traitFamily({trait:'Free cholesterol to total lipids ratio in medium LDL'}),'Free cholesterol to total lipids ratio in medium LDL');
  assert.notEqual(traitFamily({trait:'Type 2 diabetes'}),traitFamily({trait:'Glycated haemoglobin HbA1c levels UKB data field 30750'}));
  const groups=clusterTraits(catalog.records);assert.equal(groups.reduce((n,g)=>n+g.variants.length,0),100);
  assert.ok(groups.every(g=>g.score.percentile===null&&g.score.status==='unavailable'));
});
test('new report and exported trait metadata preserve quality gates and personal interpretation',()=>{
  const m=study.mappings.GRCh38,alts=m.alleles.filter(a=>a!==m.ref),idx=[m.ref,...alts].indexOf(study.effectAllele);
  const vcf=`##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n${m.chrom}\t${m.position}\t${study.id}\t${m.ref}\t${alts.join(',')}\t80\tPASS\t.\tGT:GQ:DP\t0/${idx}:60:30`;
  const report=analyzeText(vcf,catalog),r=report.results.find(r=>r.id===study.id);
  assert.equal(r.effectDirection.direction,'lower');assert.match(r.directionInterpretation,/withheld/);
  assert.equal(report.traits.flatMap(g=>g.variantIds).length,100);
  assert.match(report.results.find(r=>r.id==='rs4988235').directionInterpretation,/not interpreted/);
});
