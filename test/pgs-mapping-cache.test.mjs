import test from 'node:test';import assert from 'node:assert/strict';import {mergePGSMappingEvidence as merge} from '../scripts/pgs-mapping-cache.mjs';
const raw={name:'rs1',synonyms:['rs2','rs3'],mappings:[{assembly_name:'GRCh38',seq_region_name:'1',start:100,end:100,strand:1,allele_string:'A/G'}]};
test('mapping cache rejects placement contradictions atomically and independently of input order',()=>{
 for(const patch of [{start:101},{end:101},{strand:-1},{allele_string:'G/A'},{seq_region_name:'2'}]){
  const changed={...raw,mappings:[{...raw.mappings[0],...patch}]};
  for(const [first,second] of [[raw,changed],[changed,raw]]){const ref={};merge(ref,{rs1:first},'GRCh38',new Set(['rs1','rs4']));const before=JSON.stringify(ref);assert.throws(()=>merge(ref,{rs4:{...raw,name:'rs4'},rs1:second},'GRCh38',new Set(['rs1','rs4'])),/Conflicting.*rs1 GRCh38/);assert.equal(JSON.stringify(ref),before);}
 }
});
test('mapping cache ignores unrelated records and annotations but intersects alias support',()=>{
 const ref={},ids=new Set(['rs1']);merge(ref,{rs1:raw,rs9:null},'GRCh38',ids);
 merge(ref,{rs1:{...raw,minor_allele:'A',synonyms:['rs2','rs5'],mappings:[{assembly_name:'GRCh38',seq_region_name:'HG_PATCH',start:1,end:1,strand:1,allele_string:'C/T'},...raw.mappings]}},'GRCh38',ids);
 assert.deepEqual(ref.rs1.synonyms,['rs2']);assert.equal(raw.synonyms.length,2);assert.equal(ref.rs9,undefined);
 assert.throws(()=>merge(ref,{rs1:{...raw,name:'rs2'}},'GRCh38',ids),/Conflicting/);
 assert.throws(()=>merge(ref,{rs1:null},'GRCh38',ids),/Malformed/);assert.throws(()=>merge(ref,{},'hg19',ids));
});
