// Independent BCFtools check using frozen public reference and synthetic GTs.
// Coordinates in this tiny test FASTA are relative, never a personal genome.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadCervicalDeletionProof} from './cervical-deletion-proof.mjs';
import {countReviewedDeletion} from './reviewed-deletion-calls.mjs';
const exec=promisify(execFile),proof=await loadCervicalDeletionProof(),out=new URL('../work/cervical-normalization-conformance/',import.meta.url);await mkdir(out,{recursive:true});
const path=name=>fileURLToPath(new URL(name,out)),body=text=>text.split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>l.split('\t')),hash=b=>createHash('sha256').update(b).digest('hex');
const checks=[];
for(const build of ['GRCh37','GRCh38']){
 const sequence=JSON.parse(await readFile(new URL('../test/fixtures/pgs/cervical-deletion/'+build+'-sequence.json',import.meta.url))).seq;
 await writeFile(path(build+'.fa'),'>synthetic_public_window\n'+sequence+'\n');
 const header='##fileformat=VCFv4.3\n##contig=<ID=synthetic_public_window,length=203>\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Synthetic genotype">\n##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Synthetic quality">\n##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Synthetic depth">\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n';
 const rows=[];for(const gt of ['0/0','0/1','1/1','0|1','./.'])for(const [pos,ref,label] of [[100,'AAG','source'],[101,'AGA','ensembl']])rows.push(['synthetic_public_window',pos,label+'-'+gt.replace(/[^01]/g,'x'),ref,'A',80,'PASS','.', 'GT:GQ:DP',gt+':60:30'].join('\t'));
 const input=header+rows.join('\n')+'\n';await writeFile(path(build+'-input.vcf'),input);
 const norm=async(from,to)=>exec('bcftools',['norm','-f',path(build+'.fa'),'--check-ref','e','-Ov','-o',path(to),path(from)]);
 await norm(build+'-input.vcf',build+'-normalized.vcf');const normalized=await readFile(path(build+'-normalized.vcf'),'utf8'),records=body(normalized);assert.equal(records.length,10);
 for(const [i,row] of records.entries()){assert.deepEqual(row.slice(1,2),['100']);assert.deepEqual(row.slice(3,5),['AAG','A']);assert.equal(row[9],rows[i].split('\t')[9]);}
 const window={build,chrom:'6',start:proof.proofs[build].windowStart,sequence},representation={position:window.start+99,ref:'AAG',alt:'A'};
 const countRow=row=>{const [GT,GQ,DP]=row[9].split(':');return countReviewedDeletion(window,representation,[{chrom:'6',position:window.start+Number(row[1])-1,ref:row[3],alt:row[4],filter:row[6],GT,GQ,DP}],build);};
 for(const [i,row] of records.entries()){const before=countRow(rows[i].split('\t')),after=countRow(row);assert.equal(before.dosage,after.dosage);assert.equal(before.status,after.status);assert.equal(before.genotype,after.genotype);assert.equal(before.phase,after.phase);}
 await norm(build+'-normalized.vcf',build+'-twice.vcf');assert.deepEqual(body(await readFile(path(build+'-twice.vcf'),'utf8')),records);
 await writeFile(path(build+'-bad-ref.vcf'),header+rows[0].replace('\tAAG\tA\t','\tAGG\tA\t')+'\n');await assert.rejects(norm(build+'-bad-ref.vcf',build+'-bad-output.vcf'));
 assert.equal(hash(await readFile(path(build+'-input.vcf'))),hash(input));
 checks.push({build,syntheticRecords:records.length,normalizedRelativePosition:100,ref:'AAG',alt:'A',genotypesAndPhaseUnchanged:true,missingPreserved:true,dosagePrototypeMatchesBeforeAndAfter:true,idempotent:true,badReferenceRejected:true,inputUnchanged:true});
}
const version=(await exec('bcftools',['--version'])).stdout.split('\n')[0],result={syntheticOnly:true,publicEvidence:proof,program:version,checks,scope:'Normalization conformance only. Duplicate representations in a real callset must be rejected, not double-counted. No PGS admission.'};
await writeFile(path('results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({program:version,checks}));
