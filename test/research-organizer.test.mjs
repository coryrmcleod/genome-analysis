import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOrganizer,organizerControls,filterResearchScores,researchFiltersHtml} from '../public/research-organizer.js';
import {printableReport} from '../public/print-report.js';
import {saveWorkspace,validateSaved} from '../public/workspace.js';
const term={id:'rs1',weight:1,status:'Called',contribution:1};
const model={id:'PGS000001',trait:'Example',family:'Example',matched:1,total:1,terms:[term],hypotheticalEstimate:{},referenceComparison:{point:50,lower:50,upper:50,measured:true},absoluteWeightCoverage:1,ancestry:{eval:{dist:{EUR:100}}},rawSum:1};
const report={build:'GRCh38',stats:{records:1},warnings:[],results:[{id:'rs1',gene:'GENE',priority:1,status:'Called',mappings:{}}],polygenicScores:[model]};
test('pins, review flags and notes survive saved workspace without altering scores',()=>{
 const organizer={'score:PGS000001':{pinned:true,reviewed:true,note:'My note'},'variant:rs1':{pinned:true,note:'Variant note'}};
 const loaded=validateSaved(JSON.parse(JSON.stringify(saveWorkspace(report,{organizer},'General'))));
 assert.deepEqual(normalizeOrganizer(loaded.ui.organizer,report),{'score:PGS000001':organizer['score:PGS000001'],'variant:rs1':{...organizer['variant:rs1'],reviewed:false}});assert.deepEqual(loaded.report,report);
 assert.deepEqual(normalizeOrganizer({'score:unknown':{pinned:true}},report),{});
 assert.match(organizerControls('score:PGS000001',{'score:PGS000001':{note:'</textarea><script>bad</script>'}}),/&lt;script&gt;/);
});
test('filters distinguish measured, hypothetical, bounds, population mismatch and pins',()=>{
 const scenario={...model,id:'PGS000002',referenceComparison:{point:55,measured:false},absoluteWeightCoverage:.4};
 const mismatch={...model,id:'PGS000003',ancestry:{eval:{dist:{EAS:100}}}};
 assert.deepEqual(filterResearchScores([model,scenario,mismatch],{kind:'measured'}),[model]);
 assert.deepEqual(filterResearchScores([model,scenario,mismatch],{eligibility:'mismatch'}),[mismatch]);
 assert.deepEqual(filterResearchScores([model,scenario],{coverage:'.9'}),[model]);
 assert.deepEqual(filterResearchScores([model,scenario],{pinned:true},{'score:PGS000002':{pinned:true}}),[scenario]);
});
test('print selection excludes unpinned data and private notes by default and escapes input',()=>{
 const organizer={'score:PGS000001':{pinned:true,note:'Secret note'}};
 const html=printableReport(report,organizer,'Secret general');assert.match(html,/Measured-score rank/);assert.doesNotMatch(html,/Secret/);assert.match(html,/No variants pinned/);
 assert.match(printableReport(report,organizer,'<script>note</script>',true),/&lt;script&gt;note/);
 assert.doesNotMatch(printableReport(report,{},'',true),/Example/);
 const blocked={...report,polygenicScores:[{...model,ancestry:{eval:{dist:{EAS:100}}}}]};assert.match(printableReport(blocked,organizer),/evaluation population mismatch/);assert.doesNotMatch(printableReport(blocked,organizer),/estimate: 50/);
});
test('printed lifetime percentages retain population scope and never become personal estimates',()=>{
 const disease={...model,id:'PGS000029',trait:'Breast cancer'};
 const html=printableReport({...report,polygenicScores:[disease]},{'score:PGS000029':{pinned:true}});
 assert.match(html,/Population context only/);
 assert.match(html,/No personal lifetime disease probability is calculated/);
 assert.match(html,/Projected lifetime from birth/);
 assert.match(html,/14\.3%/);
 assert.match(html,/Cancer Research UK/);
});

test('NAFLD spelling aliases share a filter and preserve original models and legacy filter selections',()=>{
 const models=[{...model,id:'PGS000655',family:'Non-alcoholic fatty liver disease'},{...model,id:'PGS002283',family:'Nonalcoholic fatty liver disease'}],before=JSON.stringify(models);
 for(const family of models.map(m=>m.family))assert.deepEqual(filterResearchScores(models,{family}),models);
 const html=researchFiltersHtml(models,{family:models[1].family});assert.equal((html.match(/<option value="Non-alcoholic fatty liver disease" selected>/g)||[]).length,1);assert.doesNotMatch(html,/<option value="Nonalcoholic/);assert.equal(JSON.stringify(models),before);
});
