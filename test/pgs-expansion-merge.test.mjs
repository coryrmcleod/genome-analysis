import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {mergePGSLibraries} from '../scripts/expand-reviewed-pgs.mjs';
const full=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
test('incremental admission preserves installed definitions and rejects replacement or mapping drift',()=>{
 const before={...full,models:full.models.slice(0,-1)},addition={...full,models:full.models.slice(-1)},snapshot=JSON.stringify(before);
 const merged=mergePGSLibraries(before,addition,'9.9.9');assert.equal(merged.models.length,full.models.length);
 assert.equal(JSON.stringify(before),snapshot);assert.deepEqual(merged.models,full.models);
 assert.throws(()=>mergePGSLibraries(full,addition,'9.9.9'),/replace/);
 const drift=structuredClone(addition);drift.targets[0].mappings.GRCh38.position++;
 assert.throws(()=>mergePGSLibraries(before,drift,'9.9.9'),/mapping changed/);
 for(const b of ['GRCh37','GRCh38'])assert.equal(new Set(merged.referenceSources[b].map(s=>s.url+'|'+s.sha256)).size,merged.referenceSources[b].length);
});
