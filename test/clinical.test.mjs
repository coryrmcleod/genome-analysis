import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateClinicalLibrary,mergeClinicalLibrary,clinicalFindings} from '../public/clinical.js';
import {analyzeText} from '../public/engine.js';
const clinical=JSON.parse(await readFile(new URL('../public/data/clinical-library.json',import.meta.url)));
const base=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
test('ClinVar library retains dated allele-specific expert assertions and base editorial records',()=>{
 validateClinicalLibrary(clinical);const merged=mergeClinicalLibrary(base,clinical);
 for(const r of base.records){const x=merged.records.find(x=>x.id===r.id);for(const k of ['summary','priority','effectAllele','evidence'])assert.deepEqual(x[k],r[k]);}
 for(const mutate of [r=>r.clinvar[0].classification='Uncertain_significance',r=>r.clinvar[0].reviewStatus='criteria_provided_single_submitter',r=>r.clinvar[0].allele=r.mappings.GRCh38.ref]){const c=structuredClone(clinical);mutate(c.records[0]);assert.throws(()=>validateClinicalLibrary(c));}
});
test('ClinVar calls match exact alleles on both builds, preserve missingness and gate consumer input',()=>{
 const r=clinical.records.find(r=>r.clinvar.length>1),c={...clinical,records:[r]};
 for(const build of ['GRCh37','GRCh38']){
  const m=r.mappings[build],a=r.clinvar[1].allele,alts=m.alleles.filter(x=>x!==m.ref),index=[m.ref,...alts].indexOf(a);
  const header=`##fileformat=VCFv4.3\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tTEST\n`;
  const row=[m.chrom,m.position,r.id,m.ref,alts.join(','),80,'PASS','.', 'GT:GQ:DP',`0/${index}:60:30`].join('\t');
  const result=analyzeText(header+row,c).results[0];
  for(const f of result.clinicalFindings)assert.equal(f.copies,f.allele===a?1:0);
  for(const text of [header+row.replace(':60:30',':5:30'),header+row.replace(`0/${index}:60:30`,'./.:60:30'),header+row.replace('\t'+m.position+'\t','\t'+(m.position+1)+'\t')])assert.ok(analyzeText(text,c).results[0].clinicalFindings.every(f=>f.copies===null));
  assert.ok(clinicalFindings(result,'23andMe').every(f=>f.copies===null));
  assert.ok(result.clinicalFindings.every(f=>!f.interpretation.includes(f.conditions)));
 }
});
