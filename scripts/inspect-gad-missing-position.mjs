// Evidence-only investigation of a missing Catalog coordinate. No admission or repair.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {chainIntervalMappings} from './assembly-chain.mjs';
const root=new URL('../',import.meta.url),out=new URL('work/gad-missing-position-evidence/',root),id='PGS018943';
await mkdir(out,{recursive:true});const hash=b=>createHash('sha256').update(b).digest('hex');
async function source(url,name){
 const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Public evidence HTTP '+r.status);
 const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>20000000)throw Error('Evidence too large');const sha256=hash(bytes);
 const target=new URL(name+'-'+sha256,out);await writeFile(target,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(target))!==sha256)throw Error('Frozen evidence mismatch');});
 return {url,sha256,bytes};
}
const meta=JSON.parse(await readFile(new URL('work/pgs-source/'+id+'.json',root))),builds={};
for(const [build,position,host,name] of [['GRCh37',40413482,'grch37.rest.ensembl.org','hg19ToHg38'],['GRCh38',39907575,'rest.ensembl.org','hg38ToHg19']]){
 const hm=await source(meta.ftp_harmonized_scoring_files[build].positions,build+'-harmonized.gz');
 const rows=gunzipSync(hm.bytes).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));const columns=rows.shift().split('\t');
 const objects=rows.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[columns[i],v])));
 const variation=await source('https://'+host+'/variation/human/rs7256902?content-type=application/json',build+'-variation.json');
 const sequence=await source(`https://${host}/sequence/region/human/19:${position-100}..${position+100}:1?content-type=application/json`,build+'-sequence.json');
 const chainBytes=await readFile(new URL('work/pgs-source/'+name+'.over.chain.gz',root));
 builds[build]={harmonized:{url:hm.url,sha256:hm.sha256,count:objects.length,missing:objects.filter(r=>!r.hm_chr||!r.hm_pos),conflicts:objects.filter(r=>r.hm_match_chr==='False'||r.hm_match_pos==='False')},variation:{url:variation.url,sha256:variation.sha256,data:JSON.parse(variation.bytes)},sequence:{url:sequence.url,sha256:sequence.sha256,data:JSON.parse(sequence.bytes)},chain:{sha256:hash(chainBytes),hits:chainIntervalMappings(gunzipSync(chainBytes).toString(),'chr19',position-101,position+100)}};
}
const dbsnp=await source('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/7256902','refsnp.json');
const overlap=await source('https://rest.ensembl.org/overlap/region/human/19:39907575-39907575?feature=variation&content-type=application/json','source-overlap.json');
const a=builds.GRCh37.sequence.data.seq,b=builds.GRCh38.sequence.data.seq;
const audit={id,status:'evidence only; candidate remains excluded; no source file altered',originalSha256:hash(await readFile(new URL('work/pgs-source/'+id+'.txt.gz',root))),builds,dbSNP:{url:dbsnp.url,sha256:dbsnp.sha256,data:JSON.parse(dbsnp.bytes)},overlap:{url:overlap.url,sha256:overlap.sha256,data:JSON.parse(overlap.bytes)},mismatches:[...a].flatMap((base,i)=>base===b[i]?[]:[{offset:i-100,reference37:base,reference38:b[i]}])};
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({id,builds:Object.fromEntries(Object.entries(builds).map(([b,e])=>[b,{count:e.harmonized.count,missing:e.harmonized.missing.length,conflicts:e.harmonized.conflicts.length,chain:e.chain.hits}])),mismatches:audit.mismatches}));
