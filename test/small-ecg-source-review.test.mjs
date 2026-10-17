import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {verifySourceDefinition,SOURCE_DEFINITION_EXCLUSIONS} from '../scripts/pgs-source-definition-exclusions.mjs';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
const read=p=>fs.readFileSync(new URL('./fixtures/pgs/primary/'+p,import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
test('six-term ECG chromosome conflict remains bound to primary and independent assembly evidence',()=>{
 const original=read('PGS000914.txt.gz'),primary=JSON.parse(read('small-ecg-comparison.json')),proof=JSON.parse(read('small-ecg-variant-proof.json')),raw=read('small-ecg-NCBI.json'),guard=SOURCE_DEFINITION_EXCLUSIONS.PGS000914;
 assert.equal(hash(original),guard.originalSha256);assert.equal(hash(original),primary.originalSHA256);assert.equal(hash(raw),proof.sha256);assert.equal(hash(read('small-ecg-primary.xml')),primary.primaryXMLSHA256);assert.equal(hash(read('small-ecg-correction.xml')),primary.correctionXMLSHA256);
 const terms=parseScoringFile(gunzipSync(original).toString()).rows;assert.equal(terms.length,6);assert.equal(primary.coefficients.length,6);
 const term=terms.find(r=>r.rsID==='rs10758440');assert.deepEqual([term.chr_name,term.chr_position,term.effect_allele,term.other_allele,term.effect_weight],['18','37573330','C','A','0.645']);
 const data=JSON.parse(raw);assert.equal(String(data.refsnp_id),'10758440');
 for(const [assembly,seq,pos] of [['GRCh37.p13','NC_000009.11',37573329],['GRCh38.p14','NC_000009.12',37573332]]){
  const p=data.primary_snapshot_data.placements_with_allele.filter(p=>p.seq_id===seq&&p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name===assembly&&a.is_chromosome&&a.is_top_level));assert.equal(p.length,1);
  assert.deepEqual(p[0].alleles.map(a=>a.allele.spdi.position),[pos,pos]);assert.deepEqual(p[0].alleles.map(a=>a.allele.spdi.deleted_sequence),['A','A']);assert.deepEqual(p[0].alleles.map(a=>a.allele.spdi.inserted_sequence).sort(),['A','C']);
 }
 const meta={id:'PGS000914',publication:{PMID:33633301}},before=JSON.stringify(meta);assert.throws(()=>verifySourceDefinition(meta,hash(original)),/primary-source definition unresolved/);assert.equal(JSON.stringify(meta),before);
 assert.throws(()=>verifySourceDefinition(meta,'a'.repeat(64)),/re-review/);assert.throws(()=>verifySourceDefinition({...meta,publication:{PMID:1}},hash(original)),/re-review/);
});
