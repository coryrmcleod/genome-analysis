import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {loadHDLAliasProof,verifyHDLAliasData,reviewedHDLIdentity,verifyInstalledHDLAliases,HDL_ORIGINAL_SHA} from '../scripts/hdl-alias-evidence.mjs';
const root=new URL('./fixtures/pgs/hdl-alias/',import.meta.url),load=name=>readFile(new URL(name,root));
const manifest=JSON.parse(await load('manifest.json')),data={};
for(const file of manifest.files){const bytes=await load(file.name);data[file.name]=file.name.endsWith('.gz')?bytes:JSON.parse(bytes);}
function rows(bytes){const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),columns=lines.shift().split('\t');return lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[columns[i],v])));}
const original=rows(data['original.txt.gz']);
test('HDL aliases preserve three original terms on both builds and resolve only their verified identity',async()=>{
 assert.equal(verifyHDLAliasData(data),true);assert.equal((await loadHDLAliasProof()).files.length,11);
 for(const alias of manifest.aliases)for(const build of ['GRCh37','GRCh38']){
  const row=original.find(r=>r.rsID===alias.sourceId),harmonized=rows(data[build+'.txt.gz']).find(r=>r.rsID===alias.sourceId),before=JSON.stringify({row,harmonized});
  const proof=await reviewedHDLIdentity({modelId:'PGS000660',originalSha256:HDL_ORIGINAL_SHA,harmonizedSha256:manifest.files.find(f=>f.name===build+'.txt.gz').sha256,row,harmonized,build});
  assert.equal(proof.canonicalId,alias.canonicalId);assert.equal(proof.sourceId,row.rsID);assert.equal(JSON.stringify({row,harmonized}),before);
 }
});
test('HDL identity review rejects changed model, bytes, term, build, or harmonized identity',async()=>{
 const row=original.find(r=>r.rsID==='rs115151282'),harmonized=rows(data['GRCh37.txt.gz']).find(r=>r.rsID===row.rsID),input={modelId:'PGS000660',originalSha256:HDL_ORIGINAL_SHA,harmonizedSha256:manifest.files.find(f=>f.name==='GRCh37.txt.gz').sha256,row,harmonized,build:'GRCh37'};
 for(const changed of [{modelId:'PGS000661'},{originalSha256:'0'.repeat(64)},{harmonizedSha256:'0'.repeat(64)},{build:'hg19'},...Object.entries({rsID:'rs9272117',coordinateSource:true,chr_name:'7',chr_position:'32600412',effect_allele:'T',other_allele:'A',effect_weight:'0.029160'}).map(([k,v])=>({row:{...row,[k]:v}})),...Object.entries({rsID:'rs9272117',hm_rsID:'rs1',hm_chr:'7',hm_pos:'32600412',effect_allele:'T',other_allele:'A',effect_weight:'0.029160'}).map(([k,v])=>({harmonized:{...harmonized,[k]:v}}))])await assert.rejects(reviewedHDLIdentity({...input,...changed}),/Outside exact reviewed HDL/);
});
test('HDL evidence rejects tampering, divergent merge targets, strand and incomplete multiallelic inventories',async()=>{
 for(const filename of ['manifest.json',...manifest.files.map(f=>f.name)])await assert.rejects(loadHDLAliasProof(async name=>name===filename?Buffer.concat([await load(name),Buffer.from(' ') ]):load(name)),/changed/);
 const changes=[
  d=>d['refsnp-115151282.json'].merged_snapshot_data.merged_into.push('1'),
  d=>d['refsnp-9272117.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000006.11').placement_annot.is_aln_opposite_orientation=true,
  d=>d['refsnp-9272117.json'].primary_snapshot_data.placements_with_allele.find(p=>p.seq_id==='NC_000006.11').alleles.pop(),
  d=>d['canonical-GRCh37.json'].rs9272117.synonyms=[],
  d=>d['canonical-GRCh38.json'].rs9272117.mappings.find(m=>m.seq_region_name==='6').start++,
  d=>d['canonical-GRCh37.json'].rs9272117.mappings.find(m=>m.seq_region_name==='6').allele_string='C/T'
 ];
 for(const change of changes){const altered={...data};for(const [name,value] of Object.entries(data))if(!name.endsWith('.gz'))altered[name]=structuredClone(value);change(altered);assert.throws(()=>verifyHDLAliasData(altered),/HDL alias proof/);}
});
test('publication requires complete unchanged HDL terms and every exact alias certificate',async()=>{
 const h38=new Map(rows(data['GRCh38.txt.gz']).map(r=>[r.rsID,r])),aliases=new Map(manifest.aliases.map(a=>[a.sourceId,a.canonicalId]));
 const model={id:'PGS000660',variantCount:549,sourceFiles:{original:{sha256:HDL_ORIGINAL_SHA},...Object.fromEntries(['GRCh37','GRCh38'].map(b=>[b,{sha256:manifest.files.find(f=>f.name===b+'.txt.gz').sha256}])),reviewedIdentifierAliases:[]},variants:original.map(r=>({id:aliases.get(r.rsID)||h38.get(r.rsID).hm_rsID||r.rsID,sourceId:r.rsID,sourceEffectAllele:r.effect_allele,sourceOtherAllele:r.other_allele,weightText:r.effect_weight,weight:Number(r.effect_weight),alleleMode:'explicit-pair'}))};
 for(const build of ['GRCh37','GRCh38'])for(const row of original.filter(r=>aliases.has(r.rsID)))model.sourceFiles.reviewedIdentifierAliases.push(await reviewedHDLIdentity({modelId:model.id,originalSha256:HDL_ORIGINAL_SHA,harmonizedSha256:model.sourceFiles[build].sha256,row,harmonized:rows(data[build+'.txt.gz']).find(r=>r.rsID===row.rsID),build}));
 assert.equal(await verifyInstalledHDLAliases(model),true);
 for(const change of [m=>m.variants.pop(),m=>m.variants[0].weight++,m=>m.variants[0].weightText+='0',m=>m.variants[0].sourceEffectAllele='A',m=>m.variants[0].id='rs1',m=>m.sourceFiles.reviewedIdentifierAliases.pop(),m=>m.sourceFiles.reviewedIdentifierAliases.reverse(),m=>m.sourceFiles.reviewedIdentifierAliases[0].manifestSha256='0'.repeat(64),m=>m.sourceFiles.GRCh38.sha256='0'.repeat(64)]){const altered=structuredClone(model);change(altered);await assert.rejects(verifyInstalledHDLAliases(altered),/HDL/);}
});
