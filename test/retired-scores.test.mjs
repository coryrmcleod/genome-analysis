import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {activeScoreModels,retiredScoreReplacements} from '../public/retired-scores.js';
const load=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url)));
test('retired definitions are strict older variant subsets and retained weights are unchanged',async()=>{
 const library=await load('public/data/pgs-library.json'),archive=await load('docs/retired-score-definitions-2026-10-01.json');
 const original=archive.artifacts.find(a=>a.file==='public/data/pgs-library.json').models;
 assert.equal(new Set(library.models.map(m=>m.id)).size,library.models.length);
 for(const retirement of archive.retirements){
  const before=original.find(m=>m.id===retirement.id),after=library.models.find(m=>m.id===retirement.replacement);
  assert.ok(!library.models.some(m=>m.id===before.id));
  assert.ok(Date.parse(after.publication.date_publication)>Date.parse(before.publication.date_publication));
  assert.ok(after.variantCount>before.variantCount);
  assert.ok(before.variants.every(v=>after.variants.some(w=>w.id===v.id)));
  assert.equal(createHash('sha256').update(JSON.stringify(after)).digest('hex'),retirement.replacementDefinitionSha256);
 }
 for(const file of ['public/data/pgs-score-reference.json','public/data/pgs-score-sensitivity.json','public/data/pgs-evaluation.json','scripts/pgs-selection.json']){
  const value=await load(file),models=Array.isArray(value)?value:value.models;
  assert.ok(models.every(m=>!retiredScoreReplacements[m.id]));
 }
});
test('saved score browsing hides an older score only when its replacement is present',()=>{
 const old={id:'PGS000208'},replacement={id:'PGS005210'},unrelated={id:'PGS004118'};
 const saved=[old,replacement,unrelated];
 assert.deepEqual(activeScoreModels(saved),[replacement,unrelated]);
 assert.deepEqual(activeScoreModels([old,unrelated]),[old,unrelated]);
 assert.equal(saved.length,3);
});
