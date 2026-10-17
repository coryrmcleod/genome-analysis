// Local representation conversion only. Originals and their genotype calls remain intact.
import {readFile,writeFile,mkdir,rename,access,unlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateShortVariantLibrary,NORMALIZATION_MARKER} from '../public/short-variants.js';
const [inputArg,referenceArg,outputArg]=process.argv.slice(2);
if(!inputArg||!referenceArg||!outputArg)throw Error('Supply input.vcf.gz, verified GRCh38 FASTA and a NEW output directory. Run in WSL.');
const input=path.resolve(inputArg),reference=path.resolve(referenceArg),outputDir=path.resolve(outputArg),exec=promisify(execFile);
const verifier=fileURLToPath(new URL('./verify-normalization.py',import.meta.url));
await access(verifier);
if([input,reference,outputDir].some(p=>/^\w+:\/\//.test(p)))throw Error('Local files only');
const library=validateShortVariantLibrary(JSON.parse(await readFile(new URL('../public/data/short-variant-library.json',import.meta.url))));
const header=(await exec('bcftools',['view','-h',input],{maxBuffer:20000000})).stdout;
if(!/^##contig=<ID=chr1,length=248956422(?:,|>)/m.test(header))throw Error('Input must declare the verified GRCh38 chr1 contig length and use chr-prefixed reference names.');
if(header.includes('##INFO=<ID=GA_NORM_ORIGINAL,')||header.includes('##GenomeAnalysisIndelMatching='))throw Error('Input already carries normalization provenance; use its original supplemented VCF.');
if(/^##bcftools_normCommand=.*(?:\s-m(?:\s|[+-])|--multiallelics|\s-a(?:\s|$)|--atomize)/m.test(header))throw Error('Input declares earlier multiallelic splitting or atomization; this workflow cannot undo that interpretation.');
async function sha(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
console.log('Checking complete reference and source hashes…');
const referenceSha256=await sha(reference);if(referenceSha256!==library.referenceSha256)throw Error('Reference FASTA differs from the indel-library reference');
const sourceSha256=await sha(input);await mkdir(outputDir,{recursive:false});
const stem=path.basename(input).replace(/\.vcf(?:\.gz)?$/i,''),output=path.join(outputDir,stem+'.analysis-ready.vcf.gz'),partial=path.join(outputDir,'analysis.partial.vcf.gz');
const manifest={status:'started',createdAt:new Date().toISOString(),input,sourceSha256,output,referenceSha256,build:'GRCh38',splitMultiallelic:false,scope:'Reference-checked left alignment and minimal representation. No clinical validation, genotype imputation, decomposition or REF coercion.',commands:[]};
async function run(exe,args){manifest.commands.push({exe,args});const result=await exec(exe,args,{maxBuffer:3000000});if(result.stderr)console.log(result.stderr.trim());return result;}
try{
 await writeFile(path.join(outputDir,'provenance.json'),JSON.stringify(manifest,null,2));
 const normalized=path.join(outputDir,'normalized.bcf'),annotated=path.join(outputDir,'annotated.bcf'),extra=path.join(outputDir,'normalization-header.txt');
 console.log('Normalizing allele representations without splitting records…');
 await run('bcftools',['norm','-f',reference,'--check-ref','e','--old-rec-tag','GA_NORM_ORIGINAL','-Ob','-o',normalized,input]);
 await writeFile(extra,`##GenomeAnalysisIndelMatching=${NORMALIZATION_MARKER}\n##GenomeAnalysisReferenceSHA256=${referenceSha256}\n##GenomeAnalysisNormalizationSourceSHA256=${sourceSha256}\n`);
 await run('bcftools',['annotate','-h',extra,'-Ob','-o',annotated,normalized]);
 await run('bcftools',['sort','-Oz','-o',partial,'-T',path.join(outputDir,'sort-tmp'),annotated]);
 await run('bcftools',['index','--tbi',partial]);
 console.log('Verifying original genotypes, quality values and phase after normalization…');
 const audit=path.join(outputDir,'normalization-preservation.json');
 await run('python3',[verifier,input,partial,audit]);
 manifest.verification=JSON.parse(await readFile(audit));manifest.outputSha256=await sha(partial);
 await rename(partial,output);await rename(partial+'.tbi',output+'.tbi');
 manifest.status='complete';manifest.completedAt=new Date().toISOString();await writeFile(path.join(outputDir,'provenance.json'),JSON.stringify(manifest,null,2));
 // Remove only the intermediate files this invocation created inside its new directory.
 for(const file of [normalized,annotated]){if(path.dirname(file)!==outputDir)throw Error('Intermediate cleanup path mismatch');await unlink(file);}
 console.log(JSON.stringify({output,status:manifest.status,records:manifest.verification.original.records,representationChanges:manifest.verification.representationChanges}));
}catch(error){manifest.status='failed';manifest.error=error.message;await writeFile(path.join(outputDir,'provenance.json'),JSON.stringify(manifest,null,2));throw error;}
