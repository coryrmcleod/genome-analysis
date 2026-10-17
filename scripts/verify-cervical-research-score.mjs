// WSL/PLINK independent full15-term synthetic benchmark. No personal genomes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadCervicalResearchDefinition,createCervicalResearchScanner} from './cervical-research-score.mjs';import {isPalindromic} from '../public/pgs.js';
import {importReviewedCervical} from './import-reviewed-cervical.mjs';import {analyzeText} from '../public/engine.js';import {pgsTargetCatalog} from '../public/pgs.js';
const exec=promisify(execFile),definition=await loadCervicalResearchDefinition(),out=new URL('../work/cervical-full-model-benchmark/',import.meta.url);await mkdir(out,{recursive:true});
const reviewedLibrary=await importReviewedCervical(JSON.parse(await readFile(new URL('./cervical-selection.json',import.meta.url)))[0]);
const path=name=>fileURLToPath(new URL(name,out)),hash=b=>createHash('sha256').update(b).digest('hex'),samples=Array.from({length:5},(_,i)=>'SYNTHETIC'+i),checks=[];
const weights=definition.model.variants.map(v=>[v.id,v.effectAllele,v.weightText].join('\t')).join('\n')+'\n';await writeFile(path('weights.tsv'),weights);
for(const build of ['GRCh37','GRCh38'])for(const representation of ['source-like','canonical']){
 const expected=Array(5).fill(0),rows=definition.model.variants.map((v,index)=>{
  const m=v.mappings[build],isDeletion=v.kind==='reviewed-deletion';let position=m.position,ref=m.ref,alt=m.alleles.filter(a=>a!==m.ref).join(',');
  if(isDeletion){if(representation==='source-like'){position--;ref='AAG';}alt='A';}
  const calls=samples.map((sample,i)=>{
   const dosage=isDeletion?i%3:isPalindromic(v.effectAllele,v.otherAllele)?1:(index+i)%3;expected[i]+=Math.round(v.weight*1000)*dosage;
   let indexes;if(isDeletion)indexes=[...Array(2-dosage).fill(0),...Array(dosage).fill(1)];else{const inventory=[ref,...alt.split(',')];indexes=[...Array(dosage).fill(v.effectAllele),...Array(2-dosage).fill(v.otherAllele)].map(a=>inventory.indexOf(a));}
   return indexes.join(i%2?'|':'/')+':60:30';
  });return [m.chrom,position,v.id,ref,alt,80,'PASS','.','GT:GQ:DP',...calls];
 }).sort((a,b)=>Number(a[0])-Number(b[0])||a[1]-b[1]);
 const header=['##fileformat=VCFv4.3','##reference='+build,'##FORMAT=<ID=GT,Number=1,Type=String,Description="Synthetic genotype">','##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Synthetic quality">','##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Synthetic depth">','#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t'+samples.join('\t')],vcf=header.join('\n')+'\n'+rows.map(r=>r.join('\t')).join('\n')+'\n',stem=build+'-'+representation;
 await writeFile(path(stem+'.vcf'),vcf);
 await exec('plink2',['--vcf',path(stem+'.vcf'),'--double-id','--score',path('weights.tsv'),'1','2','3','no-mean-imputation','list-variants','cols=+scoresums','--out',path(stem),'--threads','2','--memory','640'],{maxBuffer:2000000});
 const lines=(await readFile(path(stem+'.sscore'),'utf8')).trim().split(/\r?\n/).map(l=>l.trim().split(/\s+/)),columns=lines.shift().map(c=>c.replace(/^#/,''));assert.equal(lines.length,5);
 const external=new Map(lines.map(r=>[r[columns.indexOf('IID')],{sum:Number(r[columns.indexOf('SCORE1_SUM')]),alleles:Number(r[columns.indexOf('ALLELE_CT')])}]));
 const scoredIds=(await readFile(path(stem+'.sscore.vars'),'utf8')).trim().split(/\r?\n/);assert.deepEqual(scoredIds.slice().sort(),definition.model.variants.map(v=>v.id).sort());
 const results=[];
 for(const [index,sample] of samples.entries()){
  const scanner=await createCervicalResearchScanner({build,sample,syntheticOnly:true});for(const line of vcf.split(/\r?\n/))scanner.consume(line);const result=scanner.finish(),oracle=expected[index]/1000,plink=external.get(sample);
  assert.equal(result.status,'Complete raw sum');assert.equal(result.total,15);assert.equal(result.matched,15);assert.equal(plink.alleles,30);assert.ok(Math.abs(result.rawSum-oracle)<1e-12);assert.ok(Math.abs(plink.sum-oracle)<1e-6);
  const main=analyzeText(vcf,pgsTargetCatalog(reviewedLibrary),{pgsLibrary:reviewedLibrary,sample,build}).polygenicScores[0];
  assert.equal(main.status,'Complete raw sum');assert.equal(main.matched,15);assert.ok(Math.abs(main.rawSum-oracle)<1e-12);assert.equal(main.terms.find(t=>t.kind==='reviewed-deletion').phase,index%2?'phased':'unphased');
  assert.equal(result.deletionCall.phase,index%2?'phased':'unphased');results.push({sample,terms:15,sourceDecimalOracle:oracle,prototype:result.rawSum,mainScanner:main.rawSum,plink:plink.sum,deletionDosage:result.deletionCall.dosage,phase:result.deletionCall.phase});
 }
 checks.push({build,representation,vcfSha256:hash(vcf),allTermsScored:true,results});
}
const program=(await exec('plink2',['--version'])).stdout.trim(),report={syntheticOnly:true,mainScannerVerified:true,program,sourceSha256:definition.sourceSha256,weightsSha256:hash(weights),checks,scope:'Complete published15-term prototype and main-scanner benchmark; publication is a separate stage. No population reference or risk calibration.'};
await writeFile(path('results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
