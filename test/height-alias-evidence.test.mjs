import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadHeightAliasProof,verifyHeightAliasData,reviewedHeightIdentity,reviewedHeightMapping,HEIGHT_ORIGINAL_SHA} from '../scripts/height-alias-evidence.mjs';
const root=new URL('./fixtures/pgs/height-alias/',import.meta.url);
test('height alias reconciliation requires all four independent merges, both placements and every documented allele',async()=>{
 const proof=await loadHeightAliasProof(),data={};for(const file of proof.files)if(file.name.endsWith('.json'))data[file.name]=JSON.parse(await readFile(new URL(file.name,root)));
 assert.equal(verifyHeightAliasData(data),true);assert.equal(proof.canonicalId,'rs2270894');assert.equal(proof.aliases.length,4);
 for(const change of [d=>d['refsnp-2125138490.json'].merged_snapshot_data.merged_into=['999'],d=>d['refsnp-2125138509.json'].primary_snapshot_data={},d=>d['refsnp-2270894.json'].withdrawn_snapshot_data={},d=>d['refsnp-2270894.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000003.11').alleles.pop(),d=>d['refsnp-2270894.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000003.12').placement_annot.is_aln_opposite_orientation=true,d=>d['overlap.json'].push({...d['overlap.json'][0],id:'rs999'})]){const bad=structuredClone(data);change(bad);assert.throws(()=>verifyHeightAliasData(bad),/Height alias proof/);}
 const row={rsID:'coordinate:GRCh37:3:9975386',coordinateSource:true,chr_name:'3',chr_position:'9975386',effect_allele:'G',other_allele:'C',effect_weight:'-0.031'},input={modelId:'PGS002980',originalSha256:HEIGHT_ORIGINAL_SHA,row,build:'GRCh37',overlapSha256:proof.overlapSha256};
 assert.deepEqual(await reviewedHeightIdentity(input),proof);
 for(const change of [{modelId:'PGS003256'},{originalSha256:'bad'},{overlapSha256:'bad'},{build:'GRCh38'},{row:{...row,effect_weight:'0.031'}},{row:{...row,chr_position:'9975387'}},{row:{...row,other_allele:'T'}}])await assert.rejects(()=>reviewedHeightIdentity({...input,...change}),/scope/);
 await assert.rejects(()=>loadHeightAliasProof(async name=>name==='manifest.json'?Buffer.from('{}'):readFile(new URL(name,root))),/manifest changed/);
 await assert.rejects(()=>loadHeightAliasProof(async name=>name==='refsnp-2270894.json'?Buffer.from('{}'):readFile(new URL(name,root))),/source hash changed/);
});
test('source-bound height mapping preserves the independently documented third allele on both builds',async()=>{
 for(const [build,position] of [['GRCh37',9975386],['GRCh38',9933702]]){
  const mapping={chrom:'3',position,ref:'C',alleles:['C','G'],unsupportedReferenceAlleles:[]},before=JSON.stringify(mapping),input={modelId:'PGS002980',originalSha256:HEIGHT_ORIGINAL_SHA,id:'rs2270894',build,mapping},verified=await reviewedHeightMapping(input);
  assert.deepEqual(verified.mapping,{...mapping,alleles:['C','G','T']});assert.equal(JSON.stringify(mapping),before);assert.deepEqual(verified.evidence.ensemblMapping,mapping);assert.match(verified.evidence.reason,/unresolved C\/G palindromic orientation/);
  for(const change of [{modelId:'PGS003256'},{id:'rs999'},{originalSha256:'bad'},{build:'GRCh36'},{mapping:{...mapping,ref:'G'}},{mapping:{...mapping,position:position+1}},{mapping:{...mapping,alleles:['C','T']}}])await assert.rejects(()=>reviewedHeightMapping({...input,...change}),/scope/);
 }
});
