import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreDisplayTrait,comparisonGroups} from '../public/score-insights.js';
import {scoreSummaryHtml} from '../public/score-browser.js';
import {printableReport} from '../public/print-report.js';

test('CRC survival prognosis stays distinct from susceptibility in summary and export',()=>{
 const prognosis={id:'PGS004586',trait:'Colorectal cancer',family:'Colorectal cancer prognosis after diagnosis',publication:{PMID:38589358},terms:[],total:287,matched:0};
 const susceptibility={id:'PGS000001',trait:'Colorectal cancer',family:'Colorectal cancer',terms:[],total:1,matched:0};
 const before=JSON.stringify(prognosis);
 assert.equal(scoreDisplayTrait(prognosis),'Colorectal cancer prognosis after diagnosis');
 assert.equal(scoreDisplayTrait(susceptibility),'Colorectal cancer');
 assert.equal(scoreDisplayTrait({...prognosis,publication:{PMID:1}}),'Colorectal cancer');
 assert.match(scoreSummaryHtml([prognosis,susceptibility]),/>Colorectal cancer prognosis after diagnosis<\/a>/);
 assert.match(printableReport({polygenicScores:[prognosis]}, {'score:PGS004586':{pinned:true}}),/<h3>Colorectal cancer prognosis after diagnosis/);
 assert.deepEqual(comparisonGroups([prognosis,susceptibility]),[]);
 assert.equal(JSON.stringify(prognosis),before);
});
