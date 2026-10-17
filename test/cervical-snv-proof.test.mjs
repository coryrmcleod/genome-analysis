import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {loadCervicalDeletionProof} from '../scripts/cervical-deletion-proof.mjs';
import {harmonizeModelAlleles} from '../public/allele-harmonization.js';
import {verifyInstalledCervical} from '../scripts/import-reviewed-cervical.mjs';
const fixture=new URL('./fixtures/pgs/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const rows=name=>{const lines=gunzipSync(fs.readFileSync(new URL('cervical-deletion/'+name,fixture))).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),keys=lines.shift().split('\t');return lines.map(l=>Object.fromEntries(keys.map((k,i)=>[k,l.split('\t')[i]])));};
test('complete cervical model has independently frozen14SNV mappings plus its distinct deletion proof',async()=>{
 const deletion=await loadCervicalDeletionProof(),original=rows('original.txt.gz'),snvs=original.filter(r=>r.rsID!==deletion.sourceId);
 assert.equal(original.length,15);assert.equal(snvs.length,14);
 const orientations={};
 for(const [build,sha] of [['GRCh37','275ce394db6c855bcfef877bdff4e867146fc2d5bc8d5bdae3ae9f0994e380a7'],['GRCh38','41ca28e6a2c2d143e378c8683dd4728cd9b64e7a67c36b9245f32d10a8912fc2']]){
  const bytes=fs.readFileSync(new URL('cervical-snv/'+build+'-variation.json',fixture));assert.equal(hash(bytes),sha);
  const data=JSON.parse(bytes),hm=rows(build+'.txt.gz');orientations[build]=[];
  assert.equal(Object.keys(data).length,14);
  for(const r of snvs){
   const h=hm.find(h=>h.rsID===r.rsID),v=data[h.hm_rsID];assert.equal(v.name,h.hm_rsID);assert.ok(h.hm_rsID===r.rsID||v.synonyms.includes(r.rsID));
   assert.notEqual(h.hm_match_pos,'False');assert.notEqual(h.hm_match_chr,'False');
   assert.deepEqual([h.effect_allele,h.other_allele,h.effect_weight],[r.effect_allele,r.other_allele,r.effect_weight]);
   if(build==='GRCh37')assert.deepEqual([h.hm_chr,h.hm_pos],[r.chr_name,r.chr_position]);
   const hits=v.mappings.filter(m=>m.assembly_name===build&&m.strand===1&&m.seq_region_name===h.hm_chr&&m.start===Number(h.hm_pos)&&m.end===m.start);assert.equal(hits.length,1);
   const alleles=hits[0].allele_string.split('/').filter(a=>/^[ACGT]$/.test(a));orientations[build].push([h.hm_rsID,harmonizeModelAlleles(r.effect_allele,r.other_allele,alleles)]);
  }
 }
 assert.deepEqual(orientations.GRCh37,orientations.GRCh38);
 const installed=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url))),model=installed.models.find(m=>m.id==='PGS005165');if(model)assert.equal(await verifyInstalledCervical(model,installed.targets),true);
});
