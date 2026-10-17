import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseScoringFile,publicationEvidence} from '../scripts/import-pgs-library.mjs';
import {SOURCE_DEFINITION_EXCLUSIONS,verifySourceDefinition,verifyLibrarySourceDefinitions} from '../scripts/pgs-source-definition-exclusions.mjs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url))),proof=read('./fixtures/pgs/primary/Height-Wood2014-complete-coefficient-review.json'),exclusion=SOURCE_DEFINITION_EXCLUSIONS.PGS002980;
test('height primary review preserves all original terms and distinguishes allele-pair disagreements from coefficient magnitudes',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/height-alias/original.txt.gz',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),exclusion.originalSha256);assert.equal(proof.originalSHA256,exclusion.originalSha256);
 const original=parseScoringFile(gunzipSync(bytes).toString(),{allowCoordinateIds:true});assert.equal(original.rows.length,2469);assert.equal(proof.comparisons.length,2469);assert.equal(proof.summary.sourceRowsReadThroughEOFAndCRC,2550858);assert.equal(proof.primarySource.sha256,'6f8e7b4163f68b4d1b28d3d401c23e5276ca4c35e67b691554e37a48d4bac59e');
 const complement=value=>[...value].map(a=>({A:'T',T:'A',C:'G',G:'C'})[a]).join('');let matched=0;
 original.rows.forEach((term,index)=>{
  const comparison=proof.comparisons[index];assert.deepEqual(comparison.originalTerm,term);assert.equal(comparison.primarySourceMatches.length,1);const source=comparison.primarySourceMatches[0].source.row;assert.equal(Math.abs(Number(term.effect_weight)),Math.abs(Number(source.b)));
  const pairs=[[source.Allele1,source.Allele2,Number(source.b)],[source.Allele2,source.Allele1,-Number(source.b)],[complement(source.Allele1),complement(source.Allele2),Number(source.b)],[complement(source.Allele2),complement(source.Allele1),-Number(source.b)]];
  const coherent=pairs.some(([effect,other,beta])=>effect===term.effect_allele&&other===term.other_allele&&beta===Number(term.effect_weight));assert.equal(comparison.oneCompatiblePrimaryRowAndCoefficient,coherent);if(coherent)matched++;
 });
 assert.equal(matched,2374);assert.equal(original.rows.length-matched,95);
});
test('height admission requires explicit source reconciliation even with an exact alias proof or publication-match flag',()=>{
 const metadata={id:'PGS002980',matches_publication:true,publication:{PMID:36152628}};
 assert.throws(()=>verifySourceDefinition(metadata,exclusion.originalSha256),/primary-source definition unresolved/);
 assert.throws(()=>publicationEvidence(metadata,{},exclusion.originalSha256),/primary-source definition unresolved/);
 for(const changed of [{...metadata,publication:{PMID:1}},{...metadata,matches_publication:false}])assert.throws(()=>verifySourceDefinition(changed,exclusion.originalSha256),/re-review|definition unresolved/);
 assert.throws(()=>verifySourceDefinition(metadata,'a'.repeat(64)),/explicit source re-review/);
 assert.throws(()=>verifyLibrarySourceDefinitions({models:[{...metadata,sourceFiles:{original:{sha256:exclusion.originalSha256}},reviewedHeightAliases:true}]}),/primary-source definition unresolved/);
 const installed=read('../public/data/pgs-library.json');assert.ok(!installed.models.some(m=>m.id==='PGS002980'));assert.equal(verifyLibrarySourceDefinitions(installed),installed);
});
