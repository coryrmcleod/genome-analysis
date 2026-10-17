import test from 'node:test';import assert from 'node:assert/strict';
import {ASD_ADDITIVE_METHOD as e,verifyASDAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';
import {parseScoringFile,coordinateVariantIdentity} from '../scripts/import-pgs-library.mjs';

test('autism coordinate ambiguity reports every compatible identity without selecting a same-position record',()=>{
 const row={rsID:'coordinate:GRCh37:14:101159975',chr_name:'14',chr_position:'101159975',effect_allele:'T',other_allele:'C'};
 const ids=['rs2139454386','rs73358778','rs2139454379','rs2139454381'];
 const hits=ids.map(id=>({id,source:'dbSNP',assembly_name:'GRCh37',strand:1,seq_region_name:'14',start:101159975,end:101159975,alleles:['C','T']}));
 const expected='Coordinate-only term has no unique compatible dbSNP identity: '+row.rsID+'; compatible IDs: '+[...ids].sort().join(', ');
 for(const records of [hits,[...hits].reverse()])assert.throws(()=>coordinateVariantIdentity(row,'GRCh37',records),{message:expected});
 assert.throws(()=>coordinateVariantIdentity(row,'GRCh38',hits),{message:'Coordinate-only term has no unique compatible dbSNP identity: '+row.rsID+'; compatible IDs: none'});
 assert.equal(coordinateVariantIdentity(row,'GRCh37',[hits[0],hits[0]]),ids[0]);
});
test('autism additive-method review pins source, publication and exact unmodified weights without inventing units',()=>{
 const meta={id:e.id,publication:{PMID:Number(e.publicationPMID)},matches_publication:true,weight_type:'NR'};
 assert.deepEqual(verifyASDAdditiveMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const bad of [{...meta,id:'PGS005393'},{...meta,weight_type:'beta'},{...meta,matches_publication:false}])assert.throws(()=>verifyASDAdditiveMethod(bad,e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyASDAdditiveMethod(meta,'0'.repeat(64),e.sourceSha256));
 assert.throws(()=>verifyASDAdditiveMethod(meta,e.originalSha256,'0'.repeat(64)));
});
test('reviewed autism source identifiers cannot override coordinates, alleles or inheritance',()=>{
 const head='#pgs_id=PGS000327\n#variants_number=1\n#genome_build=GRCh37\nrsID\tchr_name\tchr_position\teffect_allele\tother_allele\teffect_weight\tvariant_description\n';
 const row='rs123\t1\t100\tA\tG\t0.1\tvariant_id = rs123m\n';
 assert.equal(parseScoringFile(head+row).rows[0].effect_allele,'A');
 assert.equal(parseScoringFile(head+row.replace('rs123m','rs123mm')).rows.length,1);
 assert.throws(()=>parseScoringFile(head+row.replace('rs123m','rs456m')));
 assert.throws(()=>parseScoringFile(head.replace('PGS000327','PGS999999')+row));
 const coordinate='\t1\t100\tA\tG\t0.1\tvariant_id = chr1:100\n';
 assert.equal(parseScoringFile(head+coordinate,{allowCoordinateIds:true}).rows[0].rsID,'coordinate:GRCh37:1:100');
 assert.equal(parseScoringFile(head+coordinate.replace('chr1:100','chr1:100m'),{allowCoordinateIds:true}).rows.length,1);
 assert.throws(()=>parseScoringFile(head+coordinate.replace('chr1:100','chr1:101'),{allowCoordinateIds:true}));
 assert.throws(()=>parseScoringFile(head+row.replace('variant_id = rs123m','only if homozygous')));
});
