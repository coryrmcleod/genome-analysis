// Evidence-only bounded lookup of the previously unresolved original identifier.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const out=new URL('../work/hip-identity-evidence/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:true});
let id='34560402';const audit=[];
for(let i=0;i<3;i++){
 const url='https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/'+id,name='refsnp-'+id+'.json';
 try{let bytes;try{bytes=await readFile(new URL(name,out));}catch(e){if(e.code!=='ENOENT')throw e;await new Promise(r=>setTimeout(r,1100));const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize response');JSON.parse(bytes);await writeFile(new URL(name,out),bytes,{flag:'wx'});}
  const d=JSON.parse(bytes);if(d.refsnp_id!==id)throw Error('Wrong RefSNP');audit.push({id,url,sha256:hash(bytes),merged:d.merged_snapshot_data||null,withdrawn:d.withdrawn_snapshot_data||null,unsupported:d.unsupported_snapshot_data||null,primary:d.primary_snapshot_data?.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch)).map(p=>({seq_id:p.seq_id,annotation:p.placement_annot,alleles:p.alleles.map(a=>a.allele.spdi)}))||[]});
  const next=d.merged_snapshot_data?.merged_into;if(!next||next.length!==1||!/^\d+$/.test(next[0])||audit.some(a=>a.id===next[0]))break;id=next[0];
 }catch(e){audit.push({id,url,error:e.message});break;}
}
await writeFile(new URL('audit.json',out),JSON.stringify({scope:'Identity evidence only; no repaired source row, strand assumption or score admission',audit},null,2)+'\n');console.log(JSON.stringify(audit));
