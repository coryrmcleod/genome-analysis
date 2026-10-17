// WSL-only public-reference builder. Never reads a personal genome.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {referenceDefinition,validateScoreReference} from '../public/pgs-reference.js';
import {isPalindromic,validatePGSLibrary} from '../public/pgs.js';
import {matchReferenceTerm} from './pgs-reference-matching.mjs';
import {readEuropeanCohort,validateEuropeanSampleIds} from './european-reference-cohort.mjs';
const exec=promisify(execFile),root=path.resolve(process.argv[2]||''),data=new URL('../public/data/',import.meta.url);
const library=validatePGSLibrary(JSON.parse(await readFile(process.argv[3]||new URL('pgs-library.json',data))));
const archive=JSON.parse(await readFile(path.join(root,'archive-provenance.json'))),population=JSON.parse(await readFile(path.join(root,'sample-provenance.json')));
const lines=(await readFile(path.join(root,'eur-score-targets.vcf'),'utf8')).split(/\r?\n/);
const header=lines.find(l=>l.startsWith('#CHROM')).split('\t'),sampleIds=header.slice(9),records=new Map();
if(sampleIds.length!==population.sampleCount||new Set(sampleIds).size!==sampleIds.length)throw Error('Reference sample count mismatch');
validateEuropeanSampleIds(sampleIds,readEuropeanCohort(root));
for(const line of lines){if(!line||line.startsWith('#'))continue;const c=line.split('\t'),key=c[0]+':'+c[1];const record={id:c[2],ref:c[3],alleles:[c[3],...c[4].split(',')],format:c[8].split(':'),samples:c.slice(9)};if(!records.has(key))records.set(key,[]);records.get(key).push(record);}
const targets=new Map(library.targets.map(t=>[t.id,t])),models=[],checks=[];
await mkdir(path.join(root,'score-verification'),{recursive:true});
for(const model of library.models){
 const ambiguous=model.variants.filter(v=>v.alleleMode==='effect-only'?v.effectAlleleCandidates.length!==1:isPalindromic(v.effectAllele,v.otherAllele));
 const result={id:model.id,status:'Unavailable',variantCount:model.variantCount};
 if(model.variants.some(v=>v.kind==='reviewed-deletion')){result.reason='Full-model population reference unavailable: the certified deletion has not been independently verified across this public genotype cohort. No deletion term is dropped or imputed.';models.push(result);continue;}
 if(ambiguous.length){result.reason=`${ambiguous.length} scoring terms still have unresolved effect-allele orientation. A full European reference percentile would require choosing an unverified scoring direction.`;result.unresolvedTerms=ambiguous.map(v=>v.id);models.push(result);continue;}
 const missing=[],bad=[],matched=[];
 for(const v of model.variants){
  const target=targets.get(v.id),m=target.mappings.GRCh37,rows=records.get(m.chrom+':'+m.position)||[];
  const match=matchReferenceTerm(v,m,rows,sampleIds.length);
  if(match.status==='missing'){missing.push(v.id);continue;}
  if(match.status!=='matched'){bad.push(v.id);continue;}
  matched.push({v,r:match.record,dosages:match.dosages});
 }
 if(missing.length||bad.length){result.reason=`Full-model reference unavailable: ${missing.length} positions absent and ${bad.length} terms with incompatible alleles, duplicate records or missing reference genotypes. No reference terms were silently dropped or filled.`;result.missingTerms=missing;result.incompatibleTerms=bad;models.push(result);continue;}
 const own=sampleIds.map((_,i)=>{let sum=0,c=0;for(const t of matched){const y=t.dosages[i]*t.v.weight-c,next=sum+y;c=(next-sum)-y;sum=next;}return sum;});
 if(own.every(s=>s===own[0])){result.reason='Reference score has no observed variation; percentile unavailable.';models.push(result);continue;}
 const stem=path.join(root,'score-verification',model.id),weights=stem+'.weights';
 await writeFile(weights,matched.map(t=>`${t.r.id}\t${t.v.effectAllele}\t${t.v.weightText}`).join('\n')+'\n');
 await exec('plink2',['--pfile',path.join(root,'eur-score-targets'),'--score',weights,'1','2','3','no-mean-imputation','list-variants','cols=+scoresums','--out',stem,'--threads','2','--memory','640'],{maxBuffer:2_000_000});
 const output=(await readFile(stem+'.sscore','utf8')).trim().split(/\r?\n/).map(l=>l.trim().split(/\s+/)),columns=output.shift().map(c=>c.replace(/^#/,''));
 const external=new Map(output.map(r=>[r[columns.indexOf('IID')],{score:Number(r[columns.indexOf('SCORE1_SUM')]),alleles:Number(r[columns.indexOf('ALLELE_CT')])}]));
 if((await readFile(stem+'.sscore.vars','utf8')).trim().split(/\r?\n/).length!==model.variantCount)throw Error('PLINK skipped a reference term');
 let maxError=0;
 for(const [i,id] of sampleIds.entries()){const x=external.get(id);if(!x||x.alleles!==2*model.variantCount||!Number.isFinite(x.score)||Math.abs(x.score-own[i])>1e-5*Math.max(1,Math.abs(own[i])))throw Error('Independent PLINK reference score mismatch: '+model.id);maxError=Math.max(maxError,Math.abs(x.score-own[i]));}
 const definitions=Object.fromEntries(['GRCh37','GRCh38'].map(build=>[build,referenceDefinition(model,build,library.targets)]));
 Object.assign(result,{status:'Available',sampleCount:sampleIds.length,definitions,modelSha256:createHash('sha256').update(JSON.stringify(definitions)).digest('hex'),scores:own.sort((a,b)=>a-b),verification:{program:'PLINK 2.0 a6.9',sampleComparisons:sampleIds.length,terms:model.variantCount,maxAbsoluteDifference:maxError,note:'PLINK text output is rounded; in-app scores retain double precision.'}});
 models.push(result);checks.push({id:model.id,...result.verification});console.log('Verified full EUR model',model.id,model.variantCount,sampleIds.length);
}
const reference=validateScoreReference({version:'1.0.0',population:'EUR',retrievedAt:new Date().toISOString(),sourceURL:archive.url,archiveSha256:archive.sha256,referenceBuild:'GRCh37',targetBuilds:['GRCh37','GRCh38'],sampleCount:sampleIds.length,subpopulations:population.groups,sampleSelection:population.selection,method:'Whole-model empirical scores from public individual-level 1000 Genomes genotypes. Source KING exclusions removed; no missing-reference-genotype imputation, allele-orientation guessing, term truncation, PCA adjustment or clinical calibration.',models});
if(!checks.length)throw Error('No compatible full-model EUR distributions');
await writeFile(path.join(root,'score-verification','summary.json'),JSON.stringify({checks,unavailable:models.filter(m=>m.status!=='Available').map(({id,reason})=>({id,reason}))},null,2));
const target=process.argv[4]?path.resolve(process.argv[4]):new URL('pgs-score-reference.json',data),temporary=process.argv[4]?target+'.partial':new URL('pgs-score-reference.json.partial',data);
await writeFile(temporary,JSON.stringify(reference)+'\n');await rename(temporary,target);
console.log(JSON.stringify({available:checks.length,total:models.length,samples:sampleIds.length,groups:population.groups}));
