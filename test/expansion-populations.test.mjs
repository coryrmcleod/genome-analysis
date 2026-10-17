import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateExpansionPopulations} from '../scripts/validate-expansion-populations.mjs';
const mapping={chrom:'1',position:100,ref:'A',alleles:['A','G']},library={targets:[{id:'rs1',mappings:{GRCh38:mapping}}]};
const fixture=()=>({populations:['EUR'],reference:{sampleCount:503},records:{rs1:{mapping:structuredClone(mapping),status:'Verified public forward mapping',populations:{EUR:{sampleCount:503,genotypes:[{genotype:'A/G',count:503,frequency:1}]}}}}});
test('expansion publication requires complete matching population artifacts',()=>{
 assert.ok(validateExpansionPopulations(fixture(),library));
 const mutations=[p=>delete p.records.rs1,p=>p.records.rs1.mapping.position++,p=>p.records.rs1.populations.EUR.genotypes[0].count--,p=>p.records.rs1.populations.EUR.genotypes[0].frequency=.5,p=>p.records.rs1.populations.EUR.genotypes[0].genotype='A/T',p=>p.records.rs1.populations.EUR.genotypes.push({...p.records.rs1.populations.EUR.genotypes[0]}),p=>p.populations.push('EAS'),p=>delete p.records.rs1.populations.EUR];
 for(const mutate of mutations){const p=fixture();mutate(p);assert.throws(()=>validateExpansionPopulations(p,library));}
 const missing=fixture();missing.records.rs1.status='No complete compatible public EUR genotypes';missing.records.rs1.populations={};assert.ok(validateExpansionPopulations(missing,library));
});
test('installed population artifact agrees with installed targets',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url)));
 validateExpansionPopulations(read('pgs-populations.json'),read('pgs-library.json'));
});
