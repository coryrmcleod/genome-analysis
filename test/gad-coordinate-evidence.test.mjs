import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGADPublicMappingEvidence,verifyGADPublicMappingEvidence} from '../scripts/gad-coordinate-evidence.mjs';
test('frozen GAD mapping evidence proves exact reciprocal primary coordinates without repairing a score',async()=>{
 const data=await loadGADPublicMappingEvidence(),before=JSON.stringify(data);assert.equal(Object.keys(data).length,11);assert.equal(verifyGADPublicMappingEvidence(data),true);assert.equal(JSON.stringify(data),before);
 const mutations=[
  d=>d['refsnp.json'].refsnp_id='1',
  d=>d['GRCh37-variation.json'].mappings.push(d['GRCh37-variation.json'].mappings[0]),
  d=>d['GRCh38-variation.json'].mappings.find(m=>m.seq_region_name==='19').strand=-1,
  d=>d['GRCh37-overlap.json'].push({...d['GRCh37-overlap.json'][0],id:'rs1'}),
  d=>d['GRCh38-overlap.json'][0].alleles=['C','T'],
  d=>d['GRCh37-sequence.json'].seq='C'+d['GRCh37-sequence.json'].seq.slice(1),
  d=>d['GRCh38-sequence.json'].id='chromosome:GRCh37:19:39907475:39907675:1',
  d=>d['GRCh38-map-0.json'].mappings=[],
  d=>d['GRCh37-map-100.json'].mappings[0].mapped.start++,
  d=>d['GRCh38-map-100.json'].mappings[0].mapped.strand=-1,
  d=>d['refsnp.json'].primary_snapshot_data.placements_with_allele[0].alleles[1].allele.spdi.inserted_sequence='T'
 ];
 for(const mutate of mutations){const changed=structuredClone(data);mutate(changed);assert.throws(()=>verifyGADPublicMappingEvidence(changed));}
});
