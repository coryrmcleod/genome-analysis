import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateGeneValidity,geneValidityFor} from '../public/gene-validity.js';import {parseCSV,importGeneValidity} from '../scripts/import-gene-validity.mjs';
test('ClinGen evidence preserves disease-specific weak and refuted classifications without assigning genotypes',()=>{
 const library=validateGeneValidity(JSON.parse(readFileSync(new URL('../public/data/gene-validity-library.json',import.meta.url))));
 assert.ok(library.records.length>=76);for(const c of ['Limited','Disputed','Refuted','No Known Disease Relationship'])assert.ok(library.records.some(r=>r.classification===c));
 const brca=geneValidityFor(['BRCA1'],library);assert.ok(brca.length);assert.ok(brca.every(r=>r.gene==='BRCA1'&&!('genotype'in r)));assert.equal(geneValidityFor(['BRCA10'],library).length,0);
 const bad=structuredClone(library);bad.records[0].url='javascript:alert(1)';assert.throws(()=>validateGeneValidity(bad));
 const duplicate=structuredClone(library);duplicate.records.push(duplicate.records[0]);assert.throws(()=>validateGeneValidity(duplicate));
});
test('ClinGen CSV parsing handles quoted commas and escaped quotes, rejecting incomplete source',()=>{
 assert.deepEqual(parseCSV('"a,b","c""d"\r\n'),[['a,b','c"d']]);assert.throws(()=>parseCSV('"unclosed'));
 assert.throws(()=>importGeneValidity(Buffer.from('not the source'),new Set(['BRCA1'])));
});
