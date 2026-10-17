import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {validateScoreReference,empiricalPercentile} from '../public/pgs-reference.js';
const bytes=fs.readFileSync('public/data/pgs-score-reference.json'),reference=validateScoreReference(JSON.parse(bytes)),proof=JSON.parse(fs.readFileSync('test/fixtures/pgs/installed-percentile-independent-corners.json'));
test('every available installed percentile distribution retains independent endpoint, centre and tie ranks',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.referenceSha256);const available=reference.models.filter(m=>m.status==='Available');assert.equal(proof.models.length,116);assert.deepEqual(proof.models.map(m=>m.id),available.map(m=>m.id));
 for(const model of proof.models){const row=available.find(m=>m.id===model.id);assert.equal(row.sampleCount,model.sampleCount);assert.equal(model.cases[0].expectedRank,0);assert.equal(model.cases.at(-1).expectedRank,100);for(const c of model.cases)assert.equal(empiricalPercentile(row.scores,c.value),c.expectedRank,`${model.id} ${c.value}`);}
});
