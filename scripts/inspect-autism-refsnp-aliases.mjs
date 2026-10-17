// Independent NCBI evidence for the four unresolved Ensembl identities.
// Does not choose an identifier, annotate a score, or modify any scoring file.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const ids=['2139454386','73358778','2139454379','2139454381'];
const out=new URL('../work/autism-refsnp-aliases/',import.meta.url);await mkdir(out,{recursive:true});
const audit={scope:'NCBI identity evidence only; no admission or alias inference',candidates:[]};
for(const id of ids){
 const url=`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id}`,name=`refsnp-${id}.json`;
 try{
  let bytes;try{bytes=await readFile(new URL(name,out));}catch(e){if(e.code!=='ENOENT')throw e;const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize evidence');JSON.parse(bytes);await writeFile(new URL(name,out),bytes,{flag:'wx'});}
  const data=JSON.parse(bytes);if(data.refsnp_id!==id)throw Error('RefSNP response ID mismatch');
  audit.candidates.push({id:'rs'+id,url,name,sha256:createHash('sha256').update(bytes).digest('hex'),merged:data.merged_snapshot_data??null,withdrawn:data.withdrawn_snapshot_data??null,unsupported:!!data.unsupported_snapshot_data,primary:data.primary_snapshot_data?.placements_with_allele?.filter(p=>p.placement_annot?.seq_id_traits_by_assembly?.some(a=>a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch)).map(p=>({seq_id:p.seq_id,annotation:p.placement_annot,alleles:p.alleles.map(a=>a.allele.spdi)}))??[]});
 }catch(e){audit.candidates.push({id:'rs'+id,url,error:e.message});break;}
}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
