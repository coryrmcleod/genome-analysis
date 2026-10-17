import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scoreConditionDescriptions} from '../public/score-condition-data.js';
import {scoreConditionDescription,scoreConditionHtml} from '../public/score-condition-descriptions.js';
import {scoreSummaryHtml} from '../public/score-browser.js';
test('every installed score has an explicit short educational paragraph',()=>{
 const library=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 assert.equal(Object.keys(scoreConditionDescriptions).length,library.models.length);
 for(const model of library.models){
  const entry=scoreConditionDescriptions[model.id];assert.ok(entry,model.id);
  assert.equal(entry.family,model.family,model.id);
  assert.ok(entry.paragraph.length>80&&entry.paragraph.length<550,model.id);
  assert.equal(scoreConditionDescription(model),entry.paragraph);
  assert.match(scoreConditionHtml(model,true),/About this condition or trait/);
 }
 assert.equal(scoreConditionHtml({id:'PGS999999'}),'');
});
test('list explanations preserve study endpoint distinctions',()=>{
 const entries=Object.entries(scoreConditionDescriptions);
 const paragraph=family=>entries.find(([,entry])=>entry.family===family)?.[1].paragraph;
 assert.match(paragraph('Colorectal cancer prognosis after diagnosis'),/already been diagnosed/);
 assert.match(paragraph('Triple negative versus luminal breast cancer'),/compares/);
 assert.match(paragraph('HbA1c nonglycemic genetic effects'),/other than blood glucose/);
 assert.match(paragraph('Neoplasm of uncertain behavior'),/not synonymous with a confirmed cancer/);
 assert.match(paragraph('Carbohydrate preference · workplace purchases'),/purchasing behavior/);
 assert.match(scoreConditionDescription({id:'PGS002277'}),/diabetes-associated variants/);
 const [id]=entries[0];const html=scoreSummaryHtml([{id,trait:'Example',total:1,matched:0}]);
 assert.match(html,/About this condition or trait/);assert.ok(html.includes(scoreConditionDescription({id})));
});
