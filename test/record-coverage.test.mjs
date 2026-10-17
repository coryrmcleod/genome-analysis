import test from 'node:test';
import assert from 'node:assert/strict';
import {recordCoverage,recordPresence,recordIssue} from '../public/record-coverage.js';
import {analyzeText} from '../public/engine.js';
test('coverage distinguishes observed, absent and unassessed records including historical reports',()=>{
 const rows=[{status:'Called',recordObserved:true},{status:'Overlapping records',recordObserved:false},{status:'Normalization required',recordObserved:null},{status:'Not observed'},{status:'Quality limited'},{status:'Overlapping records'}];
 assert.deepEqual(recordCoverage(rows),{observed:2,notObserved:2,unassessed:2,total:6});
 assert.equal(recordPresence({status:'Normalization required'}),null);
 assert.equal(recordIssue({status:'Normalization required'}),false);
 assert.equal(recordIssue({status:'Quality limited'}),true);
});
test('SNP record presence is independent of quality, genotype and overlap interpretation',()=>{
 const catalog={version:'test',records:[{id:'rs1',gene:'SYNTHETIC',trait:'Synthetic',label:'Synthetic',category:'Health',priority:1,effectAllele:'G',sources:[],mappings:{GRCh38:{chrom:'1',position:101,ref:'A',alleles:['A','G']}}}]};
 const header='##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n';
 const deletion='1\t100\t.\tCAA\tC\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n';
 const run=body=>analyzeText(header+body,catalog).results[0];
 assert.equal(run(deletion).status,'Overlapping records');assert.equal(run(deletion).recordObserved,false);
 for(const call of ['0/1:60:30','./.:60:30','0/1:2:1'])assert.equal(run('1\t101\t.\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t'+call+'\n'+deletion).recordObserved,true);
});
test('entries without coordinates on the input build are unassessed rather than absent',()=>{
 const catalog={version:'test',records:[{id:'rs1',gene:'SYNTHETIC',trait:'Synthetic',priority:1,effectAllele:'G',mappings:{GRCh37:{chrom:'1',position:101,ref:'A',alleles:['A','G']}}}]};
 const report=analyzeText('##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n1\t101\trs1\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n',catalog);
 assert.equal(report.results[0].status,'Unsupported build');assert.equal(report.results[0].recordObserved,null);assert.equal(report.results[0].copies,null);assert.deepEqual(recordCoverage(report.results),{observed:0,notObserved:0,unassessed:1,total:1});
});
