// Read only an indexed local VCF. Prints coverage counts, never genotype rows.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createScanner} from '../public/engine.js';
import {pgsTargetCatalog,calculatePGS,validatePGSLibrary} from '../public/pgs.js';
const input=process.argv[2];if(!input||/^\w+:\/\//.test(input))throw Error('Supply a local indexed VCF path. Run inside WSL with bcftools installed.');
const library=validatePGSLibrary(JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))));
const work=new URL('../work/pgs-source/',import.meta.url);await mkdir(work,{recursive:true});
// Header determines build and chromosome prefix; do not infer these from a filename.
async function header(){return new Promise((resolve,reject)=>{const child=spawn('bcftools',['view','-h',input],{shell:false});let out='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>process.stderr.write(b));child.on('error',reject);child.on('close',code=>code?reject(Error('Cannot read VCF header')):resolve(out));});}
const h=await header();const matches=[...h.matchAll(/^##reference=.*?(GRCh3[78]|hg(?:19|38))/gmi)].map(m=>/38/.test(m[1])?'GRCh38':'GRCh37');
if(!matches.length||new Set(matches).size!==1)throw Error('VCF reference build is missing or conflicting');const build=matches[0];
const prefix=/^##contig=<ID=chr1,/m.test(h)?'chr':'';const targets=new URL('coverage-targets.tsv',work);
await writeFile(targets,library.targets.map(t=>{const m=t.mappings[build];return `${prefix}${m.chrom}\t${m.position}\t${m.position}`;}).join('\n')+'\n');
const scanner=createScanner(pgsTargetCatalog(library),{build}),child=spawn('bcftools',['view','-R',fileURLToPath(targets),'-Ov',input],{shell:false});
child.stderr.on('data',b=>process.stderr.write(b));const completion=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',c=>c?reject(Error(`bcftools exited ${c}`)):resolve());});
try{for await(const line of createInterface({input:child.stdout,crlfDelay:Infinity}))scanner.consume(line);await completion;}catch(e){child.kill();await completion.catch(()=>{});throw e;}
const result=calculatePGS(library,scanner.finish());
console.log(JSON.stringify({build,uniqueTargets:library.targets.length,models:result.map(({id,total,matched,reasons,status})=>({id,total,matched,reasons,status}))},null,2));
