import test from 'node:test';import assert from 'node:assert/strict';import {validateSaved} from '../public/workspace.js';
const snapshot=scenarios=>({build:'GRCh38',stats:{records:1},warnings:[],results:[],polygenicScores:[{id:'PGS999999',matched:0,total:1,rawSum:null,terms:[{id:'rs1',weight:1,status:'Not observed',contribution:null}],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null,lower:null,upper:null},referenceSensitivity:{lower:20,upper:80,scenarios}}]});
test('saved individual scenarios reject malformed lists and contradictory recorded ranks',()=>{
 for(const scenarios of ['invalid',{},[null],[[]],[42],[{lower:101,upper:101,centralRank:101}],[{lower:80,upper:20,centralRank:50}],[{lower:30,upper:60,centralRank:70}],[{lower:30,upper:60,centralRank:29}],[{lower:10,upper:70,centralRank:50}],[{lower:30,upper:90,centralRank:50}],[{lower:'30',upper:60,centralRank:50}]]){const report=snapshot(scenarios),before=JSON.stringify(report);assert.throws(()=>validateSaved(JSON.parse(before)));assert.equal(JSON.stringify(report),before);}
 const sparse=[{lower:30,upper:60,centralRank:50}];sparse.length=2;assert.throws(()=>validateSaved(snapshot(sparse)));
});
test('recorded boundary scenarios and unavailable historical fields remain compatible',()=>{
 for(const scenarios of [[{lower:20,upper:80,centralRank:50,alleles:{}}],[{lower:20,upper:20,centralRank:20,alleles:{}}],[{lower:80,upper:80,centralRank:80,alleles:{}}],[{lower:30,upper:60,centralRank:null,alleles:{}}],[{lower:30,upper:60,alleles:{}}],[],null,undefined]){const original=snapshot(scenarios),before=JSON.stringify(original),parsed=JSON.parse(before);assert.deepEqual(validateSaved(parsed).report,parsed);assert.equal(JSON.stringify(original),before);}
});
