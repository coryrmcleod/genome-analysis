import test from 'node:test';import assert from 'node:assert/strict';
import {diseaseRows,diseasesHtml} from '../public/disease-scores.js';
const model=(id,trait)=>({id,trait,total:1,terms:[{contribution:1}],referenceComparison:{point:85,lower:85,upper:85,measured:true},hypotheticalEstimate:{population:'EUR'}});
test('disease endpoints exclude biomarkers and preserve measured ranks without converting to risk',()=>{
 const report={polygenicScores:[model('PGS005111','Type 2 diabetes'),model('PGS000034','BMI')]};
 assert.equal(diseaseRows(report).length,1);assert.equal(diseaseRows(report)[0].result.point,85);
 const html=diseasesHtml(report);assert.match(html,/85.0 percentile/);assert.match(html,/Personal absolute disease risk: not calculated/);assert.doesNotMatch(html,/85% risk/);
 assert.equal(diseaseRows(report,'diabetes').length,1);assert.equal(diseaseRows(report,'cancer').length,0);
});
test('unavailable and sensitivity results are kept distinct and trait content escaped',()=>{
 const m=model('PGS003763','<img src=x>');m.referenceComparison={};
 assert.match(diseasesHtml({polygenicScores:[m]}),/Unavailable/);
 m.referenceSensitivity={lower:2,upper:50,scenarioSummary:{median:30}};
 const html=diseasesHtml({polygenicScores:[m]});assert.match(html,/Scenario estimate/);assert.match(html,/2.0–50.0 percentile/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);
 assert.match(html,/not your hazard ratio/);
});

test('specialized endpoint caveats are visible and escaped on disease overview cards',()=>{
 const m=model('PGS000869','Type 1 diabetes');
 m.coverageContext='Evaluated for cystic-fibrosis-related diabetes, not general diagnosis. <script>alert(1)</script>';
 const html=diseasesHtml({polygenicScores:[m]});
 assert.match(html,/Evaluated for cystic-fibrosis-related diabetes, not general diagnosis/);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 for(const id of ['PGS000068','PGS000341','PGS000869','PGS000870','PGS002256'])assert.equal(diseaseRows({polygenicScores:[model(id,id)]}).length,1);
});
