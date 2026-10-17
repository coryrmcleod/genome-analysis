import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {validateGeneDrugs,geneDrugsFor} from '../public/gene-drugs.js';
const source=JSON.parse(readFileSync(new URL('../public/data/gene-drug-library.json',import.meta.url)));
test('CPIC gene–drug context retains public guideline provenance without a patient phenotype',()=>{
 const l=validateGeneDrugs(source),rows=geneDrugsFor(['CYP2C19'],l);assert.ok(rows.some(r=>r.drug==='clopidogrel'));assert.ok(rows.every(r=>r.gene==='CYP2C19'&&!('genotype'in r)&&!('dose'in r)));assert.equal(geneDrugsFor(['CYP2C190'],l).length,0);
});
test('CPIC references reject provisional, retired, duplicate and untrusted guideline records',()=>{
 for(const mutate of [l=>l.records[0].provisional=true,l=>l.records[0].level='Retired',l=>l.records[0].url='https://example.com/fake',l=>l.records.push(l.records[0]),l=>l.records[0].pmids=['not a PMID']]){const l=structuredClone(source);mutate(l);assert.throws(()=>validateGeneDrugs(l));}
});
