import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {AUTISM_ALIAS_FILES,loadAutismAliasProof,verifyAutismAliasData} from '../scripts/autism-alias-evidence.mjs';
const fixture=new URL('./fixtures/pgs/autism-alias/',import.meta.url);
test('four autism overlap IDs resolve through explicit frozen NCBI merges and both primary placements',async()=>{
 const result=await loadAutismAliasProof();assert.equal(result.canonicalId,'rs73358778');assert.equal(result.aliases.length,3);
 const data=Object.fromEntries(await Promise.all(Object.keys(AUTISM_ALIAS_FILES).filter(n=>n.endsWith('.json')).map(async n=>[n,JSON.parse(await fs.readFile(new URL(n,fixture)))])));
 for(const mutate of [d=>d['refsnp-2139454386.json'].merged_snapshot_data.merged_into=['1'],d=>d['overlap.json'].push({...d['overlap.json'][1],id:'rs999'}),d=>{const p=d['refsnp-73358778.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000014.8');p.alleles[0].allele.spdi.position++;}]){const changed=structuredClone(data);mutate(changed);assert.throws(()=>verifyAutismAliasData(changed));}
 await assert.rejects(()=>loadAutismAliasProof(async name=>name==='overlap.json'?Buffer.from('[]'):fs.readFile(new URL(name,fixture))),/hash changed/);
});
