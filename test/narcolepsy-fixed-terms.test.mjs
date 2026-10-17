import test from 'node:test';import assert from 'node:assert/strict';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
import {NARCOLEPSY_FIXED_METHOD,verifyNarcolepsyFixedRows,verifyNarcolepsyFixedMethod} from '../scripts/narcolepsy-fixed-terms.mjs';
const head='#pgs_id=PGS000757\n#pgs_name=GRS4_Nar\n#weight_type=Unweighted\n#variants_number=5\nrsID\tchr_name\teffect_allele\tother_allele\teffect_weight\tvariant_description\n';
const lines=['rs2854536\t7\tT\tC\t1\t','rs10995245\t10\tA\tG\t1\t','rs1154155\t14\tT\tG\t1\t','rs2834188\t21\tA\tG\t1\tProxy for rs2252931, r^2 = 0.999','rs9274477\t6\tA\tG\t1\t'];
test('only complete exact GRS4 author-selected terms permit the one fixed provenance annotation',()=>{
 const text=head+lines.join('\n'),options={reviewedNarcolepsyFixedTerms:true};assert.throws(()=>parseScoringFile(text));
 const p=parseScoringFile(text,options);assert.equal(p.rows.length,5);assert.equal(verifyNarcolepsyFixedRows(p.metadata,p.rows),true);
 for(const replacement of [['PGS000757','PGS000756'],['GRS4_Nar','GRS3_Nar'],['Unweighted','beta'],['rs2834188','rs2252931'],['r^2 = 0.999','r^2 = 0.998'],['21\tA\tG','21\tG\tA'],['\t1\tProxy','\t0.9\tProxy'],['rs2854536\t7','rs2854536\t8']])assert.throws(()=>parseScoringFile(text.replace(...replacement),options));
 assert.throws(()=>parseScoringFile(head.replace('number=5','number=4')+lines.slice(0,4).join('\n'),options));
 assert.throws(()=>parseScoringFile(text.replace('rs9274477','rs2854536'),options));
 assert.throws(()=>parseScoringFile(text+'\nrs1\t1\tA\tG\t1\t',options));
});
test('fixed GRS4 method requires exact original and primary document hashes',()=>{
 const e=NARCOLEPSY_FIXED_METHOD,meta={id:e.id,name:'GRS4_Nar',publication:{PMID:32175396},weight_type:'Unweighted',variants_number:5,matches_publication:true};assert.deepEqual(verifyNarcolepsyFixedMethod(meta,e.originalSha256,e.sourceSha256),e);
 for(const patch of [{id:'PGS000756'},{name:'GRS3_Nar'},{publication:{PMID:1}},{weight_type:'NR'},{variants_number:32},{matches_publication:false}])assert.throws(()=>verifyNarcolepsyFixedMethod({...meta,...patch},e.originalSha256,e.sourceSha256));
 assert.throws(()=>verifyNarcolepsyFixedMethod(meta,'0'.repeat(64),e.sourceSha256));assert.throws(()=>verifyNarcolepsyFixedMethod(meta,e.originalSha256,'0'.repeat(64)));
});
