import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {validatePGSEvaluationLibrary} from '../public/pgs-evaluation.js';
import {projectEvaluationRecord} from './pgs-evaluation-projection.mjs';
import {verifyEvaluationPrimaryReview} from './pgs-evaluation-review-exclusions.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function validateExpansionEvaluations(evidence,library){
 validatePGSEvaluationLibrary(evidence);
 if(JSON.stringify(evidence.models.map(m=>m.id))!==JSON.stringify(library.models.map(m=>m.id)))throw Error('Evaluation model inventory mismatch');
 for(const [i,row] of evidence.models.entries()){
  verifyEvaluationPrimaryReview(row);
  const model=library.models[i];
  if(!row.evaluations.length)throw Error('Missing published evaluation records: '+row.id);
  if(row.originalSha256!==model.sourceFiles.original.sha256)throw Error('Evaluation original hash mismatch: '+row.id);
  if(!row.development||row.development.metadataSource.url!==model.sourceFiles.metadata.url||row.development.metadataSource.sha256!==model.sourceFiles.metadata.sha256)throw Error('Evaluation metadata binding mismatch: '+row.id);
  if(new Set(row.sources.map(s=>s.url)).size!==row.sources.length)throw Error('Duplicate evaluation source page: '+row.id);
 }
 return evidence;
}
export async function verifyExpansionEvaluationEvidence(evidence,library,root=new URL('../',import.meta.url)){
 validateExpansionEvaluations(evidence,library);
 for(const row of evidence.models){
  const metadataBytes=await readFile(new URL('test/fixtures/pgs/evidence/'+row.id+'.json',root));
  if(hash(metadataBytes)!==row.development.metadataSource.sha256)throw Error('Frozen development metadata mismatch: '+row.id);
  const metadata=JSON.parse(metadataBytes);
  if(metadata.id!==row.id)throw Error('Wrong frozen development score');
  const definitions=['samples_variants','samples_training'].flatMap(key=>(metadata[key]||[]).filter(s=>typeof s.phenotyping_free==='string'&&s.phenotyping_free.trim()).map(s=>({stage:key==='samples_variants'?'Variant-association discovery':'Score development/training',definition:s.phenotyping_free})));
  if(JSON.stringify(definitions)!==JSON.stringify(row.development.phenotypes))throw Error('Development projection mismatch: '+row.id);
  const projected=[];let expected=null,next='https://www.pgscatalog.org/rest/performance/search?pgs_id='+row.id;
  for(const source of row.sources){
   if(source.url!==next)throw Error('Evaluation pagination chain mismatch: '+row.id);
   const bytes=await readFile(new URL('test/fixtures/pgs/evaluation/'+row.id+'-'+source.sha256+'.json',root));
   if(hash(bytes)!==source.sha256)throw Error('Frozen evaluation source mismatch: '+row.id);
   const page=JSON.parse(bytes);
   if(!Number.isSafeInteger(page.count)||page.count<0||!Array.isArray(page.results)||expected!==null&&page.count!==expected)throw Error('Evaluation page inventory mismatch: '+row.id);
   expected=page.count;next=page.next;
   projected.push(...page.results.map(r=>projectEvaluationRecord(r,row.id)));
  }
  if(next!==null||projected.length!==expected||JSON.stringify(projected)!==JSON.stringify(row.evaluations))throw Error('Incomplete or altered frozen evaluation projection: '+row.id);
 }
 return evidence;
}
