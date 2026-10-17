import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSaved} from '../public/workspace.js';
import {scoreResult} from '../public/score-insights.js';
function snapshot(sensitivity){return {build:'GRCh38',stats:{records:1},warnings:[],results:[],polygenicScores:[{id:'PGS000001',matched:0,total:1,rawSum:null,terms:[{id:'rs1',weight:1,status:'Not observed',contribution:null}],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null,lower:null,upper:null},referenceSensitivity:sensitivity}]};}
test('saved sensitivity rejects impossible or reversed percentiles and out-of-range scenario medians',()=>{
 for(const s of [{lower:150,upper:-20,scenarioSummary:{median:200}},{lower:50,upper:40},{lower:0,upper:100,point:101},{lower:NaN,upper:100},{lower:0,upper:Infinity},{lower:10,upper:90,scenarioSummary:{median:9}},{lower:10,upper:90,scenarioSummary:{median:91}},{lower:0,upper:100,scenarioSummary:{median:'50'}}])assert.throws(()=>validateSaved(snapshot(s)));
});
test('saved sensitivity preserves boundary ranks, conservative bounds and historical snapshots',()=>{
 for(const s of [{lower:0,upper:100,scenarioSummary:{median:0}},{lower:100,upper:100,scenarioSummary:{median:100}},{lower:20,upper:80},{lower:null,upper:null},{},undefined]){
  const original=snapshot(s),serialized=JSON.stringify(original),parsed=JSON.parse(serialized);assert.equal(validateSaved(parsed).report,parsed);assert.equal(JSON.stringify(original),serialized);
  if(s?.scenarioSummary)assert.equal(scoreResult(parsed.polygenicScores[0]).point,s.scenarioSummary.median);
 }
 // A legacy neutral point may come from a different comparison distribution;
 // it is not the scenario median displayed inside shared-orientation bounds.
 const original=snapshot({point:95,lower:20,upper:80,scenarioSummary:{median:50}});assert.equal(validateSaved(original).report,original);assert.equal(scoreResult(original.polygenicScores[0]).point,50);
});
