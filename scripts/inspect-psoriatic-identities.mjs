// Bounded new primary evidence for an existing, unresolved complete-model candidate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {parseScoringFile,coordinateVariantIdentity} from './import-pgs-library.mjs';
const cache=new URL('../work/pgs-source/',import.meta.url),out=new URL('../work/psoriatic-identity-evidence/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:true});
const original=await readFile(new URL('PGS019623.txt.gz',cache)),originalSha256=hash(original);if(originalSha256!=='1168587bc26a51c2f15a0eb83d3b1766c8fa56749ff4cffc12405ee61cb6497c')throw Error('Unreviewed original');
if(process.argv.includes('--aliases')){
 const results=[];
 for(const id of ['2073004','2113330529','2113330532','2113330536','2113330543']){
  const name='refsnp-'+id+'.json',url='https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/'+id;
  try{let bytes;try{bytes=await readFile(new URL(name,out));}catch(e){if(e.code!=='ENOENT')throw e;await new Promise(r=>setTimeout(r,1100));const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize response');JSON.parse(bytes);await writeFile(new URL(name,out),bytes,{flag:'wx'});}
   const d=JSON.parse(bytes);if(d.refsnp_id!==id)throw Error('Wrong RefSNP');results.push({id,url,name,sha256:hash(bytes),merged:d.merged_snapshot_data||null,withdrawn:d.withdrawn_snapshot_data||null,primary:d.primary_snapshot_data?.placements_with_allele.filter(p=>p.placement_annot?.seq_id_traits_by_assembly?.some(a=>a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch)).map(p=>({seq_id:p.seq_id,annotation:p.placement_annot,alleles:p.alleles.map(a=>a.allele.spdi)}))||[]});
  }catch(e){results.push({id,url,error:e.message});break;}
 }
 const audit={originalSha256,scope:'Independent identity evidence only; no model admission',results};await writeFile(new URL('aliases.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
}else{
 const budget=Number(process.argv[2]||0);if(!Number.isSafeInteger(budget)||budget<0||budget>500)throw Error('Budget must be0..500');
 const {rows}=parseScoringFile(gunzipSync(original).toString(),{allowEffectOnly:true,allowCoordinateIds:true}),audit=[];let next=0,requests=0,failed=false;
 await Promise.all(Array.from({length:4},async()=>{while(next<rows.length&&!failed){const row=rows[next++],name=`PGS019623-GRCh38-${row.chr_name}-${row.chr_position}-identity.json`,url=`https://rest.ensembl.org/overlap/region/human/${row.chr_name}:${row.chr_position}-${row.chr_position}?feature=variation&content-type=application/json`;
  try{let bytes;try{bytes=await readFile(new URL(name,cache));}catch(e){if(e.code!=='ENOENT')throw e;if(requests>=budget){audit.push({sourceId:row.rsID,deferred:'Request budget'});continue;}requests++;const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize evidence');JSON.parse(bytes);await writeFile(new URL(name,cache),bytes,{flag:'wx'});}
   const evidence={row,url,sha256:hash(bytes)};try{audit.push({...evidence,id:coordinateVariantIdentity(row,'GRCh38',JSON.parse(bytes))});}catch(e){audit.push({...evidence,error:e.message});}
  }catch(e){audit.push({row,url,transportError:e.message});failed=true;}
 }}));
 audit.sort((a,b)=>(a.row?.rsID||a.sourceId).localeCompare(b.row?.rsID||b.sourceId));const result={originalSha256,total:rows.length,checked:audit.filter(a=>a.sha256).length,requests,unresolved:audit.filter(a=>a.error||a.transportError),deferred:audit.filter(a=>a.deferred).length,audit};
 await writeFile(new URL('inventory.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,audit:undefined}));
}
