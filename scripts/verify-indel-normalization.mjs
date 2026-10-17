// Independent BCFtools conformance using synthetic repeat sequences only. Run in WSL.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const exec=promisify(execFile),dir=new URL('../work/normalization-conformance/',import.meta.url);await mkdir(dir,{recursive:true});
const file=name=>fileURLToPath(new URL(name,dir)),sequence='CAAAAGCTAGCTAGCTAGCTAGCTAGCTAGCT';
await writeFile(file('reference.fa'),'>chr1\n'+sequence+'\n');
const header=`##fileformat=VCFv4.3\n##contig=<ID=chr1,length=${sequence.length}>\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Quality">\n##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Depth">\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n`;
const row=(pos,id,ref,alt,gt='0|1')=>['chr1',pos,id,ref,alt,80,'PASS','.', 'GT:GQ:DP',gt+':60:30'].join('\t');
const input=header+[row(1,'padding','CA','CAA'),row(2,'del2','AA','A'),row(3,'del3','AA','A'),row(4,'del4','AA','A'),row(4,'ins','A','AA','1/1'),row(4,'multi','A','AA,AAA','1/2')].join('\n')+'\n';
await writeFile(file('input.vcf'),input);const hash=s=>createHash('sha256').update(s).digest('hex'),before=hash(input);
async function norm(source,destination){return exec('bcftools',['norm','-f',file('reference.fa'),'--check-ref','e','--old-rec-tag','GA_NORM_ORIGINAL','-Ov','-o',file(destination),file(source)]);}
await norm('input.vcf','normalized.vcf');const text=await readFile(file('normalized.vcf'),'utf8'),rows=text.split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split('\t'));
assert.equal(rows.length,6);for(const id of ['del2','del3','del4']){const r=rows.find(r=>r[2]===id);assert.deepEqual(r.slice(0,2),['chr1','1']);assert.deepEqual(r.slice(3,5),['CA','C']);assert.ok(r[7].includes('GA_NORM_ORIGINAL='));}
assert.deepEqual(rows.find(r=>r[2]==='padding').slice(3,5),['C','CA']);
assert.equal(rows.find(r=>r[2]==='multi')[4].split(',').length,2);assert.equal(rows.find(r=>r[2]==='multi')[9],'1/2:60:30');
await norm('normalized.vcf','twice.vcf');const body=s=>s.split('\n').filter(l=>l&&!l.startsWith('#'));assert.deepEqual(body(await readFile(file('twice.vcf'),'utf8')),body(text));
await writeFile(file('bad-ref.vcf'),header+row(1,'bad','T','TA')+'\n');await assert.rejects(norm('bad-ref.vcf','bad-output.vcf'));
const verification=await exec('python3',[fileURLToPath(new URL('./verify-normalization.py',import.meta.url)),file('input.vcf'),file('normalized.vcf')]);assert.equal(JSON.parse(verification.stdout).identicalGenotypeRecordMultiset,true);
await writeFile(file('mutated.vcf'),text.replace('1/1:60:30','0/1:60:30'));await assert.rejects(exec('python3',[fileURLToPath(new URL('./verify-normalization.py',import.meta.url)),file('input.vcf'),file('mutated.vcf')]));
assert.equal(hash(await readFile(file('input.vcf'),'utf8')),before);
const result={syntheticOnly:true,records:rows.length,repeatLeftAlignment:true,minimalPadding:true,multiallelicUnsplit:true,phasePreserved:true,idempotent:true,referenceMismatchRejected:true,genotypeMutationDetected:true,originalUnchanged:true};
await writeFile(file('results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
