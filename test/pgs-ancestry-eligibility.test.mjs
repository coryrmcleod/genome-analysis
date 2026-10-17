import test from 'node:test';import assert from 'node:assert/strict';
import {referenceAncestryEligibility as assess} from '../public/pgs-ancestry-eligibility.js';
import {referencePercentile} from '../public/pgs-reference.js';
import {percentileSensitivity} from '../public/pgs-sensitivity.js';
import {scoreResult} from '../public/score-insights.js';
import {migrateEuropeanSnapshot} from '../public/european-scores.js';
import {readFileSync} from 'node:fs';
const model=dist=>({ancestry:{eval:{dist}},rawSum:1.5});

test('African height and BMI comparators with complete European arithmetic retain evaluation gates',()=>{
 const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 const reference=JSON.parse(readFileSync(new URL('../public/data/pgs-score-reference.json',import.meta.url)));
 for(const id of ['PGS003837','PGS003844']){
  const deposited=library.models.find(m=>m.id===id);assert.ok(deposited,id);
  assert.equal(reference.models.find(m=>m.id===id).status,'Available');
  assert.match(deposited.coverageContext,/averaged PLINK scores/);
  assert.match(deposited.coverageContext,/adjusts for age, sex and ten/);
  const m={...deposited,rawSum:1.5,referenceComparison:{population:'EUR',point:90},referenceSensitivity:{lower:80,upper:95}},before=JSON.stringify(m);
  assert.equal(assess(m).status,'mismatch',id);
  for(const result of [referencePercentile(m,null,null),percentileSensitivity(m,null,null),scoreResult(m)])assert.equal(result.point,null,id);
  assert.equal(JSON.stringify(m),before);
 }
});

test('hippocampal definitions with European discovery or arithmetic retain East Asian evaluation gates',()=>{
 const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 for(const id of ['PGS003618','PGS003652','PGS003653','PGS003654','PGS003717','PGS003619','PGS003634','PGS003651','PGS003705','PGS003659','PGS003663','PGS003665','PGS003672','PGS003708','PGS003592']){
  const deposited=library.models.find(m=>m.id===id);assert.ok(deposited,id);
  const m={...deposited,rawSum:1.5,referenceComparison:{population:'EUR',point:90},referenceSensitivity:{lower:80,upper:95}};
  assert.equal(assess(m).status,'mismatch',id);
  for(const result of [referencePercentile(m,null,null),percentileSensitivity(m,null,null),scoreResult(m)])assert.equal(result.point,null,id);
  assert.equal(m.rawSum,1.5);
 }
});

test('primary Indigenous evaluation evidence resolves OTH only for the reviewed diabetes definitions',()=>{
 const m={...model({OTH:60,GME:40}),id:'PGS003733',publication:{PMID:36862161},referenceComparison:{point:90,population:'EUR'},referenceSensitivity:{lower:80,upper:95}};
 const before=JSON.stringify(m);
 assert.equal(assess(m).status,'mismatch');
 for(const result of [referencePercentile(m,null,null),percentileSensitivity(m,null,null),scoreResult(m)]){assert.equal(result.point,null);assert.equal(result.lower,null);assert.equal(result.upper,null);}
 assert.equal(assess({...m,id:'PGS000001'}).status,'unknown');
 assert.equal(assess({...m,publication:{PMID:1}}).status,'unknown');
 assert.equal(assess({...m,ancestry:{eval:{dist:{OTH:60,EUR:40}}}}).status,'represented');
 assert.equal(assess({...m,ancestry:{eval:{dist:{OTH:60,NR:40}}}}).status,'unknown');
 assert.equal(JSON.stringify(m),before);
});
test('evaluation population gate distinguishes known mismatch, representation and unknown metadata',()=>{
 for(const dist of [{EAS:100},{SAS:100},{AFR:50,AMR:50}])assert.equal(assess(model(dist)).status,'mismatch');
 for(const dist of [{EUR:100},{EUR:0.1,EAS:99.9},{MAE:100}])assert.equal(assess(model(dist)).status,'represented');
 for(const dist of [{},{NR:100},{EAS:50,NR:50},{MAO:100},{OTH:100},{EAS:50},{EAS:NaN},{EAS:'100'},{EAS:-1}])assert.equal(assess(model(dist)).status,'unknown');
 assert.equal(assess({ancestry:{gwas:{dist:{EAS:100}}}}).status,'unknown');
 assert.equal(assess(model({EAS:100}),'EAS').status,'represented');
});
test('mismatched exact, sensitivity and cached report ranks are withheld without changing the raw score',()=>{
 const m={...model({EAS:100}),referenceComparison:{population:'EUR',point:90,lower:90,upper:90,measured:true},referenceSensitivity:{lower:10,upper:95}},before=JSON.stringify(m);
 for(const result of [referencePercentile(m,null,null),percentileSensitivity(m,null,null),scoreResult(m)]){assert.equal(result.point,null);assert.equal(result.lower,null);assert.equal(result.upper,null);}
 assert.equal(JSON.stringify(m),before);assert.equal(m.rawSum,1.5);
 assert.match(referencePercentile(m,null,null).reason,/No personal ancestry is inferred/);
});
test('reopening an old EUR snapshot removes mismatched cached ranks, preserves calls and explains the change',()=>{
 const m={...model({EAS:100}),id:'PGS018991',terms:[{id:'rs1',weight:1,contribution:1.5,status:'Called'}],hypotheticalEstimate:{population:'EUR',percentile:91},referenceComparison:{population:'EUR',point:91,lower:91,upper:91,measured:true},referenceSensitivity:{lower:80,upper:95},percentile:91};
 const calls=JSON.stringify(m.terms),report={polygenicScores:[m],warnings:[]};
 assert.equal(migrateEuropeanSnapshot(report,null,null,null),0);
 assert.equal(m.rawSum,1.5);assert.equal(JSON.stringify(m.terms),calls);assert.equal(m.percentile,null);assert.equal(m.hypotheticalEstimate.percentile,null);
 assert.equal(m.referenceComparison.point,null);assert.equal(m.referenceSensitivity.lower,null);assert.match(report.warnings[0],/raw sums and measured calls were preserved/);
 migrateEuropeanSnapshot(report,null,null,null);assert.equal(report.warnings.length,1);
});
