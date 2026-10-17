import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateGeneDosage,geneDosageFor,dosageMeaning} from '../public/gene-dosage.js';
import {parseDosageSource} from '../scripts/import-gene-dosage.mjs';
const library=JSON.parse(readFileSync(new URL('../public/data/gene-dosage-library.json',import.meta.url)));
test('dosage context distinguishes no evidence, unlikely, recessive and unevaluated categories',()=>{
 validateGeneDosage(library);assert.equal(geneDosageFor(['BRCA1'],library).length,1);assert.equal(geneDosageFor(['BRCA10'],library).length,0);
 assert.match(dosageMeaning('0'),/not evidence.*harmless/);assert.match(dosageMeaning('40'),/does not establish.*benign/);assert.match(dosageMeaning('30'),/not a score of 30/);assert.match(dosageMeaning('Not yet evaluated'),/not been evaluated/);
 const changed=structuredClone(library);changed.records[0].haploinsufficiency.description='No evidence available';assert.throws(()=>validateGeneDosage(changed),/evidence category/);
});
test('dosage source enforces its build and complete TSV schema while retaining multiple PMIDs',()=>{
 const header=['#Gene Symbol','Gene ID','cytoBand','Genomic Location',...['Haploinsufficiency','Triplosensitivity'].flatMap(k=>[k+' Score',k+' Description',...Array.from({length:6},(_,i)=>k+' PMID'+(i+1))]),'Date Last Evaluated','Haploinsufficiency Disease ID','Triplosensitivity Disease ID'].join('\t');
 const row=['BRCA1','672','17q21.31','chr17:43044295-43170327','3','Sufficient evidence for dosage pathogenicity','12345; 23456','','','','','','0','No evidence available','','','','','','','2021-09-23','MONDO:0700268',''].join('\t');
 const source='#07 Sep,2026\n#Genomic Locations are reported on GRCh38 (hg38)\n'+header+'\n'+row+'\n';
 assert.deepEqual(parseDosageSource(source,['BRCA1']).records[0].haploinsufficiency.pmids,['12345','23456']);
 assert.throws(()=>parseDosageSource(source.replace('GRCh38','GRCh37'),['BRCA1']),/build/);assert.throws(()=>parseDosageSource(source.replace(row,row+'\textra'),['BRCA1']),/Malformed/);
});
