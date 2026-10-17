import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {publicationEvidence,parseScoringFile} from '../scripts/import-pgs-library.mjs';import {SOURCE_DEFINITION_EXCLUSIONS} from '../scripts/pgs-source-definition-exclusions.mjs';
const read=n=>fs.readFileSync(new URL('./fixtures/pgs/primary/'+n,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
test('CRP-labelled definitions retain all terms while primary DHEAS coefficient identity blocks admission',()=>{
 const proof=JSON.parse(read('small-crp-trait-conflict.json'));
 assert.equal(proof.sourceProofs.dheas.source.sha256,'30916ef9189513419a94c9df475ee675b729dc30d7653166ea516b5f17514bb5');assert.equal(proof.sourceProofs.hscrp.source.sha256,'8a33cf1a0f2032a7459df4985f5c3c27e9998958faefa29a122ca26285430d1a');
 for(const [kind,count] of [['dheas',25278469],['hscrp',25215800]]){assert.equal(proof.sourceProofs[kind].rowsRead,count);assert.equal(proof.sourceProofs[kind].completeGzipIntegrityVerified,true);assert.equal(proof.sourceProofs[kind].candidateRows.length,2);}
 assert.equal(hash(read('small-crp-GCST005067.yaml')),'ecb19fb06e7de3d2e78a7a685015cab31916981b5bece3538a257e994d012a5b');assert.equal(hash(read('small-crp-GCST004941.yaml')),'11e9f489860a4cb8785295ed059cc592aa5b32ccad2c4dee84b1d8408e55c622');
 assert.match(read('small-crp-GCST005067.yaml').toString(),/C-reactive protein levels/);assert.match(read('small-crp-GCST004941.yaml').toString(),/Dehydroepiandrosterone sulphate levels/);
 for(const model of proof.models){const bytes=read(model.id+'-trait-conflict.txt.gz'),metaBytes=read(model.id+'-trait-conflict.json'),meta=JSON.parse(metaBytes),guard=SOURCE_DEFINITION_EXCLUSIONS[model.id];
  assert.equal(hash(bytes),guard.originalSha256);assert.equal(hash(bytes),model.originalSHA256);assert.equal(hash(metaBytes),model.metadataSHA256);assert.equal(meta.samples_variants[0].source_GWAS_catalog,'GCST005067');
  const terms=parseScoringFile(gunzipSync(bytes).toString(),{allowCoordinateIds:true}).rows;assert.equal(terms.length,2);
  for(const c of model.comparisons){const t=terms.find(t=>t.chr_name===c.term.chr_name&&t.chr_position===c.term.chr_position);assert.ok(t);assert.equal(t.effect_weight,c.sourceRows.dheas.beta);assert.notEqual(Number(t.effect_weight),Number(c.sourceRows.hscrp.beta));assert.equal(c.matchesDHEAS,true);assert.equal(c.matchesCRP,false);
   for(const source of Object.values(c.sourceRows)){assert.deepEqual(source.rawLine.split(/\s+/),[source.rsID,source.chrom,String(source.position),source.referenceAllele,source.effectAllele,source.pvalue,source.beta,source.se]);assert.equal(source.effectAllele,t.effect_allele);assert.equal(source.referenceAllele,t.other_allele);assert.equal(source.chrom,t.chr_name);assert.equal(String(source.position),t.chr_position);}
  }
  const before=JSON.stringify(meta);assert.throws(()=>publicationEvidence({...meta,matches_publication:true},{},hash(bytes)),/primary-source definition unresolved/);assert.equal(JSON.stringify(meta),before);assert.throws(()=>publicationEvidence(meta,{},'a'.repeat(64)),/re-review/);
 }
});
