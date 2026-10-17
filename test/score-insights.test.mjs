import test from 'node:test';import assert from 'node:assert/strict';
import {scoreUncertainty,scoreResult,comparisonGroups} from '../public/score-insights.js';
import {uncertaintyCard,comparisonView} from '../public/score-insights-view.js';
test('excluded terms partition correctly, including zero measured contributions and signed weights',()=>{
 const m={terms:[{id:'a',weight:1,contribution:0,status:'Called'},{id:'b',weight:-2,contribution:null,status:'Quality limited'},{id:'c',weight:3,contribution:null,status:'Strand ambiguous'},{id:'d',weight:4,contribution:null,status:'Overlapping records'}]};
 const before=JSON.stringify(m),u=scoreUncertainty(m);assert.deepEqual(u.personal.map(r=>r.count),[1,1,1,0]);assert.deepEqual(u.personal.map(r=>r.weightFraction),[.2,.3,.4,0]);assert.equal(JSON.stringify(m),before);
});
test('result labels preserve measured, hypothetical, sensitivity and unavailable distinctions',()=>{
 assert.equal(scoreUncertainty({terms:[],referenceComparison:{point:0,measured:true}}).referenceOrientationTerms,0);
 assert.equal(scoreResult({referenceComparison:{point:0,measured:true,lower:0,upper:0}}).label,'Measured-score rank');
 assert.equal(scoreResult({referenceComparison:{point:50,measured:false}}).label,'Hypothetical genotype scenario');
 const s={lower:0,upper:100,scenarioSummary:{median:50,neutralReference:true}};assert.match(scoreResult({referenceSensitivity:s}).label,/neutral reference/);
 assert.equal(scoreResult({}).point,null);
});
test('comparison retains exact endpoints and never merges unrelated families or averages ranks',()=>{
 const models=[{id:'a',family:'Glucose',trait:'Fasting glucose'},{id:'b',family:'Glucose',trait:'BMI-adjusted fasting glucose'},{id:'c',family:'HbA1c',trait:'HbA1c'}];
 const groups=comparisonGroups(models);assert.equal(groups.length,1);assert.deepEqual(groups[0].models.map(m=>m.trait),['Fasting glucose','BMI-adjusted fasting glucose']);
 const adjusted=comparisonGroups([{...models[0],family:'Fasting glucose'},{...models[1],family:'Fasting glucose (BMI adjusted)'}]);assert.equal(adjusted.length,1);assert.match(adjusted[0].family,/different adjustments/);assert.equal(adjusted[0].models[1].family,'Fasting glucose (BMI adjusted)');
});
test('diagnostic and comparison HTML escape imported labels',()=>{
 const m={id:'PGS000001',name:'<script>',trait:'<img>',family:'BMI',matched:1,total:1,terms:[{id:'<script>',weight:1,contribution:null,status:'Quality limited'}]};
 assert.ok(!uncertaintyCard(m).includes('<script>'));const html=comparisonView([m,{...m,id:'PGS000002'}]);assert.ok(html.includes('&lt;img&gt;'));assert.ok(!html.includes('<script>'));
});

test('spelling aliases group Parkinson models without changing stored family labels',()=>{
 const models=[{id:'PGS000902',family:'Parkinson disease'},{id:'PGS001774',family:"Parkinson's disease"}],before=JSON.stringify(models);
 const groups=comparisonGroups(models);assert.equal(groups.length,1);assert.equal(groups[0].family,'Parkinson disease');assert.deepEqual(groups[0].models,models);assert.equal(JSON.stringify(models),before);
});
test('equivalent gallstone and lipoprotein labels share groups while preserving published metadata',()=>{
 const models=['Lipoprotein(a)','Lipoprotein (a)','Gallstones','Cholelithiasis (gallstones)'].map((family,i)=>({id:String(i),family})),before=JSON.stringify(models);
 const groups=comparisonGroups(models);assert.deepEqual(groups.map(g=>[g.family,g.models.length]),[['Cholelithiasis (gallstones)',2],['Lipoprotein (a)',2]]);assert.equal(JSON.stringify(models),before);
});
