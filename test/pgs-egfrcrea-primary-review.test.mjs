import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url))),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const proof=read('./fixtures/pgs/primary/Li2017-eGFRcrea-complete-review.json'),library=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');

test('complete kidney-function models preserve every published primary coefficient at source reporting precision',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/Li2017-eGFRcrea-complete.csv.gz',import.meta.url));
 assert.equal(hash(bytes),proof.coefficient.source.sha256);
 const lines=gunzipSync(bytes).toString().trim().split(/\r?\n/),columns=lines.shift().split(',');
 assert.deepEqual(columns,['chr','bp_hg19','rsID','allele1','allele2','beta','se','pval','N','1KG_EUR_MAF','ExAC_EUR_MAF']);
 assert.equal(lines.length,132496);assert.equal(lines.length,proof.coefficient.completeRowsReadThroughGzipEOFAndCRC);
 const coordinates=new Map();
 for(const line of lines){assert.ok(!line.includes('"'));const values=line.split(',');assert.equal(values.length,columns.length);const row=Object.fromEntries(columns.map((key,i)=>[key,values[i]])),key=row.chr+':'+row.bp_hg19;if(!coordinates.has(key))coordinates.set(key,[]);coordinates.get(key).push(row);}
 const pageBytes=fs.readFileSync(new URL('./fixtures/pgs/primary/Cystatin-ckdgen-Li2017.html',import.meta.url));assert.equal(hash(pageBytes),proof.coefficient.sourceCodingConvention.sha256);assert.match(pageBytes.toString(),/allele1: coded allele/);assert.match(pageBytes.toString(),/rounded to 2 significant digits/);
 const complement=value=>[...value].map(a=>({A:'T',T:'A',C:'G',G:'C'})[a]).join('');
 for(const audit of proof.coefficient.audits){
  const model=library.models.find(m=>m.id===audit.id);assert.ok(model);assert.equal(model.variantCount,audit.terms);assert.equal(model.variants.length,audit.terms);assert.equal(model.sourceFiles.original.sha256,audit.originalSHA256);
  const originalBytes=fs.readFileSync(new URL('./fixtures/pgs/'+audit.id+'.txt.gz',import.meta.url));assert.equal(hash(originalBytes),audit.originalSHA256);const original=parseScoringFile(gunzipSync(originalBytes).toString(),{allowCoordinateIds:true});assert.equal(original.rows.length,audit.terms);assert.equal(original.metadata.genome_build,'GRCh37');
  original.rows.forEach((term,index)=>{
   const reviewed=audit.comparisons[index],variant=model.variants[index],found=coordinates.get(term.chr_name+':'+term.chr_position);assert.equal(found.length,1);const source=found[0];assert.deepEqual(source,reviewed.matches[0].source.row);
   assert.equal(variant.weightText,term.effect_weight);assert.equal(variant.weight,Number(source.beta));assert.equal(Number(term.effect_weight),Number(source.beta));
   assert.deepEqual(variant.sourceCoordinate,{build:'GRCh37',chrom:term.chr_name,position:Number(term.chr_position)});
   assert.equal(variant.sourceEffectAllele,term.effect_allele);assert.equal(variant.sourceOtherAllele,term.other_allele);
   const exact=term.effect_allele===source.allele1&&term.other_allele===source.allele2,complementary=term.effect_allele===complement(source.allele1)&&term.other_allele===complement(source.allele2);assert.ok(exact||complementary);
  });
 }
});

test('kidney-function evaluation scope preserves quantitative coefficients and withholds incompatible full-model reference comparisons',()=>{
 const exact=read('../public/data/pgs-score-reference.json'),sensitivity=read('../public/data/pgs-score-sensitivity.json');
 for(const audit of proof.evaluation.audits){
  const model=library.models.find(m=>m.id===audit.id),record=evidence.models.find(m=>m.id===audit.id);assert.equal(record.development.metadataSource.sha256,audit.metadataSHA256);assert.equal(record.sources.length,1);assert.equal(record.sources[0].sha256,audit.evaluationSHA256);
  const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/pgs/evaluation/'+audit.id+'-'+audit.evaluationSHA256+'.json',import.meta.url)));assert.deepEqual(raw.results,[audit.completeDepositedEvaluation]);assert.equal(raw.next,null);assert.equal(raw.count,1);
  const deposited=raw.results[0],beta=deposited.performance_metrics.effect_sizes[0].estimate,r2=deposited.performance_metrics.othermetrics[0].estimate;assert.equal(r2,audit.primaryS4CompleteRow[12]);assert.equal(Number(Math.exp(beta).toFixed(3)),Number(audit.primaryS4CompleteRow[9].split(';')[0]));assert.notEqual(Number(audit.legacyAuthorReleaseCompleteRow.pseudo_r2),r2);
  assert.match(model.coverageContext,/distinct outcomes and scales/);assert.match(model.coverageContext,/standardized PRS/);assert.match(model.coverageContext,/does not predict creatinine concentration/);
  assert.equal(exact.models.find(m=>m.id===audit.id).status,'Unavailable');const bounds=sensitivity.models.find(m=>m.id===audit.id);assert.equal(bounds.status,'Unavailable');assert.deepEqual(bounds.excludedTerms,['rs7130086','rs4668356']);assert.ok(bounds.excludedTermDetails.every(r=>r.reason==='A reference sample carries an allele outside the model'));
 }
});
