import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PSORIATIC_ALIAS_FILES,loadPsoriaticAliasProof,verifyPsoriaticAliasData} from '../scripts/psoriatic-alias-evidence.mjs';
test('psoriatic alias evidence proves all five identities and both primary allele inventories without admission',async()=>{
 const root=new URL('./fixtures/pgs/psoriatic-alias/',import.meta.url),proof=await loadPsoriaticAliasProof(),data={};assert.equal(proof.canonicalId,'rs2073004');assert.equal(proof.aliases.length,4);
 for(const name of Object.keys(PSORIATIC_ALIAS_FILES).filter(n=>n.endsWith('.json')))data[name]=JSON.parse(await readFile(new URL(name,root)));
 for(const mutate of [d=>d['refsnp-2113330529.json'].merged_snapshot_data.merged_into=['1'],d=>d['overlap.json'].pop(),d=>d['overlap.json'].push({...d['overlap.json'][0],id:'rs999'}),d=>d['refsnp-2073004.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000006.11').alleles[0].allele.spdi.position++]){const changed=structuredClone(data);mutate(changed);assert.throws(()=>verifyPsoriaticAliasData(changed));}
 for(const changed of Object.keys(PSORIATIC_ALIAS_FILES))await assert.rejects(loadPsoriaticAliasProof(async name=>name===changed?Buffer.from('changed'):readFile(new URL(name,root))),/hash changed/);
});
