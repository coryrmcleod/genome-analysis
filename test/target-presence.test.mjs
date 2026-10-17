import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {gzipSync} from 'node:zlib';import {missingTargetIDs,verifyTargetReference} from '../scripts/target-presence.mjs';
test('reference verification checks the full deletion reference sequence',()=>{
 const targets=[{chrom:'chr6',position:31527732,ref:'AGA'}];
 assert.equal(verifyTargetReference('>chr6:31527732-31527734\nAGA\n',targets),1);
 assert.throws(()=>verifyTargetReference('>chr6:31527732-31527732\nA\n',targets));
 assert.throws(()=>verifyTargetReference('>chr6:31527732-31527734\nAAA\n',targets));
});
const record=(id,position)=>({id,gene:'SYNTHETIC',label:'Synthetic',trait:'Synthetic',category:'Health',priority:1,evidence:'Synthetic',effectAllele:'G',frequency:null,mappings:{GRCh38:{chrom:'1',position,ref:'A',alleles:['A','G']}},summary:'Synthetic',caution:'Not real DNA',sources:[{label:'Synthetic',url:'https://example.org/synthetic'}]});
const catalog={version:'test',retrievedAt:'2026-09-07T00:00:00Z',records:[record('rs1',100),record('rs2',200)]};
const header='##fileformat=VCFv4.3\n##reference=GRCh38\n##contig=<ID=chr1,length=248956422>\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n';
test('incremental targets exclude every represented position, including failed and missing genotypes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'genome-synthetic-presence-')),file=path.join(dir,'synthetic.vcf.gz');try{
  for(const [gt,gq,filter] of [['0/1','60','PASS'],['./.','60','PASS'],['0/1','5','PASS'],['0/1','60','LowQual']]){await writeFile(file,gzipSync(header+`chr1\t100\t.\tA\tG\t80\t${filter}\t.\tGT:GQ:DP\t${gt}:${gq}:30\n`));const result=await missingTargetIDs(file,catalog,{build:'GRCh38',sample:'SYNTHETIC'});assert.deepEqual([...result.ids],['rs2']);assert.equal(result.represented,1);assert.match(result.sha256,/^[a-f0-9]{64}$/);}
  await assert.rejects(()=>missingTargetIDs(file,catalog,{build:'GRCh38',sample:'OTHER'}));
  await writeFile(file,gzipSync(header.replace('248956422','249250621')+'chr1\t100\t.\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n'));await assert.rejects(()=>missingTargetIDs(file,catalog,{build:'GRCh38',sample:'SYNTHETIC'}));
  const gz=gzipSync(header+'chr1\t100\t.\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n');await writeFile(file,gz.subarray(0,gz.length-8));await assert.rejects(()=>missingTargetIDs(file,catalog,{build:'GRCh38',sample:'SYNTHETIC'}));
 }finally{await unlink(file);await rmdir(dir);}
});
test('batched FASTA validation requires every exact position and reference base',()=>{
 const targets=[{chrom:'chr1',position:100,ref:'A'},{chrom:'chr2',position:200,ref:'G'}];assert.equal(verifyTargetReference('>chr2:200-200\ng\n>chr1:100-100\nA\n',targets),2);
 for(const text of ['>chr1:100-100\nA\n','>chr1:100-100\nC\n>chr2:200-200\nG\n','>chr1:100-100\nA\n>chr1:100-100\nA\n>chr2:200-200\nG\n'])assert.throws(()=>verifyTargetReference(text,targets));
});
