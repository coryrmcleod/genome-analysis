import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCandidateScreenIds} from '../scripts/pgs-candidate-screen-guard.mjs';
test('candidate screening rejects all installed or duplicate IDs before any batch downloads',()=>{
 const library={models:[{id:'PGS000001'}]};assert.deepEqual(validateCandidateScreenIds(['PGS000002'],library),['PGS000002']);
 for(const ids of [[],['PGS000002','PGS000001'],['PGS000002','PGS000002'],['invalid']])assert.throws(()=>validateCandidateScreenIds(ids,library));
});
