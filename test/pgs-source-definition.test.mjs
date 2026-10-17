import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {publicationEvidence,parseScoringFile} from '../scripts/import-pgs-library.mjs';
import {SOURCE_DEFINITION_EXCLUSIONS} from '../scripts/pgs-source-definition-exclusions.mjs';
test('CAD source conflict binds every deposited term and cannot be bypassed by a publication-match flag',async()=>{
 const proof=SOURCE_DEFINITION_EXCLUSIONS.PGS000349,bytes=await readFile(new URL('./fixtures/pgs/evidence/PGS000349-source-definition.txt.gz',import.meta.url));
 const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,proof.originalSha256);
 const source=parseScoringFile(gunzipSync(bytes).toString()),primary=JSON.parse(await readFile(new URL('./fixtures/pgs/evidence/PGS000349-primary-table.json',import.meta.url))).slice(1);
 assert.equal(source.rows.length,70);assert.equal(primary.length,70);assert.equal(new Set(primary.map(r=>r[1])).size,70);
 for(const r of source.rows){const t=primary.find(t=>t[1]===r.rsID);assert.ok(t,r.rsID);assert.deepEqual([r.chr_name,r.chr_position,r.effect_allele,r.other_allele], [t[0],t[2],t[3],t[4]]);const hr=Number(t[6].split(' ')[0]);assert.equal(Number(r.HR),hr);assert.ok(Math.abs(Number(r.effect_weight)-Math.log(hr))<1e-12);}
 const meta={id:'PGS000349',matches_publication:true,publication:{PMID:32912153}};
 assert.throws(()=>publicationEvidence(meta,{},hash),/primary-source definition unresolved/);
 assert.throws(()=>publicationEvidence(meta,{},'a'.repeat(64)),/source changed.*re-review/);
 assert.throws(()=>publicationEvidence({...meta,publication:{PMID:1}}, {},hash),/source changed.*re-review/);
 assert.deepEqual(publicationEvidence({...meta,id:'PGS000350'}, {},hash),{matchesPublication:true});
});
