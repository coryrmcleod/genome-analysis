import test from 'node:test';import assert from 'node:assert/strict';
import {CERVICAL_PGS_DELETION,reviewedPGSDeletionMappings} from '../public/reviewed-pgs-deletion.js';
import {createCertifiedPGSDeletionScanner} from '../public/certified-pgs-deletion-scanner.js';
const target=()=>({id:'rs9279333',variantKind:'reviewed-pgs-deletion',effectAllele:'A',mappings:reviewedPGSDeletionMappings(),reviewedDeletion:structuredClone(CERVICAL_PGS_DELETION)});
const row=(build,sourceLike,gt)=>['6',String(CERVICAL_PGS_DELETION.builds[build].position-(sourceLike?1:0)),'.',sourceLike?'AAG':'AGA','A','80','PASS','.','GT:GQ:DP','0/0:60:30',gt+':60:30'];
test('certified deletion adapter preserves selected-sample allele order and phase across both equivalent representations',()=>{
 for(const build of ['GRCh37','GRCh38'])for(const sourceLike of [true,false])for(const [gt,expected,copies] of [['0/0','AGA/AGA',0],['0|1','AGA|A',1],['1|0','A|AGA',1],['1/1','A/A',2]]){
  const input=target(),scanner=createCertifiedPGSDeletionScanner([input],{build,sampleCount:2,sampleIndex:1});input.mappings[build].ref='bad';scanner.consume(row(build,sourceLike,gt));const result=scanner.finish().results[0];assert.equal(result.genotype,expected);assert.equal(result.copies,copies);assert.equal(result.inputCall.genotype,gt);assert.equal(result.mappings[build].ref,'AGA');assert.throws(()=>scanner.finish(),/finalized/);
 }
});
test('certified deletion adapter never promotes missing, duplicate, ambiguous or uncertified calls',()=>{
 const build='GRCh38',config={build,sampleCount:2,sampleIndex:1};
 for(const records of [[],[row(build,true,'./.')],[row(build,true,'1/1'),row(build,false,'1/1')],[row(build,true,'1')]]){
  const s=createCertifiedPGSDeletionScanner([target()],config);for(const r of records)s.consume(r);const result=s.finish().results[0];assert.notEqual(result.status,'Called');assert.equal(result.copies,null);assert.equal(result.alleles,null);
 }
 assert.throws(()=>createCertifiedPGSDeletionScanner([{...target(),id:'rs1'}],config),/Unreviewed/);
 assert.throws(()=>createCertifiedPGSDeletionScanner([target(),target()],config),/one exact/);
 assert.throws(()=>createCertifiedPGSDeletionScanner([target()],{...config,sampleIndex:2}),/configuration/);
});
