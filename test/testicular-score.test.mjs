import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
import {verifyLogOddsWeights} from '../scripts/pgs-weight-evidence.mjs';
import {diseaseContext,DISEASE_MODELS} from '../public/disease-scores.js';
const source=gunzipSync(fs.readFileSync(new URL('./fixtures/pgs/PGS000086.txt.gz',import.meta.url))).toString();
test('testicular score retains 52 verified log odds weights and only reviewed coordinate annotations',()=>{
 const parsed=parseScoringFile(source);assert.equal(parsed.rows.length,52);assert.equal(verifyLogOddsWeights(parsed.rows).verifiedRows,52);
 for(const replacement of ['Variant info (UK Biobank) = 1:9713387-T','Variant info (UK Biobank) = 1:9713386-G','Only score carriers','Variant info (UK Biobank) = 1:9713386-T; double weight'])assert.throws(()=>parseScoringFile(source.replace('Variant info (UK Biobank) = 1:9713386-T',replacement)));
 assert.throws(()=>parseScoringFile(source.replace('pgs_id=PGS000086','pgs_id=PGS000001')));
});
test('testicular disease context distinguishes susceptibility from cancer probability',()=>{
 assert.equal(DISEASE_MODELS.PGS000086,'Cancer');const context=diseaseContext('PGS000086');assert.match(context,/Higher scores indicate greater genetic susceptibility/);assert.match(context,/not with an age-matched clinical cohort/);assert.match(context,/neither is a probability of cancer/);assert.equal(diseaseContext('PGS000034'),'');
});
