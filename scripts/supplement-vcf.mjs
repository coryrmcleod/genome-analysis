import {mergeResearchLibrary} from '../public/research-library.js';
import {mergePharmacogeneticLibrary} from '../public/pharmacogenetics.js';
import {mergeClinicalLibrary} from '../public/clinical.js';
// Preserve the original genome-wide calls, add missing targeted loci, flag disagreements.
// Run in WSL; all personal output belongs in the supplied external-drive directory.
import fs from 'node:fs';
import {readFile,writeFile,access,mkdir,rename} from 'node:fs/promises';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import {createScanner,analyzeText} from '../public/engine.js';
import {screenUnevaluatedPreparationRecord} from '../public/preparation-quality.js';
const [original,targeted,outputDir,outputStem='MMWDDW2BV']=process.argv.slice(2);
if(!original||!targeted||!outputDir)throw Error('Supply original.vcf.gz targeted.vcf output-directory');
if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(outputStem))throw Error('Output name must contain only letters, digits, dots, underscores or hyphens.');
const output=path.join(outputDir,`${outputStem}.supplemented.vcf.gz`);
if(await access(output).then(()=>true,()=>false))throw Error('Output already exists');
const partial=path.join(outputDir,'MMWDDW2BV.supplemented.partial.vcf.gz');
if(await access(partial).then(()=>true,()=>false))throw Error('An unfinished output exists; use a new output directory.');
await mkdir(outputDir,{recursive:true});
let base=mergeClinicalLibrary(JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/clinical-library.json',import.meta.url))));
base=mergePharmacogeneticLibrary(base,JSON.parse(await readFile(new URL('../public/data/cpic-library.json',import.meta.url))));
base=mergeResearchLibrary(base,JSON.parse(await readFile(new URL('../public/data/research-library.json',import.meta.url))));
const library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url)));
const records=new Map(base.records.map(r=>[r.id,r]));for(const r of library.targets)if(!records.has(r.id))records.set(r.id,r);
const catalog={...base,records:[...records.values()]};
const targetText=await readFile(targeted,'utf8');
const targetReport=analyzeText(targetText,catalog,{pgsLibrary:library});
const targetRows=new Map(targetText.split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const f=l.split('\t');return [f[0]+':'+f[1],f];}));
const seen=new Set(),originalScanner=createScanner(catalog,{pgsLibrary:library});
async function* lines(file){const source=fs.createReadStream(file),stream=source.pipe(createGunzip());source.on('error',e=>stream.destroy(e));const reader=createInterface({input:stream,crlfDelay:Infinity});let failure;stream.on('error',e=>{failure=e;reader.close();});try{for await(const l of reader)yield l;if(failure)throw failure;}finally{reader.close();source.destroy();stream.destroy();}}
let originalCount=0;
for await(const line of lines(original)){if(line.startsWith('##GenomeAnalysisIndelMatching='))throw Error('Supplement the unnormalized source VCF, then normalize the newly combined file. Existing normalization provenance cannot cover newly added calls.');originalScanner.consume(line);if(line&&!line.startsWith('#')){originalCount++;const f=line.split('\t',3);if(targetRows.has(f[0]+':'+f[1]))seen.add(f[0]+':'+f[1]);}}
const originalReport=originalScanner.finish();
if(originalReport.sample!==targetReport.sample||originalReport.build!==targetReport.build)throw Error('Sample/build mismatch');
const oldCalls=new Map(originalReport.results.map(r=>[r.id,r])),conflicts=[];
for(const r of targetReport.results){const old=oldCalls.get(r.id);if(old?.status==='Called'&&r.status==='Called'&&old.alleles.slice().sort().join('')!==r.alleles.slice().sort().join(''))conflicts.push({id:r.id,original:old.genotype,targeted:r.genotype,mapping:r.mappings[targetReport.build]});}
const conflictPositions=new Set(conflicts.map(c=>'chr'+c.mapping.chrom+':'+c.mapping.position));
const sort=spawn('bcftools',['sort','-m','512M','-T',path.join(outputDir,'sort-tmp'),'--output-type','z','--output',partial],{stdio:['pipe','ignore','inherit']});
const completion=new Promise((resolve,reject)=>{sort.on('error',reject);sort.on('close',c=>c?reject(Error('bcftools sort failed: '+c)):resolve());});
completion.catch(()=>{});let sortFailure;sort.stdin.on('error',e=>{sortFailure=e;});
async function emit(s){if(sortFailure)throw sortFailure;if(!sort.stdin.write(s+'\n'))await once(sort.stdin,'drain');}
let flaggedRecords=0,added=0;
const preparationQuality={screened:0,passed:0,failed:0,policy:'Previously unevaluated single-sample records explicitly screened for diploid SNV genotype, GQ>=20 and DP>=10; existing failed filters never cleared; genotype and quality fields retained.'};
for await(let line of lines(original)){
 if(line.startsWith('#CHROM')){
  await emit('##source=GenomeAnalysis_conservative_target_supplement');
  await emit('##FILTER=<ID=GA_CALL_DISAGREEMENT,Description="High-quality targeted CRAM genotype disagrees with original call; original genotype retained and interpretation withheld">');
  await emit('##FILTER=<ID=PANEL_LOWQUAL,Description="Targeted genotype fails DP>=10 and GQ>=20">');
  await emit('##INFO=<ID=GA_TARGET_CALL,Number=0,Type=Flag,Description="New targeted CRAM call at a position absent from the original VCF">');
  await emit('##FILTER=<ID=GA_PREPARATION_LOWQUAL,Description="Previously unevaluated record fails explicit diploid SNV GQ>=20 DP>=10 preparation screen">');
  await emit('##INFO=<ID=GA_PREPARATION_QC,Number=0,Type=Flag,Description="Original FILTER was unevaluated; preparation explicitly screened diploid SNV genotype GQ>=20 DP>=10; original genotype and quality fields retained">');
 }
 if(line&&!line.startsWith('#')){const screened=screenUnevaluatedPreparationRecord(line);line=screened.line;if(screened.screened){preparationQuality.screened++;preparationQuality[screened.passed?'passed':'failed']++;}const f=line.split('\t');if(conflictPositions.has(f[0]+':'+f[1])){f[6]=['PASS','.'].includes(f[6])?'GA_CALL_DISAGREEMENT':f[6]+';GA_CALL_DISAGREEMENT';line=f.join('\t');flaggedRecords++;}}
 await emit(line);
}
for(const [key,f] of targetRows){if(seen.has(key))continue;const fields=f[8].split(':'),values=f[9].split(':'),sample=Object.fromEntries(fields.map((k,i)=>[k,values[i]]));
 await emit([...f.slice(0,7),'GA_TARGET_CALL','GT:GQ:DP',['GT','GQ','DP'].map(k=>sample[k]??'.').join(':')].join('\t'));added++;}
