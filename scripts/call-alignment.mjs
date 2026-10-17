import {missingTargetIDs,verifyTargetReference} from './target-presence.mjs';
import {validateAncestryReference,ancestryTargetCatalog} from '../public/ancestry.js';
import {mergeResearchLibrary} from '../public/research-library.js';
import {createHash} from 'node:crypto';
import {mergePharmacogeneticLibrary} from '../public/pharmacogenetics.js';
import {mergeClinicalLibrary} from '../public/clinical.js';
// Optional local SAMtools/BCFtools adapter. Never uploads alignment data.
import {spawn} from 'node:child_process';
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCatalog} from '../public/catalog.js';
import {validatePGSLibrary} from '../public/pgs.js';
import {addReferenceQuality} from '../public/reference-quality.js';

export function ancestryCallingMode(value='true'){
  if(!['true','false'].includes(value))throw Error('--ancestry must be true or false.');
  return value==='true';
}
export async function preparationAncestryTargets(includeAncestry,loadReference=()=>readFile(new URL('../public/data/ancestry-reference.json',import.meta.url),'utf8')){
  if(typeof includeAncestry!=='boolean')throw Error('Choose whether to include ancestry.');
  if(!includeAncestry)return {reference:null,records:[]};
  const reference=validateAncestryReference(JSON.parse(await loadReference()));
  return {reference,records:ancestryTargetCatalog(reference).records};
}
export function parseSamHeader(text){const sequences=new Map(),samples=new Set();let sorted=false;for(const line of text.split(/\r?\n/)){const [kind,...fields]=line.split('\t');const tags=Object.fromEntries(fields.filter(f=>f.includes(':')).map(f=>[f.slice(0,2),f.slice(3)]));if(kind==='@HD')sorted=tags.SO==='coordinate';if(kind==='@SQ')sequences.set(tags.SN,{length:Number(tags.LN),md5:tags.M5});if(kind==='@RG'&&tags.SM)samples.add(tags.SM);}return {sequences,samples,sorted};}
export function checkReference(alignment,reference,build){
  const chr1=alignment.sequences.has('1')?'1':'chr1';
  const expected={GRCh37:249250621,GRCh38:248956422}[build];
  if(!expected||alignment.sequences.get(chr1)?.length!==expected)throw Error('Chromosome 1 length does not match the selected human assembly.');
  if(!alignment.sorted)throw Error('Alignment must declare coordinate sorting (SO:coordinate).');
  if(alignment.samples.size!==1)throw Error('Alignment must have exactly one distinct @RG SM sample.');
  for(const [name,seq] of alignment.sequences){const ref=reference.sequences.get(name);if(!ref||ref.length!==seq.length)throw Error(`Reference dictionary mismatch for ${name}. Supply the exact alignment FASTA.`);if(!seq.md5||!ref.md5||seq.md5.toLowerCase()!==ref.md5.toLowerCase())throw Error(`Missing or mismatched reference MD5 for ${name}. Exact reference identity is required.`);}
}
export function callingCommands({bcftools='bcftools',alignment,reference,output}){return [
  {exe:bcftools,args:['mpileup','-f',reference,'-R',path.join(output,'targets.tsv'),'-q','20','-Q','20','-a','FORMAT/DP','-Ob','-o',path.join(output,'pileup.bcf'),alignment]},
  {exe:bcftools,args:['call','-m','-A','-f','GQ','-Ov','-o',path.join(output,'unfiltered.vcf'),path.join(output,'pileup.bcf')]},
  {exe:bcftools,args:['filter','-s','PANEL_LOWQUAL','-e','FMT/DP<10 || FMT/GQ<20 || FMT/DP="." || FMT/GQ="."','-Ov','-o',path.join(output,'filtered.vcf'),path.join(output,'unfiltered.vcf')]}
];}
async function run(exe,args,env){return new Promise((resolve,reject)=>{const child=spawn(exe,args,{shell:false,windowsHide:true,env});let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b;if(stdout.length>20_000_000){child.kill();reject(Error('Unexpectedly large command output.'));}});child.stderr.on('data',b=>{stderr=(stderr+b).slice(-16000);process.stderr.write(b);});child.on('error',e=>reject(Error(`${exe}: ${e.message}. Install SAMtools and BCFtools locally or in WSL first.`)));child.on('close',code=>code===0?resolve(stdout):reject(Error(`${exe} exited ${code}: ${stderr.slice(-2000)}`)));});}
async function main(){
  const argv=process.argv.slice(2);
  if(!argv.length||argv.includes('--help')){console.log(`Local CRAM/BAM → panel VCF (research workflow)
Usage: node scripts/call-alignment.mjs --alignment /data/sample.cram --reference /data/exact-reference.fa --build GRCh38 --output /data/new-output-directory
Optional: --ancestry true|false (default true for existing command-line workflows) --samtools /path/to/samtools --bcftools /path/to/bcftools --missing-from /data/existing.vcf.gz
Prerequisites: Node 22+, SAMtools, BCFtools, coordinate-sorted single-sample alignment with index, exact FASTA and .fai. Requires reference MD5s in the alignment header.
Use inside WSL/Linux if the tools are installed there; Windows paths become /mnt/c/... .
This calls only the current catalog sites, including covered reference calls. No coverage is not a reference call. This is not a validated clinical pipeline.`);return;}
  const opts={};for(let i=0;i<argv.length;i+=2){if(!['--alignment','--reference','--build','--output','--samtools','--bcftools','--missing-from','--ancestry'].includes(argv[i])||!argv[i+1])throw Error('Unknown or incomplete argument. Run --help.');opts[argv[i].slice(2)]=argv[i+1];}
  const includeAncestry=ancestryCallingMode(opts.ancestry);
  for(const key of ['alignment','reference','build','output'])if(!opts[key])throw Error(`Missing --${key}.`);
  if(!['GRCh37','GRCh38'].includes(opts.build))throw Error('Build must be GRCh37 or GRCh38.');
  if(!/\.(cram|bam)$/i.test(opts.alignment))throw Error('Alignment must be a CRAM or BAM file.');
  for(const key of ['alignment','reference','output']){if(/^\w+:\/\//.test(opts[key]))throw Error('Local paths only.');opts[key]=path.resolve(opts[key]);}
  if(opts['missing-from']){if(/^\w+:\/\//.test(opts['missing-from'])||!/\.vcf(?:\.gz)?$/i.test(opts['missing-from']))throw Error('Supply a local existing VCF for --missing-from');opts['missing-from']=path.resolve(opts['missing-from']);await access(opts['missing-from']);}
  await access(opts.alignment);await access(opts.reference);await access(opts.reference+'.fai');
  const ext=path.extname(opts.alignment).toLowerCase(),indices=ext==='.cram'?[opts.alignment+'.crai',opts.alignment.slice(0,-5)+'.crai']:[opts.alignment+'.bai',opts.alignment.slice(0,-4)+'.bai',opts.alignment+'.csi'];
  if(!(await Promise.all(indices.map(p=>access(p).then(()=>true,()=>false)))).some(Boolean))throw Error('Alignment index is missing. Create a CRAI/BAI/CSI locally first.');
  const samtools=opts.samtools||'samtools',bcftools=opts.bcftools||'bcftools';
  const env={...process.env,REF_PATH:opts.reference,REF_CACHE:path.join(opts.output,'reference-cache','%2s','%2s','%s')};
  const samVersion=(await run(samtools,['--version'],env)).split('\n')[0],bcfVersion=(await run(bcftools,['--version'],env)).split('\n')[0];
  await run(samtools,['quickcheck','-v',opts.alignment],env);
  const header=await run(samtools,['view','-H','-T',opts.reference,opts.alignment],env);
  console.log('Checking exact reference dictionary and MD5s…');
  const dictionary=await run(samtools,['dict',opts.reference],env);
  const alignmentHeader=parseSamHeader(header);checkReference(alignmentHeader,parseSamHeader(dictionary),opts.build);
  let catalog=mergeClinicalLibrary(validateCatalog(JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)))),JSON.parse(await readFile(new URL('../public/data/clinical-library.json',import.meta.url))));
catalog=mergePharmacogeneticLibrary(catalog,JSON.parse(await readFile(new URL('../public/data/cpic-library.json',import.meta.url))));
catalog=mergeResearchLibrary(catalog,JSON.parse(await readFile(new URL('../public/data/research-library.json',import.meta.url))));
  for(const record of catalog.records){const mapping=record.mappings[opts.build];if(mapping&&!/^(?:[1-9]|1[0-9]|2[0-2])$/.test(mapping.chrom))throw Error('The alignment adapter currently supports autosomal catalog sites only. Sex chromosomes require a validated ploidy workflow.');}
  const library=validatePGSLibrary(JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))));
  const combined=new Map(catalog.records.map(r=>[r.id,r]));
  const {reference:ancestryReference,records:ancestryRecords}=await preparationAncestryTargets(includeAncestry);
  for(const r of ancestryRecords){const prior=combined.get(r.id);if(prior){const a=prior.mappings[opts.build],b=r.mappings[opts.build];if(!a||a.chrom!==b.chrom||a.position!==b.position||a.ref!==b.ref)throw Error('Conflicting ancestry/catalog mapping for '+r.id);}else combined.set(r.id,r);}
  for(const r of library.targets){const prior=combined.get(r.id);if(prior&&JSON.stringify(prior.mappings[opts.build])!==JSON.stringify(r.mappings[opts.build])){const a=prior.mappings[opts.build],b=r.mappings[opts.build];if(a.chrom!==b.chrom||a.position!==b.position||a.ref!==b.ref)throw Error('Conflicting panel/score mapping for '+r.id);}if(!prior)combined.set(r.id,r);}
  let targets=[...combined.values()].map(r=>{const m=r.mappings[opts.build];if(!m)throw Error(`Catalog has no ${opts.build} mapping for ${r.id}.`);const chrom=alignmentHeader.sequences.has(m.chrom)?m.chrom:'chr'+m.chrom;if(!alignmentHeader.sequences.has(chrom))throw Error(`Alignment lacks ${m.chrom}.`);return {...m,chrom,id:r.id};}).sort((a,b)=>a.chrom.localeCompare(b.chrom)||a.position-b.position);
  let presence=null;
  if(opts['missing-from']){console.log('Checking positions already represented in the existing VCF…');presence=await missingTargetIDs(opts['missing-from'],{...catalog,records:[...combined.values()]},{build:opts.build,sample:[...alignmentHeader.samples][0]});targets=targets.filter(t=>presence.ids.has(t.id));console.log('New missing target positions:',targets.length);if(!targets.length)throw Error('No absent target positions remain; existing records were not replaced.');}
  await mkdir(opts.output,{recursive:false});
  const regionFile=path.join(opts.output,'reference-regions.txt');await writeFile(regionFile,[...new Set(targets.map(t=>t.chrom+':'+t.position+'-'+(t.position+t.ref.length-1)))].join('\n')+'\n');
  const checkedReferencePositions=verifyTargetReference(await run(samtools,['faidx','-r',regionFile,opts.reference],env),targets);
  await writeFile(path.join(opts.output,'targets.tsv'),targets.map(t=>`${t.chrom}\t${t.position}\t${t.position}`).join('\n')+'\n');
  const commands=callingCommands({...opts,bcftools});
  const librarySnapshot={catalog,pgsLibrary:library,ancestryReference};await writeFile(path.join(opts.output,'library-snapshot.json'),JSON.stringify(librarySnapshot));
  const manifest={existingVCF:presence?{file:opts['missing-from'],sha256:presence.sha256,records:presence.records,representedTargets:presence.represented,policy:presence.policy}:null,targetReferenceCheck:{method:'Single SAMtools faidx batch; all expected bases required',positions:checkedReferencePositions},librarySnapshotSha256:createHash('sha256').update(JSON.stringify(librarySnapshot)).digest('hex'),clinicalLibraryVersion:catalog.clinicalVersion,clinicalReleaseDate:catalog.clinicalReleaseDate,pharmacogeneticLibraryVersion:catalog.pharmacogeneticVersion,createdAt:new Date().toISOString(),build:opts.build,alignment:opts.alignment,reference:opts.reference,sample:[...alignmentHeader.samples][0],targetCount:targets.length,scoreLibraryVersion:library.version,scoreModels:library.models.map(m=>m.id),catalogVersion:catalog.version,catalogRetrievedAt:catalog.retrievedAt,toolVersions:{samtools:samVersion,bcftools:bcfVersion},scope:'Targeted interpretation-panel and installed PGS SNV calling; no clinical validation',commands,status:'started'};
  manifest.includeAncestry=includeAncestry;
  if(ancestryReference)manifest.ancestryReference={version:ancestryReference.version,method:ancestryReference.method,markerCount:ancestryReference.markers.length,sourceURL:ancestryReference.sourceURL};
  if(includeAncestry)manifest.scope='Targeted interpretation, installed PGS and ancestry-marker SNV calling; no clinical validation';
  await writeFile(path.join(opts.output,'provenance.json'),JSON.stringify(manifest,null,2));
  for(const command of commands){console.log(`Running ${path.basename(command.exe)} ${command.args[0]}…`);await run(command.exe,command.args,env);
    if(command.args[0]==='call'){
      const consensusArgs=['call','-c','-a','GQ','-Ov','-o',path.join(opts.output,'consensus.vcf'),path.join(opts.output,'pileup.bcf')];
      await run(bcftools,consensusArgs,env);
      const original=await readFile(path.join(opts.output,'unfiltered.vcf'),'utf8');await writeFile(path.join(opts.output,'multiallelic.vcf'),original);
      const enriched=addReferenceQuality(original,await readFile(path.join(opts.output,'consensus.vcf'),'utf8'));
      await writeFile(path.join(opts.output,'unfiltered.vcf'),enriched.text);
      manifest.referenceQuality={command:{exe:bcftools,args:consensusArgs},supplemented:enriched.supplemented,policy:'Consensus GQ only at matching diploid reference calls with identical depth; existing GQ retained'};
    }
  }
  const vcf=await readFile(path.join(opts.output,'filtered.vcf'),'utf8');
  const lines=vcf.split(/\r?\n/).filter(l=>!l.startsWith('##reference='));
  const firstHeader=lines.findIndex(l=>l.startsWith('#CHROM'));if(firstHeader<0)throw Error('Caller output lacks a VCF sample header.');
  lines.splice(firstHeader,0,`##reference=${opts.build}`,'##source=GenomeAnalysis_targeted_research_pipeline');
  await writeFile(path.join(opts.output,'panel.vcf'),lines.join('\n'));
  manifest.status='complete';await writeFile(path.join(opts.output,'provenance.json'),JSON.stringify(manifest,null,2));
  console.log(`Import ${path.join(opts.output,'panel.vcf')} into Genome Analysis. Missing sites remain unobserved.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
