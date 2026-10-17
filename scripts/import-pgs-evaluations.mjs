// Public Catalog performance snapshots only. No scoring weights or genomes are changed.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePGSEvaluationLibrary} from '../public/pgs-evaluation.js';
import {projectEvaluationRecord} from './pgs-evaluation-projection.mjs';
import {validateExpansionEvaluations} from './validate-expansion-evaluations.mjs';
import {EVALUATION_REVIEW_EXCLUSIONS} from './pgs-evaluation-review-exclusions.mjs';
import {pathToFileURL} from 'node:url';
export async function importEvaluations(args=process.argv.slice(2)){
const stageIndex=args.indexOf('--stage'),stage=stageIndex<0?null:args[stageIndex+1];
if(stageIndex>=0&&(!stage||stage.startsWith('--'))||args.filter(a=>a==='--stage').length>1||args.filter(a=>a==='--refresh').length>1||args.some((a,i)=>a!=='--refresh'&&a!=='--stage'&&!(stageIndex>=0&&i===stageIndex+1)))throw Error('Usage: import-pgs-evaluations.mjs [--refresh] [--stage directory]');
const root=new URL('../',import.meta.url),installed=new URL('public/data/pgs-evaluation.json',root),out=stage?stage+'/pgs-evaluation.json':installed,cache=new URL('test/fixtures/pgs/evaluation/',root);
const library=JSON.parse(await readFile(stage?stage+'/pgs-library.json':new URL('public/data/pgs-library.json',root)));
// Refuse known unresolved evidence before any network request or artifact write.
for(const model of library.models){
 const exclusion=EVALUATION_REVIEW_EXCLUSIONS[model.id];
 if(exclusion)throw Error(model.id+': primary evaluation metric unresolved; '+exclusion.reason);
}
let before={models:[]};try{before=validatePGSEvaluationLibrary(JSON.parse(await readFile(installed)));}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(cache,{recursive:true});
const models=[],failures=[];
for(const model of library.models){
 let metadataBytes;
 try{metadataBytes=await readFile(new URL('test/fixtures/pgs/evidence/'+model.id+'.json',root));}
 catch(e){if(!stage||e.code!=='ENOENT')throw e;metadataBytes=await readFile(new URL('work/pgs-source/'+model.id+'.json',root));}
 if(createHash('sha256').update(metadataBytes).digest('hex')!==model.sourceFiles.metadata.sha256)throw Error('Frozen development metadata hash mismatch: '+model.id);
 const metadata=JSON.parse(metadataBytes);
 if(metadata.id!==model.id)throw Error('Wrong development metadata');
 const development={metadataSource:model.sourceFiles.metadata,phenotypes:[...['samples_variants','samples_training'].flatMap(key=>(metadata[key]||[]).filter(s=>typeof s.phenotyping_free==='string'&&s.phenotyping_free.trim()).map(s=>({stage:key==='samples_variants'?'Variant-association discovery':'Score development/training',definition:s.phenotyping_free})))]};
 const old=before.models.find(m=>m.id===model.id&&m.originalSha256===model.sourceFiles.original.sha256);
 if(old&&!args.includes('--refresh')){
  const evaluations=[];
  for(const source of old.sources){
   const bytes=await readFile(new URL(model.id+'-'+source.sha256+'.json',cache));
   if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error('Frozen evaluation evidence hash mismatch: '+model.id);
   evaluations.push(...JSON.parse(bytes).results.map(r=>projectEvaluationRecord(r,model.id)));
  }
  models.push({...old,development,evaluations});continue;
 }
 try{
  let url='https://www.pgscatalog.org/rest/performance/search?pgs_id='+model.id;const sources=[],evaluations=[],seen=new Set();let expected=null;
  while(url){
   const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.pgscatalog.org'||u.pathname!=='/rest/performance/search'||u.searchParams.get('pgs_id')!==model.id||seen.has(url))throw Error('Unexpected evaluation pagination URL');seen.add(url);
   if(seen.size>20)throw Error('Too many evaluation pages');
   const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5000000)throw Error('Oversize evaluation source');
   const page=JSON.parse(bytes),sha256=createHash('sha256').update(bytes).digest('hex');
   if(!Number.isSafeInteger(page.count)||page.count<0||page.count>1000||!Array.isArray(page.results)||expected!==null&&expected!==page.count)throw Error('Inconsistent performance inventory');expected=page.count;
   for(const r of page.results){
    evaluations.push(projectEvaluationRecord(r,model.id));
   }
   const frozen=new URL(model.id+'-'+sha256+'.json',cache);
   await writeFile(frozen,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(createHash('sha256').update(await readFile(frozen)).digest('hex')!==sha256)throw Error('Frozen evaluation evidence hash mismatch');});
   sources.push({url,sha256});url=page.next;
  }
  if(evaluations.length!==expected)throw Error('Incomplete performance pages');
  const row={id:model.id,originalSha256:model.sourceFiles.original.sha256,development,sources,evaluations};
  validatePGSEvaluationLibrary({version:1,retrievedAt:new Date().toISOString(),models:[row]});models.push(row);
  console.log(model.id+': '+evaluations.length+' public evaluation records');
 }catch(e){failures.push({id:model.id,reason:e.message});if(old)models.push(old);console.log(model.id+': evidence unavailable ('+e.message+'); scoring library unchanged');if(e.message==='HTTP 429')break;}
}
const result=validatePGSEvaluationLibrary({version:1,retrievedAt:new Date().toISOString(),models});
await mkdir(new URL('work/pgs-evaluation/',root),{recursive:true});
await writeFile(stage?stage+'/evaluation-audit.json':new URL('work/pgs-evaluation/audit.json',root),JSON.stringify({models:models.length,failures},null,2)+'\n');
if(failures.some(f=>f.reason==='HTTP 429'))throw Error('Public source rate limit: evaluation import stopped; installed and staged artifacts unchanged.');
if(stage&&(failures.length||models.length!==library.models.length))throw Error('Incomplete staged evaluation evidence; no publication-ready artifact written');
if(stage)validateExpansionEvaluations(result,library);
const next=typeof out==='string'?out+'.next':new URL(out.href+'.next');
await writeFile(next,JSON.stringify(result)+'\n');await rename(next,out);
console.log(JSON.stringify({models:models.length,records:models.reduce((n,m)=>n+m.evaluations.length,0),failures}));
return result;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{await importEvaluations();}
 catch(error){console.error(error.message);process.exitCode=1;}
}
