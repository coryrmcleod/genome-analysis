import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {THYROID_ALIAS_FILES,loadThyroidAliasProof,verifyThyroidAliasData,reviewedThyroidIdentity} from '../scripts/thyroid-alias-evidence.mjs';
test('thyroid identity exception binds complete source, seven identities and exact primary placements',async()=>{
 const root=new URL('./fixtures/pgs/thyroid-alias/',import.meta.url),data={};
 for(const name of Object.keys(THYROID_ALIAS_FILES).filter(x=>x.endsWith('.json')))data[name]=JSON.parse(await readFile(new URL(name,root)));
 const proof=await loadThyroidAliasProof();assert.equal(proof.canonicalId,'rs3734854');assert.equal(proof.aliases.length,6);
 const input={modelId:'PGS018695',originalSha256:THYROID_ALIAS_FILES['original.txt.gz'],overlapSha256:THYROID_ALIAS_FILES['overlap.json'],build:'GRCh38',row:{rsID:'coordinate:GRCh38:6:31111059',coordinateSource:true,chr_name:'6',chr_position:'31111059',effect_allele:'A',effect_weight:'0.0014297611489797'}};
 assert.deepEqual(await reviewedThyroidIdentity(input),proof);
 for(const change of [{modelId:'PGS000327'},{originalSha256:'bad'},{overlapSha256:'bad'},{build:'GRCh37'},{row:{...input.row,effect_allele:'T'}},{row:{...input.row,effect_weight:'0.1'}}])await assert.rejects(()=>reviewedThyroidIdentity({...input,...change}),/scope/);
 await assert.rejects(()=>loadThyroidAliasProof(async n=>n==='original.txt.gz'?Buffer.from('changed'):readFile(new URL(n,root))),/hash changed/);
 let bad=structuredClone(data);bad['refsnp-2113381368.json'].merged_snapshot_data.merged_into=['1'];assert.throws(()=>verifyThyroidAliasData(bad),/merge chain/);
 bad=structuredClone(data);bad['overlap.json'].push({...bad['overlap.json'].find(x=>x.id==='rs3734854'),id:'rs999'});assert.throws(()=>verifyThyroidAliasData(bad),/identity set/);
 bad=structuredClone(data);bad['refsnp-3734854.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000006.11').alleles[0].allele.spdi.position++;assert.throws(()=>verifyThyroidAliasData(bad),/primary alleles/);
});