sort.stdin.end();await completion;
await new Promise((resolve,reject)=>{const p=spawn('bcftools',['index','--tbi',partial],{stdio:'inherit'});p.on('error',reject);p.on('close',c=>c?reject(Error('Index failed')):resolve());});
const scanner=createScanner(catalog,{pgsLibrary:library});let finalCount=0;for await(const l of lines(partial)){scanner.consume(l);if(l&&!l.startsWith('#'))finalCount++;}
if(finalCount!==originalCount+added)throw Error('Record count mismatch');
const final=scanner.finish();
await rename(partial+'.tbi',output+'.tbi');await rename(partial,output);
const summary={createdAt:new Date().toISOString(),original,targeted,output,originalCount,added,finalCount,flaggedRecords,conflicts,
 preparationQuality,policy:'Original genotypes and quality fields retained; unevaluated site filters explicitly screened. Only absent positions supplemented. Conflicting high-quality calls are filtered, not replaced. No missing-as-reference substitution.',
 targetCount:catalog.records.length,calledBefore:originalReport.results.filter(r=>r.status==='Called').length,calledAfter:final.results.filter(r=>r.status==='Called').length,
 scoresBefore:originalReport.polygenicScores.map(({id,total,matched,status})=>({id,total,matched,status})),scoresAfter:final.polygenicScores.map(({id,total,matched,status})=>({id,total,matched,status}))};
await writeFile(path.join(outputDir,'supplementation-audit.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({output,originalCount,added,finalCount,flaggedRecords,conflicts:conflicts.map(c=>c.id),calledBefore:summary.calledBefore,calledAfter:summary.calledAfter,scoreModels:summary.scoresAfter.length,audit:path.join(outputDir,'supplementation-audit.json')}));
