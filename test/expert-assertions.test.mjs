import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {validateExpertAssertions,attachExpertAssertions,expertClassificationDifference} from '../public/expert-assertions.js';import {selectExpertAssertions,EREPO_COLUMNS} from '../scripts/erepo-source.mjs';
const clinical=JSON.parse(readFileSync(new URL('../public/data/clinical-library.json',import.meta.url))),evidence=JSON.parse(readFileSync(new URL('../public/data/expert-assertion-library.json',import.meta.url)));
test('disease-specific evidence preserves source disagreement and cannot replace the original clinical classification',()=>{
 validateExpertAssertions(evidence);const annotated=attachExpertAssertions(clinical,evidence),uncertain=evidence.records.find(r=>r.classification==='Uncertain Significance');assert.ok(uncertain);
 const before=clinical.records.flatMap(r=>r.clinvar).find(a=>a.variationId===uncertain.variationId),after=annotated.records.flatMap(r=>r.clinvar).find(a=>a.variationId===uncertain.variationId);
 assert.equal(after.classification,before.classification);assert.ok(after.expertAssertions.some(a=>a.classification==='Uncertain Significance'));assert.equal(expertClassificationDifference(after.classification,'Uncertain Significance'),true);assert.ok(!('expertAssertions'in before));
 assert.ok(evidence.records.every(r=>!('genotype'in r)&&!('summary'in r)));assert.equal(annotated.expertAssertionProvenance.sourceSha256,evidence.sourceSha256);
});
test('a matching ClinVar ID alone cannot attach a mismatched genomic allele',()=>{
 const changed=structuredClone(evidence),r=changed.records[0];r.position++;r.genomicHGVS=r.genomicHGVS.replace(/:g\.\d+/,':g.'+r.position);validateExpertAssertions(changed);assert.throws(()=>attachExpertAssertions(clinical,changed),/does not match/);
 for(const mutate of [l=>l.records[0].retracted=true,l=>l.records[0].url='https://example.com/assertion',l=>l.records.push(l.records[0]),l=>l.records[0].genomicHGVS='NC_000001.1:g.1A>G']){const l=structuredClone(evidence);mutate(l);assert.throws(()=>validateExpertAssertions(l));}
});
test('source admission excludes retracted, unconfirmed and wrong-HGVS records and rejects malformed rows',()=>{
 const e=evidence.records[0],r=clinical.records.find(r=>r.clinvar.some(a=>a.variationId===e.variationId));
 const values=['',e.variationId,e.alleleRegistryId||'',e.genomicHGVS,e.gene,e.disease,e.mondo,e.inheritance,e.classification,e.evidenceMet.join(','),e.evidenceNotMet.join(','),'Not copied',e.pmids.join(','),e.panel,e.guidelineURL,e.approvalDate,e.publishedDate,'false',e.url,e.uuid];
 const parse=v=>selectExpertAssertions(EREPO_COLUMNS.join('\t')+'\n'+v.join('\t')+'\n',{records:[r]},evidence.assemblyReport.accessions);
 assert.equal(parse(values).records.length,1);
 for(const state of ['true','']){const v=values.slice();v[17]=state;assert.equal(parse(v).records.length,0);}
 const mismatch=values.slice();mismatch[3]='NC_000001.1:g.1A>G';assert.equal(parse(mismatch).audit.identityMismatch.length,1);
 assert.throws(()=>parse(values.slice(1)),/Malformed/);
});

test('normalized expert indels attach only to the same representation and reference FASTA',()=>{
 const indels=JSON.parse(readFileSync(new URL('../public/data/short-variant-library.json',import.meta.url))),annotated=attachExpertAssertions(indels,evidence),record=annotated.records.find(r=>r.clinvar[0].expertAssertions.length);
 assert.ok(record);assert.equal(record.clinvar[0].expertAssertions[0].alt,record.clinvar[0].allele);assert.ok(evidence.indelNormalization.admitted>0);
 assert.throws(()=>attachExpertAssertions({...indels,referenceSha256:'0'.repeat(64)},evidence),/does not match/);
 const changed=structuredClone(indels),r=changed.records.find(r=>r.id===record.id);r.mappings.GRCh38.position++;assert.throws(()=>attachExpertAssertions(changed,evidence),/does not match/);
});
