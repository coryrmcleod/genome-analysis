// Freeze independent public Ensembl responses before the mutable cache ages out.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {reviewedThyroidMapping} from './thyroid-extra-alias-evidence.mjs';
import {reviewedHeightMapping} from './height-alias-evidence.mjs';
import {verifyInstalledCervical} from './import-reviewed-cervical.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function freezePGSMappings(library,cache,destination){
 for(const model of library.models||[])if(model.id==='PGS005165')await verifyInstalledCervical(model,library.targets);
 for(const target of library.targets||[]){
  if(!target.supplementalMappingEvidence)continue;
  const height=target.id==='rs2270894',model=library.models.find(m=>m.id===(height?'PGS002980':'PGS018695')),variant=model?.variants.find(v=>v.id===target.id),verify=height?reviewedHeightMapping:reviewedThyroidMapping;
  if(!variant||JSON.stringify(variant.supplementalMappingEvidence)!==JSON.stringify(target.supplementalMappingEvidence)||Object.keys(target.supplementalMappingEvidence).sort().join(',')!=='GRCh37,GRCh38')throw Error('Invalid supplemental target evidence');
  for(const build of ['GRCh37','GRCh38']){const evidence=target.supplementalMappingEvidence[build],verified=await verify({modelId:model.id,originalSha256:model.sourceFiles.original.sha256,id:target.id,build,mapping:evidence.ensemblMapping});if(JSON.stringify(verified.mapping)!==JSON.stringify(target.mappings[build])||JSON.stringify(verified.evidence)!==JSON.stringify(evidence))throw Error('Supplemental target mapping changed');}
 }
 const wanted=new Map();
 for(const build of ['GRCh37','GRCh38'])for(const s of library.referenceSources[build]){
  const host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
  if(s.url!=='https://'+host+'/variation/human'||!/^[a-f0-9]{64}$/.test(s.sha256))throw Error('Unexpected independent mapping source');
  wanted.set(build+'-'+s.sha256,{build,sha256:s.sha256});
 }
 const missing=new Map();
 for(const [key,s] of wanted){
  try{if(hash(gunzipSync(await readFile(new URL(key+'.json.gz',destination))))!==s.sha256)throw Error('Frozen mapping evidence hash mismatch: '+key);}
  catch(e){if(e.code!=='ENOENT')throw e;missing.set(key,s);}
 }
 const found=new Map();
 for(const name of await readdir(cache)){
  const match=/^pgs-ensembl-(GRCh37|GRCh38)-[a-f0-9]+\.json$/.exec(name);if(!match)continue;
  const bytes=await readFile(new URL(name,cache)),key=match[1]+'-'+hash(bytes);
  if(missing.has(key))found.set(key,new URL(name,cache));
 }
 for(const key of missing.keys())if(!found.has(key))throw Error('Reviewed independent mapping response unavailable: '+key);
 await mkdir(destination,{recursive:true});
 for(const [key,source] of found){
  const bytes=await readFile(source);if(hash(bytes)!==missing.get(key).sha256)throw Error('Mapping cache changed while freezing');
  await writeFile(new URL(key+'.json.gz',destination),gzipSync(bytes),{flag:'wx'});
 }
 return {verified:wanted.size,copied:found.size};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const root=new URL('../',import.meta.url),library=JSON.parse(await readFile(process.argv[2]||new URL('public/data/pgs-library.json',root)));
 console.log(await freezePGSMappings(library,new URL('work/pgs-source/',root),new URL('test/fixtures/pgs/mappings/',root)));
}
