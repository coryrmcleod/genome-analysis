import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {SOURCE_DEFINITION_EXCLUSIONS,verifySourceDefinition,verifyLibrarySourceDefinitions} from '../scripts/pgs-source-definition-exclusions.mjs';
test('bariatric score construction conflict retains complete-source review requirements',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('./fixtures/pgs/primary/Bariatric-comparison.json',import.meta.url)));
 const hold=SOURCE_DEFINITION_EXCLUSIONS.PGS004864;
 for(const [name,digest]of [['Bariatric-supplement.pdf',hold.supplementSha256],['Bariatric-source.txt.gz',hold.originalSha256]])assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./fixtures/pgs/primary/'+name,import.meta.url))).digest('hex'),digest);
 assert.equal(proof.sourceSha256,hold.originalSha256);assert.equal(proof.primarySha256,hold.supplementSha256);
 assert.equal(proof.terms,186);assert.equal(proof.matchedOddsRows,186);assert.deepEqual(proof.differences,[]);
 assert.ok(proof.rankReversalExample.primaryOddsWeightedChange>0);
 assert.ok(proof.rankReversalExample.depositedLogOddsWeightedChange<0);
 const meta={id:'PGS004864',publication:{PMID:30185664}};
 assert.throws(()=>verifySourceDefinition(meta,hold.originalSha256),/formulas can reverse score ordering/);
 assert.throws(()=>verifySourceDefinition(meta,'a'.repeat(64)),/source re-review/);
 assert.throws(()=>verifySourceDefinition({...meta,publication:{PMID:123}},hold.originalSha256),/source re-review/);
});
test('previously staged definitions are checked again against current source holds',()=>{
 const library=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 assert.equal(verifyLibrarySourceDefinitions(library),library);
 const hold=SOURCE_DEFINITION_EXCLUSIONS.PGS004864;
 const staged={models:[...library.models,{id:'PGS004864',publication:{PMID:30185664},sourceFiles:{original:{sha256:hold.originalSha256}}}]};
 const before=JSON.stringify(staged);
 assert.throws(()=>verifyLibrarySourceDefinitions(staged),/primary-source definition unresolved/);
 assert.equal(JSON.stringify(staged),before);
 staged.models.at(-1).sourceFiles.original.sha256='a'.repeat(64);
 assert.throws(()=>verifyLibrarySourceDefinitions(staged),/source re-review/);
});
