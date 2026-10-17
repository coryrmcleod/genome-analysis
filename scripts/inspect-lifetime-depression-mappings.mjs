// Evidence-only investigation of missing Catalog positions; no score repair.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const root=new URL('../work/lifetime-depression-mapping-evidence/',import.meta.url);await mkdir(root,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),ids=['rs9988556','rs11146993'];
const source=await readFile(new URL('../work/pgs-source/PGS000138.txt.gz',import.meta.url));
if(hash(source)!=='4e351e23916a5499050087c9e20aacf647b4e925e697fc8c7644f8b4b9d34b16')throw Error('Source changed');
const lines=gunzipSync(source).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),header=lines.shift().split('\t');
const original=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[header[i],v]))).filter(r=>ids.includes(r.rsID));
const audit={id:'PGS000138',scope:'Missing-position evidence only; no admission or annotation',original,requests:[]};
for(const id of ids){
 const ncbiURL=`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id.slice(2)}`;
 try{const r=await fetch(ncbiURL,{signal:AbortSignal.timeout(15000)}),bytes=Buffer.from(await r.arrayBuffer()),sha256=hash(bytes);await writeFile(new URL(`${id}-NCBI-${sha256}.json`,root),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});const data=r.ok?JSON.parse(bytes):{};audit.requests.push({id,provider:'NCBI',url:ncbiURL,status:r.status,sha256,refsnp_id:data.refsnp_id,merged:data.merged_snapshot_data,withdrawn:data.withdrawn_snapshot_data,primary:data.primary_snapshot_data?.placements_with_allele?.filter(p=>p.placement_annot?.seq_id_traits_by_assembly?.some(a=>a.is_top_level&&a.is_chromosome)).map(p=>({seq_id:p.seq_id,assembly:p.placement_annot.seq_id_traits_by_assembly,alleles:p.alleles}))});}catch(e){audit.requests.push({id,provider:'NCBI',url:ncbiURL,error:e.message});}
 for(const [build,host] of [['GRCh37','grch37.rest.ensembl.org'],['GRCh38','rest.ensembl.org']]){
  const url=`https://${host}/variation/human/${id}?content-type=application/json`;
  try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)}),bytes=Buffer.from(await r.arrayBuffer());const item={id,build,url,status:r.status,sha256:hash(bytes)};await writeFile(new URL(`${id}-${build}-${item.sha256}.json`,root),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});if(r.ok){const data=JSON.parse(bytes);Object.assign(item,{name:data.name,synonyms:data.synonyms,mappings:data.mappings});}audit.requests.push(item);if(!r.ok)break;}catch(e){audit.requests.push({id,build,url,error:e.message});break;}
 }
}
await writeFile(new URL('audit.json',root),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
