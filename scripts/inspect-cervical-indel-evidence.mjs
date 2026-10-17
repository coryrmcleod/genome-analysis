// Public indel feasibility only. No PGS schema or genotype changes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const id='PGS005165',variant='rs558000791',root=new URL('../work/cervical-indel-evidence/',import.meta.url),cache=new URL('../work/pgs-source/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');await mkdir(root,{recursive:true});
function rows(bytes){const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),keys=lines.shift().split('\t');return lines.map(l=>{const v=l.split('\t');if(v.length!==keys.length)throw Error('Malformed source row');return Object.fromEntries(keys.map((k,i)=>[k,v[i]]));});}
const source=await readFile(new URL(id+'.txt.gz',cache));if(hash(source)!=='84a2cfad847d064798f08adfa6a1fb4ac8aedd601726d0fc150720765ef254ac')throw Error('Source changed');
const original=rows(source),metadata=JSON.parse(await readFile(new URL(id+'.json',cache))),audit={id,variant,status:'Evidence only; unsupported PGS indel',originalSha256:hash(source),term:original.find(r=>r.rsID===variant),sources:[],builds:{}};
const retained={
 'refsnp-558000791.json':'209df94ec1ae948cb83ad636e1e678c162251830e28e2f6cfbd33f9fd7753644',
 'refsnp-67426997.json':'acfa6cf6e6f08f04c10880481c87a756f04706eb606e43c2bb480fda3b2dbd5b',
 'refsnp-9279333.json':'c433b21f077ba6661acb6248d6d3c4885b45f7615e02d06775ce1d28fa7b2f1e',
 'GRCh37.txt.gz':'96eed05a2aaf4c3bf02ec512d3eec115799a9496639ece638bb1c06bb83d12f8',
 'GRCh38.txt.gz':'c6bc96c1530e31e409a7926d47e847b444ca45a0c9929dc9dab22b1c5faa5fd5',
 'GRCh37-variation.json':'d5f5762acace7c7c1cf607ed7b35ef5dd355887537c274ab41afedca0092d250',
 'GRCh38-variation.json':'26222e177caa74c0ffd22df1c36a9429bf0fc15510b307455686f4ae0eff4e39',
 'GRCh37-sequence.json':'df6323130a6a66464e6db51b7b7f194bd6f618e537fa0d777fa81481ccef42d4'
};
async function get(url,name){let bytes;const frozen=retained[name];if(frozen){bytes=await readFile(new URL(name+'-'+frozen,root));if(hash(bytes)!==frozen)throw Error('Retained public evidence changed');}else{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(url+': HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());}const sha256=hash(bytes);await writeFile(new URL(name+'-'+sha256,root),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});audit.sources.push({url,sha256,name});return bytes;}
try{
 let ncbiId='558000791';audit.ncbiChain=[];
 for(let i=0;i<5;i++){
  if(audit.ncbiChain.some(r=>r.id===ncbiId))throw Error('Cyclic RefSNP merge chain');
  const ncbi=JSON.parse(await get('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/'+ncbiId,'refsnp-'+ncbiId+'.json'));
  audit.ncbiChain.push({id:ncbiId,canonical:ncbi.refsnp_id,mergedInto:ncbi.merged_snapshot_data?.merged_into,unsupported:ncbi.unsupported_snapshot_data});
  if(ncbi.primary_snapshot_data){audit.primary=ncbi.primary_snapshot_data.placements_with_allele?.filter(p=>p.placement_annot?.seq_id_traits_by_assembly?.some(a=>a.is_top_level&&a.is_chromosome));break;}
  const next=ncbi.merged_snapshot_data?.merged_into;if(!Array.isArray(next)||next.length!==1||!/^\d+$/.test(next[0]))throw Error('No unique current RefSNP successor');ncbiId=next[0];
 }
 if(!audit.primary?.length)throw Error('No independently resolved primary RefSNP placements');
 for(const [build,host] of [['GRCh37','grch37.rest.ensembl.org'],['GRCh38','rest.ensembl.org']]){
  const hm=rows(await get(metadata.ftp_harmonized_scoring_files[build].positions,build+'.txt.gz'));
  const variation=JSON.parse(await get(`https://${host}/variation/human/${variant}?content-type=application/json`,build+'-variation.json'));
  audit.builds[build]={count:hm.length,term:hm.find(r=>r.rsID===variant),failures:hm.filter(r=>r.hm_match_chr==='False'||r.hm_match_pos==='False'||!/^[1-9]\d*$/.test(r.hm_pos)).map(r=>r.rsID),name:variation.name,primaryMappings:variation.mappings?.filter(m=>m.assembly_name===build&&/^(?:[1-9]|1\d|2[0-2])$/.test(m.seq_region_name))};
  const maps=audit.builds[build].primaryMappings;if(maps?.length!==1||maps[0].strand!==1)throw Error('No unique forward primary mapping');
  const m=maps[0];audit.builds[build].sequence=JSON.parse(await get(`https://${host}/sequence/region/human/${m.seq_region_name}:${m.start-100}..${m.end+100}:1?content-type=application/json`,build+'-sequence.json'));
 }
}catch(e){audit.error=e.message;}
await writeFile(new URL('audit.json',root),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
