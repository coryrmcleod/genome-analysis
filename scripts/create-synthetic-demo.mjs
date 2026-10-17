import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';
// Synthetic genotypes only, using verified public reference alleles. Run in WSL.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {NORMALIZATION_MARKER} from '../public/short-variants.js';
const reference=process.argv[2];if(!reference)throw Error('Supply the indel-library reference FASTA');
const root=new URL('../',import.meta.url),base=JSON.parse(await readFile(new URL('public/data/catalog.json',root))),indels=JSON.parse(await readFile(new URL('public/data/short-variant-library.json',root)));
const referenceHash=createHash('sha256');for await(const chunk of createReadStream(reference))referenceHash.update(chunk);if(referenceHash.digest('hex')!==indels.referenceSha256)throw Error('Synthetic fixture reference differs from the library');
const h=['##fileformat=VCFv4.3','##reference=GRCh38','##source=GenomeAnalysis_SYNTHETIC_EXAMPLES_NOT_A_REAL_PERSON','##FILTER=<ID=LowGQ,Description="Synthetic low-quality example">','##FORMAT=<ID=GT,Number=1,Type=String,Description="Synthetic genotype">','##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Synthetic quality">','##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Synthetic depth">'];
const fai=(await readFile(reference+'.fai','utf8')).trim().split('\n').map(l=>l.split('\t'));for(const f of fai.filter(f=>/^chr(?:[1-9]|1\d|2[0-2])$/.test(f[0])))h.push(`##contig=<ID=${f[0]},length=${f[1]}>`);
const rows=base.records.slice(0,20).map((r,i)=>{const m=r.mappings.GRCh38,alleles=[m.ref,...m.alleles.filter(a=>a!==m.ref)],effect=alleles.indexOf(r.effectAllele);return ['chr'+m.chrom,m.position,r.id,m.ref,alleles.slice(1).join(','),80,i===3?'LowGQ':'PASS','.', 'GT:GQ:DP',i===5?'./.:.:.':`${i%3===0?'0/0':'0/'+effect}:${i===3?5:60}:30`];});
for(const [i,gene] of ['BRCA1','CFTR'].entries()){const r=indels.records.find(r=>r.gene===gene),m=r.mappings.GRCh38;rows.push(['chr'+m.chrom,m.position,'SYNTHETIC_'+r.id,m.ref,r.effectAllele,80,i?'LowGQ':'PASS','.', 'GT:GQ:DP',i?'0/1:5:30':'0/1:60:30']);}
rows.sort((a,b)=>Number(a[0].slice(3))-Number(b[0].slice(3))||a[1]-b[1]);h.push('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC');
const work=new URL('work/demo/',root);await mkdir(work,{recursive:true});const source=new URL('synthetic-source.vcf',work),normalized=new URL('synthetic-normalized.vcf',work);await writeFile(source,h.concat(rows.map(r=>r.join('\t'))).join('\n')+'\n');
await promisify(execFile)('bcftools',['norm','-f',reference,'--check-ref','e','-Ov','-o',fileURLToPath(normalized),fileURLToPath(source)]);
let text=(await readFile(normalized,'utf8')).split('\n').filter(l=>!l.startsWith('##bcftools_normCommand=')).join('\n');text=text.replace('#CHROM',`##GenomeAnalysisIndelMatching=${NORMALIZATION_MARKER}\n##GenomeAnalysisReferenceSHA256=${indels.referenceSha256}\n#CHROM`);
await writeFile(new URL('public/synthetic-demo.vcf',root),text);console.log('Created 22 normalized synthetic examples; no personal file was accessed.');
