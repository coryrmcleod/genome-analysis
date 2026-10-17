import test from 'node:test';import assert from 'node:assert/strict';
import {browseScores,scoreBrowseOptions,scoreSummaryHtml,publicationDate} from '../public/score-browser.js';
const model=(id,trait,point)=>({id,trait,matched:0,total:1,absoluteWeightCoverage:0,referenceComparison:{point,measured:true}});
const models=[model('PGS000001','Zulu',0),model('PGS000002','alpha',99),model('PGS000003','Beta',null),{...model('PGS000004','Delta',null),referenceSensitivity:{lower:10,upper:70,scenarioSummary:{median:40}}},{...model('PGS000005','Echo',null),referenceSensitivity:{lower:20,upper:80}}];
const ids=rows=>rows.map(m=>m.id);
test('publication date sorting supports month precision and keeps unknown or invalid dates last',()=>{
 const dated=(id,trait,date)=>({...model(id,trait,10),publication:{date_publication:date}});
 const rows=[dated('PGS000001','Zulu','2025-02-15'),dated('PGS000002','Alpha','2024-06'),dated('PGS000003','Beta','2025-02-30'),dated('PGS000004','Missing',undefined),dated('PGS000005','Echo','2024-06-01')];
 const before=JSON.stringify(rows);
 assert.deepEqual(ids(browseScores(rows,{sortBy:'date'})),['PGS000002','PGS000005','PGS000001','PGS000003','PGS000004']);
 assert.deepEqual(ids(browseScores(rows,{sortBy:'date',direction:'desc'})),['PGS000001','PGS000002','PGS000005','PGS000003','PGS000004']);
 assert.equal(JSON.stringify(rows),before);
 assert.equal(publicationDate(dated('x','x','2024-02-29')),Date.parse('2024-02-29T00:00:00Z'));
 for(const date of ['2023-02-29','2025-13','2025','2025-01-00','2025-04-31','<script>'])assert.equal(publicationDate(dated('x','x',date)),null);
 assert.equal(scoreBrowseOptions({sortBy:'date'}).sortBy,'date');
 const html=scoreSummaryHtml(rows,{sortBy:'date',direction:'desc'});
 assert.match(html,/aria-sort="descending"><button[^>]+data-score-sort="date"/);
 assert.match(html,/Publication date/);assert.match(html,/2024-06/);assert.match(html,/Unknown/);assert.doesNotMatch(html,/2025-02-30/);
});
test('measured terms sort by absolute weight coverage, not term count, with missing coverage last',()=>{
 const rows=[{...models[0],matched:90,total:100,absoluteWeightCoverage:.1},{...models[1],matched:1,total:100,absoluteWeightCoverage:.9},{...models[2],absoluteWeightCoverage:null},{...models[3],absoluteWeightCoverage:0}];
 const before=JSON.stringify(rows);
 assert.deepEqual(ids(browseScores(rows,{sortBy:'weight'})),['PGS000004','PGS000001','PGS000002','PGS000003']);
 assert.deepEqual(ids(browseScores(rows,{sortBy:'weight',direction:'desc'})),['PGS000002','PGS000001','PGS000004','PGS000003']);
 assert.equal(JSON.stringify(rows),before);
 assert.deepEqual(ids(browseScores(rows,{sortBy:'weight',hideUnavailable:true})),['PGS000004','PGS000001','PGS000002']);
 assert.equal(scoreBrowseOptions({sortBy:'weight'}).sortBy,'weight');
 assert.match(scoreSummaryHtml(rows,{sortBy:'weight',direction:'desc'}),/aria-sort="descending"><button[^>]+data-score-sort="weight"/);
});
test('trait sorting toggles alphabetical order without mutating scores',()=>{
 const before=JSON.stringify(models);assert.deepEqual(ids(browseScores(models)),['PGS000002','PGS000003','PGS000004','PGS000005','PGS000001']);
 assert.deepEqual(ids(browseScores(models,{direction:'desc'})),['PGS000001','PGS000005','PGS000004','PGS000003','PGS000002']);assert.equal(JSON.stringify(models),before);
});
test('numeric sorting uses scenario estimates and keeps unavailable rows last in both directions',()=>{
 assert.deepEqual(ids(browseScores(models,{sortBy:'percentile'})),['PGS000001','PGS000004','PGS000002','PGS000003','PGS000005']);
 assert.deepEqual(ids(browseScores(models,{sortBy:'percentile',direction:'desc'})),['PGS000002','PGS000004','PGS000001','PGS000003','PGS000005']);
});
test('availability filtering preserves zero, excludes range-only and ancestry-blocked estimates',()=>{
 const blocked={...model('PGS000006','Blocked',80),ancestry:{eval:{dist:{EAS:100}}}};
 const rows=browseScores([...models,blocked],{hideUnavailable:true,sortBy:'percentile'});assert.deepEqual(ids(rows),['PGS000001','PGS000004','PGS000002']);
 for(const point of [NaN,Infinity,undefined])assert.equal(browseScores([model('PGS000007','Missing',point)],{hideUnavailable:true}).length,0);
});
test('controls expose sorting state and remain usable for an empty filtered view',()=>{
 const html=scoreSummaryHtml(models,{sortBy:'percentile',direction:'desc',hideUnavailable:true});assert.match(html,/aria-sort="descending"/);assert.match(html,/data-score-sort="trait"/);assert.match(html,/id="hide-unavailable-scores" checked/);
 assert.match(scoreSummaryHtml([],{hideUnavailable:true}),/No scores match/);assert.match(scoreSummaryHtml([]),/hide-unavailable-scores/);
 assert.deepEqual(scoreBrowseOptions({sortBy:'bad',direction:'bad',hideUnavailable:'true'}),{sortBy:'trait',direction:'asc',hideUnavailable:false});assert.deepEqual(scoreBrowseOptions(null),scoreBrowseOptions());
});
