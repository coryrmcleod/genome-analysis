import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {validateResearchLibrary,mergeResearchLibrary} from '../public/research-library.js';
const base=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url)));
function fixture(){const r=structuredClone(base.records.find(r=>r.association));return {version:'synthetic',retrievedAt:base.retrievedAt,records:[r]};}
test('research additions preserve existing editorial and clinical records at shared IDs',()=>{
 const l=fixture(),merged=mergeResearchLibrary(base,l);assert.equal(merged.records.length,base.records.length);assert.deepEqual(merged.records.find(r=>r.id===l.records[0].id),base.records.find(r=>r.id===l.records[0].id));
});
test('research linkage requires the exact trait, allele, strong association and matched publication',()=>{
 validateResearchLibrary(fixture());for(const mutate of [r=>r.association.trait='different endpoint',r=>r.association.reportedAllele='N',r=>r.association.pvalue='0.5',r=>r.literature=[],r=>r.priority=3]){const l=fixture();mutate(l.records[0]);assert.throws(()=>validateResearchLibrary(l));}
});
