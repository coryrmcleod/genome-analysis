import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validatePsychiatricGWASLibrary} from '../public/psychiatric-gwas.js';
const library=JSON.parse(readFileSync(new URL('../public/data/psychiatric-gwas-library.json',import.meta.url)));
test('psychiatric GWAS source index preserves the twelve remote PGC datasets without bundling summary statistics',()=>{
 assert.equal(validatePsychiatricGWASLibrary(library),library);assert.equal(library.datasets.length,12);assert.ok(library.scope.includes('remain remote'));
 assert.deepEqual(library.datasets.map(d=>d.id),[...new Set(library.datasets.map(d=>d.id))]);
 const installed=library.datasets.flatMap(d=>(d.installedScores||[]).map(s=>({...s,dataset:d.id})));
 assert.deepEqual(installed,[{id:'PGS000193',config:'mdd2018',sourcePMID:'29700475',dataset:'OpenMed/pgc-mdd'}]);
});
test('psychiatric GWAS index rejects an unvalidated remote source entry',()=>{
 const invalid=structuredClone(library);invalid.datasets[0].url='https://example.test/data';assert.throws(()=>validatePsychiatricGWASLibrary(invalid));
});
