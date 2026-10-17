import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {CERVICAL_PGS_DELETION,reviewedPGSDeletionMappings,validateReviewedPGSDeletionTarget,validateReviewedPGSDeletionTerm} from '../public/reviewed-pgs-deletion.js';
import {CERVICAL_DELETION_FILES,loadCervicalDeletionProof} from '../scripts/cervical-deletion-proof.mjs';
import {loadCervicalResearchDefinition} from '../scripts/cervical-research-score.mjs';
test('offline deletion certificate exactly matches frozen independent evidence on both builds',async()=>{
 const proof=await loadCervicalDeletionProof(),e=CERVICAL_PGS_DELETION;assert.equal(e.originalSha256,CERVICAL_DELETION_FILES['original.txt.gz']);assert.equal(e.id,proof.canonicalId);assert.deepEqual(e.mergeChain,proof.mergeChain);
 for(const [name,sha] of Object.entries(e.files))assert.equal(sha,CERVICAL_DELETION_FILES[name],name);
 for(const build of ['GRCh37','GRCh38']){const window=JSON.parse(await readFile(new URL('./fixtures/pgs/cervical-deletion/'+build+'-sequence.json',import.meta.url)));assert.equal(e.sequence,window.seq);assert.equal(e.builds[build].windowStart,proof.proofs[build].windowStart);assert.equal(e.sequence.slice(e.builds[build].position-e.builds[build].windowStart,e.builds[build].position-e.builds[build].windowStart+3),'AGA');}
 assert.throws(()=>{e.builds.GRCh37.position=1;},TypeError);assert.throws(()=>e.mergeChain.push('1'),TypeError);
 const installed=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),model=installed.models.find(m=>m.id===e.modelId);if(model)assert.equal(model.variantCount,15);
});
test('deletion target and term certificate reject unreviewed locus, model, alleles, source bytes or weights',async()=>{
 const definition=await loadCervicalResearchDefinition(),term=definition.model.variants.find(v=>v.kind==='reviewed-deletion'),target={id:term.id,variantKind:'reviewed-pgs-deletion',effectAllele:'A',mappings:reviewedPGSDeletionMappings(),reviewedDeletion:structuredClone(CERVICAL_PGS_DELETION)},input={modelId:'PGS005165',variantCount:15,originalSha256:definition.sourceSha256,term,target};
 assert.equal(validateReviewedPGSDeletionTerm(input),term);
 for(const patch of [{id:'rs1'},{variantKind:'short-indel'},{effectAllele:'AGA'},{reviewedDeletion:{...target.reviewedDeletion,sequence:'A'.repeat(203)}},{mappings:{...target.mappings,GRCh37:{...target.mappings.GRCh37,position:31495508}}}])assert.throws(()=>validateReviewedPGSDeletionTarget({...target,...patch}),/Unreviewed/);
 for(const patch of [{modelId:'PGS001522'},{variantCount:14},{originalSha256:'bad'},{term:{...term,weight:0.318}},{term:{...term,weightText:'-.318'}},{term:{...term,sourceOtherAllele:'AGA'}},{term:{...term,reverseComplemented:true}}])assert.throws(()=>validateReviewedPGSDeletionTerm({...input,...patch}),/Unreviewed/);
});
