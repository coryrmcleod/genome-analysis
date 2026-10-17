import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {referencePercentile} from '../public/pgs-reference.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
const library=load('pgs-library'),reference=load('pgs-score-reference'),activeEvaluation=load('pgs-evaluation');
const historical=JSON.parse(readFileSync(new URL('./fixtures/pgs/primary/FinnGen-R4-coordinate-retirement-review.json',import.meta.url)));
const evaluation={...activeEvaluation,models:[...activeEvaluation.models,historical.retiredEvaluation]};
test('complete exposure scores retain unavailable exact ranks when orientation or reference calls are unresolved',()=>{
 for(const [id,count,reason] of [['PGS003166',9,/unresolved effect-allele orientation/],['PGS004918',8,/unresolved effect-allele orientation/]]){
  const model=library.models.find(m=>m.id===id);assert.equal(model.variants.length,count);
  const scored={...model,build:'GRCh38',inputFormat:'VCF',rawSum:0},scenario={bestGuess:0,unconditionalLower:0,unconditionalUpper:0};
  const before=JSON.stringify([scored,scenario]),rank=referencePercentile(scored,scenario,reference);
  assert.equal(rank.point,null);assert.equal(rank.lower,null);assert.equal(rank.upper,null);assert.match(rank.reason,reason);
  assert.equal(JSON.stringify([scored,scenario]),before);
 }
});
test('exposure evidence preserves endpoint differences, weak metrics and study scaling separately from raw scores',()=>{
 const kidney=library.models.find(m=>m.id==='PGS003310'),vitamin=library.models.find(m=>m.id==='PGS003180'),pressure=historical.retiredModel;
 assert.ok(!library.models.some(m=>m.id===pressure.id));
 const kidneyHtml=evaluationHtml(kidney,evaluation),vitaminHtml=evaluationHtml(vitamin,evaluation),pressureHtml=evaluationHtml(pressure,evaluation);
 assert.match(kidneyHtml,/eGFRcys-overall-EA/);assert.match(kidneyHtml,/<h4>Cystatin C<\/h4>/);assert.match(kidneyHtml,/Field ID: 30720/);
 assert.match(vitaminHtml,/0.000335/);assert.match(vitaminHtml,/reported SE 0.107/);
 assert.match(pressureHtml,/0.991 \[reported interval 0.98 to 1.002\]/);assert.match(pressureHtml,/0.504/);
 for(const html of [kidneyHtml,vitaminHtml,pressureHtml])assert.match(html,/Effect-size units and score scaling follow the source study, not GA raw-score units/);
 assert.match(kidney.coverageContext,/not interchangeable/);assert.match(vitamin.coverageContext,/do not establish a useful individual-level prediction/);assert.match(pressure.coverageContext,/does not establish increased hypertension risk/);
});
