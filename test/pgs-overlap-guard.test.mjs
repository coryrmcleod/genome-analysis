import test from 'node:test';import assert from 'node:assert/strict';import {createPGSOverlapGuard} from '../public/pgs-overlap-guard.js';
const targets=[{id:'rs1',mappings:{GRCh37:{chrom:'6',position:101,ref:'A'},GRCh38:{chrom:'6',position:201,ref:'A'}}},{id:'rs2',mappings:{GRCh37:{chrom:'7',position:300,ref:'G'},GRCh38:{chrom:'7',position:400,ref:'G'}}}];
const row=patch=>{const r={chrom:'6',position:'100',ref:'AAA',alt:'A',filter:'PASS',info:'.',format:'GT:GQ:DP',sample:'0/1:60:30',...patch};return [r.chrom,r.position,'.',r.ref,r.alt,'80',r.filter,r.info,r.format,'0/0:60:30',r.sample];};
const check=(rows,build='GRCh37')=>{const s=createPGSOverlapGuard(targets,{build,sampleCount:2,sampleIndex:1});for(const r of rows)s.consume(r);return [...s.finish()].sort();};
test('mixed-model overlap guard retains sample/build boundaries and actual called-allele inventories',()=>{
 assert.deepEqual(check([row({})]),['rs1']);assert.deepEqual(check([row({})],'GRCh38'),[]);assert.deepEqual(check([row({position:'200',chrom:'chr6'})],'GRCh38'),['rs1']);
 for(const patch of [{sample:'0/0:60:30'},{filter:'LowQual'},{position:'99',ref:'A',alt:'AT'},{position:'101',ref:'A',alt:'C,AT',sample:'0/1:60:30'},{position:'100',ref:'A',alt:'<NON_REF>',info:'END=999',sample:'./.:60:30'}])assert.deepEqual(check([row(patch)]),[]);
 assert.deepEqual(check([row({position:'101',ref:'A',alt:'C,AT',sample:'0/2:60:30'})]),['rs1']);
 assert.deepEqual(check([row({sample:'./.:60:30'})]),['rs1']);assert.deepEqual(check([row({format:'GT:GT:DP',sample:'0/0:1/1:30'})]),['rs1']);
});
test('uncertain structural extents cannot be dismissed as harmless reference or a short SNP',()=>{
 for(const patch of [{position:'1',ref:'A',alt:'<DEL>'},{position:'1',ref:'A',alt:'<DEL>',info:'END=101;END=102'},{position:'1',ref:'A',alt:'<DEL>',info:'END=100;CIPOS=-10,10'},{position:'101',ref:'A',alt:'*'}])assert.deepEqual(check([row(patch)]),['rs1']);
 assert.deepEqual(check([row({position:'1',ref:'A',alt:'<DEL>',info:'END=100'})]),[]);assert.deepEqual(check([row({position:'1',ref:'A',alt:'<DEL>',info:'END=101'})]),['rs1']);
 assert.deepEqual(check([row({chrom:'1',position:'1',ref:'A',alt:'A[6:101['})]),['rs1','rs2']);
 const s=createPGSOverlapGuard(targets,{build:'GRCh37',sampleCount:2,sampleIndex:1});assert.throws(()=>s.consume(row({}).slice(0,-1)),/Malformed/);s.finish();assert.throws(()=>s.consume(row({})),/finalized/);
});
