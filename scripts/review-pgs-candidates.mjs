// Review public source files without changing the installed score selection.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {parseScoringFile} from './import-pgs-library.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Supply candidate metadata JSON and audit JSON paths.');
const candidates=JSON.parse(await readFile(input)),cache=new URL('../work/pgs-source/',import.meta.url);await mkdir(cache,{recursive:true});
async function get(url,name){const file=new URL(name,cache);try{return await readFile(file);}catch{}const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20000000)throw Error('Source exceeds compact-file limit');await writeFile(file,bytes);return bytes;}
const results=[];
for(const meta of candidates){
 try{
  if(!meta.matches_publication||meta.variants_interactions!==0||!(/^(beta|log\(OR\)|ln\(OR\)|log\(HR\)|Beta \(corrected for sample overlap\))$/i.test(meta.weight_type)))throw Error('Metadata requires additional review');
  await writeFile(new URL(meta.id+'.json',cache),JSON.stringify(meta));
  const original=parseScoringFile(gunzipSync(await get(meta.ftp_scoring_file,meta.id+'.txt.gz')).toString(),{allowEffectOnly:true});
  if(original.metadata.pgs_id!==meta.id||original.rows.length!==meta.variants_number)throw Error('Original metadata count or identity mismatch');
  for(const build of ['GRCh37','GRCh38']){
   const parsed=parseScoringFile(gunzipSync(await get(meta.ftp_harmonized_scoring_files[build].positions,meta.id+'_'+build+'.txt.gz')).toString(),{allowEffectOnly:true});
   if(parsed.metadata.pgs_id!==meta.id||parsed.metadata.HmPOS_build!==build)throw Error('Harmonized model/build mismatch');
   const rows=new Map(parsed.rows.map(r=>[r.rsID,r]));
   for(const r of original.rows){const h=rows.get(r.rsID);if(!h||h.effect_allele!==r.effect_allele||(r.other_allele&&h.other_allele!==r.other_allele)||Number(h.effect_weight)!==Number(r.effect_weight)||!/^rs\d+$/.test(h.hm_rsID))throw Error('Harmonization changed ID, allele, or weight');}
  }
  results.push({id:meta.id,trait:meta.trait_reported,count:meta.variants_number,status:'source passes',allowEffectOnly:original.rows.some(r=>!r.other_allele)});
 }catch(e){results.push({id:meta.id,status:'excluded',reason:e.message});}
 console.log(JSON.stringify(results.at(-1)));await writeFile(output,JSON.stringify(results,null,2)+'\n');
}
