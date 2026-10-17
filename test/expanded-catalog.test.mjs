import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog} from '../public/catalog.js';
import {analyzeText} from '../public/engine.js';
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
test('100-entry panel preserves starter entries and keeps API research pending review',()=>{
  validateCatalog(catalog);assert.equal(catalog.records.length,100);
  const research=catalog.records.filter(r=>r.association);assert.equal(research.length,85);
  for(const r of research){assert.equal(r.priority,1);assert.equal(r.evidence,'Research association');assert.match(r.reviewStatus,/pending/);assert.ok(r.literature.some(p=>p.pmid===r.association.pmid));assert.equal(r.association.reportedAllele,r.effectAllele);}
});
test('all 100 exact mapped sites can be matched from synthetic VCF on both builds',()=>{
  for(const build of ['GRCh37','GRCh38']){
    const lines=[`##fileformat=VCFv4.3`,`##reference=${build}`,'#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC'];
    for(const r of catalog.records){const m=r.mappings[build],alt=m.alleles.find(a=>a!==m.ref);lines.push(`${m.chrom}\t${m.position}\t${r.id}\t${m.ref}\t${alt}\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30`);}
    const report=analyzeText(lines.join('\n'),catalog);assert.equal(report.results.length,100);assert.ok(report.results.every(r=>r.status==='Called'));
  }
});
test('catalog rejects a study attached to the wrong allele or nonexistent publication',()=>{
  for(const change of [{reportedAllele:'?'},{pmid:'999999999999'}]){const c=structuredClone(catalog);Object.assign(c.records.find(r=>r.association).association,change);assert.throws(()=>validateCatalog(c));}
});
