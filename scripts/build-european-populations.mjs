// Public 1000 Genomes reference only; never reads or sends a personal genotype.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readEuropeanCohort,validateEuropeanSampleIds} from './european-reference-cohort.mjs';
export {validateEuropeanSampleIds} from './european-reference-cohort.mjs';
export function genotypeCounts(record,mapping,sampleCount){
 if(!record||record.ref!==mapping.ref||record.samples.length!==sampleCount||new Set(record.alleles).size!==record.alleles.length||record.alleles.some(a=>!mapping.alleles.includes(a)||!/^[ACGT]$/.test(a)))return null;
 const gtIndex=record.format.indexOf('GT');if(gtIndex<0)return null;
 const counts=new Map();
 for(const sample of record.samples){const parts=sample.split(':')[gtIndex]?.split(/[|/]/);
  if(parts?.length!==2||parts.some(a=>! /^(0|[1-9]\d*)$/.test(a)||!Number.isSafeInteger(Number(a))||Number(a)>=record.alleles.length))return null;
  const genotype=parts.map(a=>record.alleles[Number(a)]).sort().join('/');counts.set(genotype,(counts.get(genotype)||0)+1);
 }
 return {sampleCount,genotypes:[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([genotype,count])=>({genotype,count,frequency:count/sampleCount}))};
}
export async function buildEuropeanPopulations(root,library,previous){
 const archive=JSON.parse(fs.readFileSync(path.join(root,'archive-provenance.json'))),sample=JSON.parse(fs.readFileSync(path.join(root,'sample-provenance.json')));
 if(sample.sampleCount!==503||JSON.stringify(Object.entries(sample.groups).sort())!==JSON.stringify(Object.entries({GBR:91,FIN:99,IBS:107,CEU:99,TSI:107}).sort()))throw Error('Unreviewed EUR reference cohort');
 const expectedIds=readEuropeanCohort(root);
 const targets=new Map(),records={};
 for(const target of library.targets){const m=target.mappings.GRCh37,key=m.chrom+':'+m.position;if(!targets.has(key))targets.set(key,[]);targets.get(key).push(target);}
 const found=new Map(),hash=createHash('sha256'),stream=fs.createReadStream(path.join(root,'eur-score-targets.vcf'));stream.on('data',chunk=>hash.update(chunk));
 let headerChecked=false;
 for await(const line of readline.createInterface({input:stream,crlfDelay:Infinity})){
  if(line.startsWith('#CHROM')){const ids=line.split('\t').slice(9);validateEuropeanSampleIds(ids,expectedIds);headerChecked=true;continue;}
  if(!line||line.startsWith('#'))continue;const f=line.split('\t'),key=f[0]+':'+f[1];if(!targets.has(key))continue;
  if(found.has(key)){found.set(key,null);continue;}found.set(key,{ref:f[3],alleles:[f[3],...f[4].split(',')],format:f[8].split(':'),samples:f.slice(9)});
 }
 if(!headerChecked)throw Error('No EUR VCF sample header');
 let retained=0,added=0;
 for(const target of library.targets){const old=previous?.records?.[target.id];
  if(target.variantKind==='reviewed-pgs-deletion'){records[target.id]={sourceURL:archive.url,status:'No complete compatible public EUR genotypes',reason:'Certified deletion public-cohort genotypes require independent full-haplotype verification; no missing/reference or modal-genotype inference.',mapping:target.mappings.GRCh38,populations:{},genotypeSourceBuild:'GRCh37'};continue;}
  if(old?.status==='Verified public forward mapping'&&old.populations?.EUR&&JSON.stringify(old.mapping)===JSON.stringify(target.mappings.GRCh38)){records[target.id]={...old,populations:{EUR:old.populations.EUR}};retained++;continue;}
  const mapping=target.mappings.GRCh37,sameAlleles=[...mapping.alleles].sort().join('')===[...target.mappings.GRCh38.alleles].sort().join('');
  const group=sameAlleles?genotypeCounts(found.get(mapping.chrom+':'+mapping.position),mapping,503):null;
  records[target.id]={sourceURL:archive.url,status:group?'Verified public forward mapping':'No complete compatible public EUR genotypes',mapping:target.mappings.GRCh38,populations:group?{EUR:group}:{},genotypeSourceBuild:'GRCh37'};
  if(group)added++;
 }
 return {version:'1.1.0',retrievedAt:new Date().toISOString(),source:'1000 Genomes Phase 3 observed European genotype frequencies; existing verified Ensembl records retained, additional sites counted from the public 503-person EUR reference',ensemblData:previous?.ensemblData,populations:['EUR'],reference:{sourceURL:archive.url,archiveSha256:archive.sha256,subsetSha256:hash.digest('hex'),sampleCount:503,groups:sample.groups,method:'Exact mapped forward alleles and complete diploid genotypes required. No allele-frequency or Hardy-Weinberg imputation. Duplicate, missing, malformed or incompatible reference records do not supply a mode.'},counts:{retained,added,unavailable:library.targets.length-retained-added},records};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const original=new URL('../public/data/pgs-populations.json',import.meta.url),output=process.argv[4]||fileURLToPath(original),library=JSON.parse(fs.readFileSync(process.argv[3]||new URL('../public/data/pgs-library.json',import.meta.url))),previous=JSON.parse(fs.readFileSync(original));
 const result=await buildEuropeanPopulations(process.argv[2],library,previous);fs.writeFileSync(output+'.partial',JSON.stringify(result)+'\n');fs.renameSync(output+'.partial',output);console.log(JSON.stringify(result.counts));
}
