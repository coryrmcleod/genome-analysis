// Public evidence only. Source SNV labels are not recoded into indel states.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const out=new URL('../work/autism-harmonization-blockers/',import.meta.url);await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),audit={id:'PGS000327',scope:'Inventory of unresolved complete-file blockers; no score repair or admission',builds:{},sources:[]};
for(const build of ['GRCh37','GRCh38']){
 const bytes=await readFile(new URL('../work/pgs-source/PGS000327_'+build+'.txt.gz',import.meta.url)),lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),keys=lines.shift().split('\t');
 const rows=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[keys[i],v])));if(rows.length!==35087)throw Error('Incomplete source');
 audit.builds[build]={sha256:hash(bytes),count:rows.length,blockers:rows.filter(r=>r.hm_match_pos==='False'||r.hm_match_chr==='False'||!r.hm_chr||!r.hm_pos)};
}
for(const id of ['71042461','57906545']){
 const url=`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id}`,name='refsnp-'+id+'.json';
 try{
  let bytes;try{bytes=await readFile(new URL(name,out));}catch(e){if(e.code!=='ENOENT')throw e;const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize source');JSON.parse(bytes);await writeFile(new URL(name,out),bytes,{flag:'wx'});}
  const data=JSON.parse(bytes);if(data.refsnp_id!==id)throw Error('Wrong RefSNP ID');
  audit.sources.push({id:'rs'+id,url,name,sha256:hash(bytes),placements:data.primary_snapshot_data?.placements_with_allele?.filter(p=>p.placement_annot?.seq_id_traits_by_assembly?.some(a=>a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch)).map(p=>({accession:p.seq_id,alleles:p.alleles.map(a=>a.allele.spdi)}))});
 }catch(e){audit.sources.push({id:'rs'+id,url,error:e.message});break;}
}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({builds:Object.fromEntries(Object.entries(audit.builds).map(([b,r])=>[b,{count:r.count,blockers:r.blockers.length}])),sources:audit.sources.map(s=>({id:s.id,sha256:s.sha256,error:s.error}))}));
