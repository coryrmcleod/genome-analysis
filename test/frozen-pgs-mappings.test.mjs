import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {freezePGSMappings} from '../scripts/freeze-pgs-mappings.mjs';
import {mergePGSMappingEvidence} from '../scripts/pgs-mapping-cache.mjs';
import {reviewedThyroidMapping} from '../scripts/thyroid-extra-alias-evidence.mjs';
import {reviewedHeightMapping} from '../scripts/height-alias-evidence.mjs';
import {verifyInstalledCervical} from '../scripts/import-reviewed-cervical.mjs';
const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
test('all installed target positions, alleles and source aliases retain frozen independent both-build evidence',async()=>{
 for(const m of library.models)if(m.id==='PGS005165')assert.equal(await verifyInstalledCervical(m,library.targets),true);
 const targets=new Map(library.targets.filter(t=>t.variantKind!=='reviewed-pgs-deletion').map(t=>[t.id,t])),aliases=new Map();
 for(const m of library.models)for(const v of m.variants)if(v.kind!=='reviewed-deletion'&&!v.sourceCoordinate&&v.id!==v.sourceId){if(!aliases.has(v.id))aliases.set(v.id,new Set());aliases.get(v.id).add(v.sourceId);}
 for(const build of ['GRCh37','GRCh38']){
  const verified=new Set(),seen=new Set(),merged={},requiredIds=new Set(targets.keys());
  for(const source of library.referenceSources[build]){
   if(seen.has(source.sha256))continue;seen.add(source.sha256);
   const bytes=gunzipSync(readFileSync(new URL('./fixtures/pgs/mappings/'+build+'-'+source.sha256+'.json.gz',import.meta.url)));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
   mergePGSMappingEvidence(merged,JSON.parse(bytes),build,requiredIds);
   for(const [id,raw] of Object.entries(JSON.parse(bytes))){
    if(!targets.has(id)||verified.has(id)||raw.name!==id)continue;
    const target=targets.get(id),m=target.supplementalMappingEvidence?.[build]?.ensemblMapping||target.mappings[build],hits=raw.mappings?.filter(x=>x.assembly_name===build&&x.strand===1&&x.seq_region_name===m.chrom&&x.start===m.position&&x.end===m.position)||[];
    if(hits.length!==1)continue;
    const all=hits[0].allele_string.split('/');
    if(all[0]!==m.ref||JSON.stringify(all.filter(a=>/^[ACGT]$/.test(a)))!==JSON.stringify(m.alleles)||JSON.stringify(all.filter(a=>!/^[ACGT]$/.test(a)))!==JSON.stringify(m.unsupportedReferenceAlleles))continue;
    if([...(aliases.get(id)||[])].some(alias=>!raw.synonyms?.includes(alias)))continue;
    if(target.supplementalMappingEvidence){
     const height=id==='rs2270894',model=library.models.find(m=>m.id===(height?'PGS002980':'PGS018695')),verify=height?reviewedHeightMapping:reviewedThyroidMapping,verified=await verify({modelId:model.id,originalSha256:model.sourceFiles.original.sha256,id,build,mapping:m});
     assert.deepEqual(verified.mapping,target.mappings[build]);assert.deepEqual(verified.evidence,target.supplementalMappingEvidence[build]);
     const v=model.variants.find(v=>v.id===id);assert.deepEqual(v.supplementalMappingEvidence,target.supplementalMappingEvidence);if(height){assert.equal(v.alleleMode,'explicit-pair');assert.equal(v.sourceEffectAllele,'G');assert.equal(v.sourceOtherAllele,'C');assert.equal(v.weightText,'-0.031');}else assert.deepEqual(v.effectAlleleCandidates,['G','C']);
    }
    verified.add(id);
   }
  }
  assert.deepEqual([...targets.keys()].filter(id=>!verified.has(id)),[],build+' targets missing exact independent evidence');
  for(const [id,names] of aliases)assert.ok([...names].every(name=>merged[id]?.synonyms?.includes(name)),id+' aliases must agree across retained responses');
 }
});
test('mapping freeze fails closed on a corrupted frozen source and never replaces it from cache',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ga-mapping-proof-'));
 try{
  const cache=pathToFileURL(path.join(dir,'cache')+path.sep),destination=pathToFileURL(path.join(dir,'frozen')+path.sep);
  await mkdir(cache);await mkdir(destination);
  const bytes=Buffer.from('{"rs1":{"name":"rs1","mappings":[]}}'),sha256=createHash('sha256').update(bytes).digest('hex');
  const lib={referenceSources:{GRCh37:[{url:'https://grch37.rest.ensembl.org/variation/human',sha256}],GRCh38:[]}};
  await writeFile(new URL('pgs-ensembl-GRCh37-abc.json',cache),bytes);
  assert.deepEqual(await freezePGSMappings(lib,cache,destination),{verified:1,copied:1});
  assert.deepEqual(await freezePGSMappings(lib,cache,destination),{verified:1,copied:0});
  const frozen=new URL('GRCh37-'+sha256+'.json.gz',destination),bad=Buffer.from('corrupted frozen evidence');
  await writeFile(frozen,bad);
  await assert.rejects(freezePGSMappings(lib,cache,destination));assert.deepEqual(await readFile(frozen),bad);
 }finally{assert.ok(path.basename(dir).startsWith('ga-mapping-proof-'));assert.equal(path.dirname(dir),path.resolve(tmpdir()));await rm(dir,{recursive:true});}
});
