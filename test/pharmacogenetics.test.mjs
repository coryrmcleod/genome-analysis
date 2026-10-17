import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validatePharmacogeneticLibrary,mergePharmacogeneticLibrary} from '../public/pharmacogenetics.js';
import {analyzeText} from '../public/engine.js';
const library=JSON.parse(await readFile(new URL('../public/data/cpic-library.json',import.meta.url)));
const base=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
test('CPIC components preserve original editorial entries and reject changed source coordinates',()=>{
 validatePharmacogeneticLibrary(library);const merged=mergePharmacogeneticLibrary(base,library);
 for(const r of base.records){const x=merged.records.find(x=>x.id===r.id);assert.equal(x.effectAllele,r.effectAllele);assert.equal(x.summary,r.summary);}
 const bad=structuredClone(library);bad.records[0].pharmacogenetics.chromosomalHGVS='g.1A>G';assert.throws(()=>validatePharmacogeneticLibrary(bad));
});
test('a CPIC component can be measured without assigning a star allele, phenotype or dose',()=>{
 const c={...library,records:[library.records[0]]};for(const build of ['GRCh37','GRCh38']){const r=c.records[0],m=r.mappings[build];const vcf=`##fileformat=VCFv4.3\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n${m.chrom}\t${m.position}\t${r.id}\t${m.ref}\t${r.effectAllele}\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n`;
  const result=analyzeText(vcf,c).results[0];assert.equal(result.status,'Called');assert.equal(result.copies,1);for(const k of ['starAllele','phenotype','dose','activityScore'])assert.equal(result[k],undefined);
  assert.match(result.interpretation,/does not identify a complete star allele/);
 }
});
