import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {THYROID_EXTRA_LOCI,loadExtraThyroidAliasProof,verifyExtraThyroidAliasData,reviewedThyroidMapping} from '../scripts/thyroid-extra-alias-evidence.mjs';
import {reviewedThyroidIdentity} from '../scripts/thyroid-alias-evidence.mjs';
import {effectAlleleCandidates,possibleEffectDosages} from '../public/effect-only-pgs.js';
test('NCBI supplemental primary alleles preserve G/C effect-only uncertainty instead of silently using Ensembl T/G',async()=>{
 const proof=await loadExtraThyroidAliasProof(31113122);
 for(const [build,position] of [['GRCh37',31080899],['GRCh38',31113122]]){
  const input={modelId:'PGS018695',originalSha256:proof.originalSha256,id:'rs2233965',build,mapping:{chrom:'6',position,ref:'T',alleles:['T','G'],unsupportedReferenceAlleles:[]}},before=JSON.stringify(input);
  const result=await reviewedThyroidMapping(input);assert.equal(JSON.stringify(input),before);assert.deepEqual(result.mapping.alleles,['T','A','C','G']);
  const candidates=effectAlleleCandidates('G',result.mapping.alleles);assert.deepEqual(candidates,['G','C']);assert.deepEqual(possibleEffectDosages(['G','G'],candidates),[0,2]);assert.deepEqual(possibleEffectDosages(['C','C'],candidates),[0,2]);assert.deepEqual(possibleEffectDosages(['G','C'],candidates),[1]);
  for(const change of [{modelId:'PGS000653'},{id:'rs4495304'},{originalSha256:'bad'},{mapping:{...input.mapping,position:position+1}},{mapping:{...input.mapping,ref:'G'}},{mapping:{...input.mapping,alleles:['T','A','G']}}])await assert.rejects(()=>reviewedThyroidMapping({...input,...change}),/scope/);
 }
});
test('additional thyroid proofs require every explicit merge, exact source term and both primary allele inventories',async()=>{
 const root=new URL('./fixtures/pgs/thyroid-extra-alias/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root))),data={};
 for(const f of manifest.files)data[f.name]=JSON.parse(await readFile(new URL(f.name,root)));
 for(const locus of THYROID_EXTRA_LOCI){
  const proof=await loadExtraThyroidAliasProof(locus.position);assert.equal(proof.canonicalId,'rs'+locus.canonical);
  const input={modelId:'PGS018695',originalSha256:proof.originalSha256,overlapSha256:proof.overlapSha256,build:'GRCh38',row:{rsID:proof.sourceId,coordinateSource:true,chr_name:'6',chr_position:String(locus.position),effect_allele:locus.effect,effect_weight:locus.weight}};
  assert.deepEqual(await reviewedThyroidIdentity(input),proof);
  for(const change of [{modelId:'PGS000327'},{build:'GRCh37'},{overlapSha256:'bad'},{row:{...input.row,effect_weight:'0'}}])await assert.rejects(()=>reviewedThyroidIdentity({...input,...change}),/scope/);
  let bad=structuredClone(data);bad['refsnp-'+locus.aliases[0]+'.json'].merged_snapshot_data.merged_into=['1'];assert.throws(()=>verifyExtraThyroidAliasData(locus,bad),/merge chain/);
  bad=structuredClone(data);bad[`overlap-${locus.position}.json`].push({...bad[`overlap-${locus.position}.json`].find(r=>r.id==='rs'+locus.canonical),id:'rs999'});assert.throws(()=>verifyExtraThyroidAliasData(locus,bad),/identity set/);
  bad=structuredClone(data);bad['refsnp-'+locus.canonical+'.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000006.11').alleles.pop();assert.throws(()=>verifyExtraThyroidAliasData(locus,bad),/primary alleles/);
 }
 await assert.rejects(()=>loadExtraThyroidAliasProof(31112941,async name=>name==='manifest.json'?Buffer.from('{}'):readFile(new URL(name,root))),/manifest changed/);
 await assert.rejects(()=>loadExtraThyroidAliasProof(31112941,async name=>name==='refsnp-4495304.json'?Buffer.from('{}'):readFile(new URL(name,root))),/hash changed/);
});
