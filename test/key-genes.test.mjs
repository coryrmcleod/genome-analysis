import test from 'node:test';import assert from 'node:assert/strict';
import {KEY_GENES,keyGeneSummary} from '../public/key-genes.js';
import {readFileSync} from 'node:fs';
test('key gene profiles include requested genes and two sourced explanatory paragraphs',()=>{
 for(const gene of ['BRCA1','BRCA2','APOE'])assert.ok(KEY_GENES.some(e=>e.genes.includes(gene)));
 for(const e of KEY_GENES){assert.equal(e.paragraphs.length,2);assert.ok(e.sources.length);assert.ok(e.sources.every(s=>s.url.startsWith('https://')));}
});

test('every admitted clinical gene has a sourced profile and profile identifiers are unique',()=>{
 const genes=new Set(KEY_GENES.flatMap(g=>g.genes));assert.equal(new Set(KEY_GENES.map(g=>g.id)).size,KEY_GENES.length);
 for(const name of ['clinical-library','short-variant-library']){const l=JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));for(const r of l.records)for(const gene of r.gene.split(/\s*\/\s*/))assert.ok(genes.has(gene),'Missing profile for '+gene);}
});
test('key gene counts use exact labels and quality-gated classified alleles, not gene-wide negatives',()=>{
 const e=KEY_GENES.find(g=>g.id==='BRCA1');const records=[{id:'rs1',gene:'BRCA1',status:'Called',alleles:['A','G'],clinicalFindings:[{allele:'G',copies:1}]},{id:'rs2',gene:'BRCA1',status:'No call',alleles:null,clinicalFindings:[{allele:'G',copies:1}]},{id:'rs3',gene:'BRCA10',status:'Called',alleles:['A','G'],clinicalFindings:[{allele:'G',copies:1}]}];
 const s=keyGeneSummary(e,records);assert.equal(s.listedVariants,2);assert.equal(s.calledVariants,1);assert.equal(s.classifiedAlleleMatches,1);assert.deepEqual(s.variantIds,['rs1','rs2']);assert.match(s.scope,/not the gene/);
 assert.equal(keyGeneSummary(e,[]).listedVariants,0);
});
