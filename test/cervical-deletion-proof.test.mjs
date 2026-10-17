import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {CERVICAL_DELETION_FILES,loadCervicalDeletionProof} from '../scripts/cervical-deletion-proof.mjs';
test('frozen cervical deletion evidence proves exact representations, not a partial score',async()=>{
 const proof=await loadCervicalDeletionProof();assert.deepEqual(proof.mergeChain,['558000791','67426997','9279333']);assert.equal(proof.sourceWeight,'-0.318');assert.equal(proof.proofs.GRCh37.referenceSha256,proof.proofs.GRCh38.referenceSha256);assert.equal(proof.proofs.GRCh37.alternateSha256,proof.proofs.GRCh38.alternateSha256);assert.match(proof.scope,/does not verify the other 14 SNVs or authorize a partial model/);
 for(const altered of Object.keys(CERVICAL_DELETION_FILES))await assert.rejects(()=>loadCervicalDeletionProof(async name=>{const bytes=await readFile(new URL('./fixtures/pgs/cervical-deletion/'+name,import.meta.url));return name===altered?Buffer.concat([bytes,Buffer.from('changed')]):bytes;}),/hash mismatch/);
});
