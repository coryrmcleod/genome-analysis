import test from 'node:test';
import assert from 'node:assert/strict';
import {expandedScoreContext,nonglycemicHbA1cNote} from '../public/expanded-score-context.js';

test('HbA1c supplement discrepancies accompany both definitions without mutating source data',()=>{
 for(const id of ['PGS019958','PGS019959']){
  const m={id,publication:{PMID:39042486},variants:[{weight:-0.3309}]},before=JSON.stringify(m);
  const note=expandedScoreContext(m);
  assert.match(note,/26,546 European and 3,282 African/);
  assert.match(note,/16,862 European noncarriers and 5,432 African noncarriers/);
  assert.match(note,/complete 122-term sensitivity analysis/);
  assert.match(note,/preserves the deposited weights/);
  assert.equal(JSON.stringify(m),before);
 }
 assert.equal(nonglycemicHbA1cNote({id:'PGS019958',publication:{PMID:1}}),'');
 assert.equal(nonglycemicHbA1cNote({id:'PGS000001',publication:{PMID:39042486}}),'');
});
