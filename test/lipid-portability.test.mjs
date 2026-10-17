import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {referencePercentile} from '../public/pgs-reference.js';
import {scoreResult} from '../public/score-insights.js';
const load=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
test('new lipid comparators with complete EUR arithmetic still withhold population-incompatible ranks',()=>{
 const library=load('pgs-library'),reference=load('pgs-score-reference');
 for(const id of ['PGS003825','PGS003830','PGS004637','PGS004652','PGS004657']){
  const model=library.models.find(m=>m.id===id),distribution=reference.models.find(m=>m.id===id);
  assert.equal(distribution.status,'Available',id);
  const scored={...model,rawSum:distribution.scores[250],referenceComparison:{population:'EUR',point:99,lower:99,upper:99,measured:true},referenceSensitivity:{lower:90,upper:100}};
  const before=JSON.stringify(scored);
  const rank=referencePercentile(scored,null,reference);assert.equal(rank.ancestryAssessment.status,'mismatch',id);
  for(const result of [rank,scoreResult(scored)]){assert.equal(result.point,null,id);assert.equal(result.lower,null,id);assert.equal(result.upper,null,id);}
  assert.equal(JSON.stringify(scored),before);
 }
});
