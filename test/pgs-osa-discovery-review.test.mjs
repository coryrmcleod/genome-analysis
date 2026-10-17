import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PGS_OSA_DISCOVERY_REVIEWS} from '../public/pgs-osa-discovery-reviews.js';
import {osaDiscoveryReview,osaDiscoveryHtml} from '../public/pgs-osa-discovery-review.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
import {calculatePGS} from '../public/pgs.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const lib=read('../public/data/pgs-library.json'),evidence=read('../public/data/pgs-evaluation.json');
test('OSA discovery review preserves distinct cohorts, complete coefficient comparisons and unresolved primary directions',()=>{
 const proof=read('./fixtures/pgs/primary/OSA-discovery-source-review.json');assert.deepEqual(PGS_OSA_DISCOVERY_REVIEWS,proof.reviews);
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/primary/OSA-discovery-supplementary-tables.xlsx',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.primaryIdentityAndSampleProof.tableSource.sha256);
 const n=proof.primaryIdentityAndSampleProof.MVPParticipantTable;assert.equal(n.sexCombinedCount,568576);assert.equal(n.completeRows[4].slice(1,5).reduce((a,b)=>a+b,0),568576);
 let totalTerms=0,totalRows=0;
 for(const review of proof.reviews){
  const model=lib.models.find(m=>m.id===review.id),bound=evidence.models.find(m=>m.id===model.id),before=JSON.stringify({model,bound}),comparison=proof.completeCoefficientComparisons.models.find(m=>m.id===model.id);
  assert.equal(osaDiscoveryReview(model,bound).status,'confirmed');assert.equal(review.MVPStudyN,568576);assert.equal(review.depositedDiscoveryN,916696);assert.equal(model.studySamples.variantAssociation.reduce((s,r)=>s+r.sample_number,0),916696);
  assert.deepEqual(comparison.completeInstalledModel,model);assert.equal(comparison.terms.length,model.variantCount);totalTerms+=comparison.terms.length;
  for(const term of comparison.terms){
   assert.deepEqual(term.completeInstalledTerm,model.variants.find(v=>v.id===term.completeInstalledTerm.id));assert.ok(term.allMatchingPrimaryRows.length);totalRows+=term.allMatchingPrimaryRows.length;
   for(const row of term.allMatchingPrimaryRows){assert.equal(row.allelePairsAgree,true);assert.equal(row.coordinateComparisons.GRCh37.primaryPositionMatches,true);const [,,,position,a1,a2,,OR]=row.completePrimaryRow;assert.equal(position,row.coordinateComparisons.GRCh37.mapping.position);assert.equal(OR,row.primaryOR);assert.deepEqual(new Set([a1,a2]),new Set([term.completeInstalledTerm.effectAllele,term.completeInstalledTerm.otherAllele]));assert.equal(Math.round(Math.exp(term.completeInstalledTerm.effectAllele===a1?term.completeInstalledTerm.weight:-term.completeInstalledTerm.weight)*1e6)/1e6===OR,row.depositedExponentRounded6MatchesPrimaryOR);}
  }
  for(const mutate of [m=>m.variants[0].weight+=0.001,m=>m.variants[0].effectAllele='X',m=>m.studySamples.variantAssociation[0].sample_number++,m=>m.sourceFiles.metadata.sha256='a'.repeat(64),m=>m.publication.PMID=0]){const changed=structuredClone(model);mutate(changed);assert.equal(osaDiscoveryReview(changed,bound).status,'changed');assert.match(osaDiscoveryHtml(changed,bound),/needs re-review/);}
  const changed=structuredClone(bound);changed.development.metadataSource.sha256='b'.repeat(64);assert.equal(osaDiscoveryReview(model,changed).status,'changed');
  const html=evaluationHtml(model,evidence);assert.match(html,/916,696/);assert.match(html,/568,576/);assert.match(html,/not establish personal sleep-apnea risk/);assert.equal(JSON.stringify({model,bound}),before);
  for(const build of ['GRCh37','GRCh38']){
   const report=calculatePGS({...lib,models:[model]},{build,format:'VCF',results:[]})[0],saved=JSON.parse(JSON.stringify(report));
   assert.equal(osaDiscoveryReview(saved,bound).status,'confirmed');assert.match(evaluationHtml(saved,evidence),/Keep the discovery samples distinct/);assert.doesNotMatch(evaluationHtml(saved,evidence),/discovery context needs re-review/);
   saved.terms[0].weight+=0.001;assert.equal(osaDiscoveryReview(saved,bound).status,'changed');
  }
 }
 assert.equal(totalTerms,23);assert.equal(totalRows,39);
 const adjusted=proof.reviews.find(r=>r.id==='PGS012521');assert.deepEqual(adjusted.unresolvedSupplementaryDirectionDifferences,['rs34179442','rs592333']);assert.equal(adjusted.allTermsCompatibleAtPublishedORPrecision,false);
 for(const row of proof.primaryMainTableDirectionContext.records){const term=adjusted.completeModel.variants.find(v=>v.id===row.id);assert.equal(term.effectAllele,row.A1);assert.equal(Math.round(Math.exp(term.weight)*100)/100,row.OR);}
 const unadjusted=proof.reviews.find(r=>r.id==='PGS012520');assert.equal(unadjusted.allTermsCompatibleAtPublishedORPrecision,true);assert.deepEqual(unadjusted.unresolvedSupplementaryDirectionDifferences,[]);
 const unrelated=lib.models.find(m=>m.id==='PGS012582'),bound=evidence.models.find(m=>m.id===unrelated.id);assert.equal(osaDiscoveryReview(unrelated,bound),null);assert.doesNotMatch(evaluationHtml(unrelated,evidence),/Keep the discovery samples distinct/);
});
