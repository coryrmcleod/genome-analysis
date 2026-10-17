import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSaved} from '../public/workspace.js';
function snapshot(scale=1){return {build:'GRCh38',stats:{records:2},warnings:[],results:[],polygenicScores:[{id:'PGS000001',matched:2,total:2,rawSum:scale,terms:[{id:'rs1',weight:2*scale,status:'Called',contribution:2*scale},{id:'rs2',weight:-scale,status:'Called',contribution:-scale}],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:50,lower:50,upper:50,measured:true}}]};}
test('saved measured ranks require complete contributions and coherent raw sums at every scale',()=>{
 for(const scale of [0,1e-100,1e-15,1,1e100]){
  const original=snapshot(scale),before=JSON.stringify(original);assert.deepEqual(validateSaved(JSON.parse(before)).report,JSON.parse(before));assert.equal(JSON.stringify(original),before);
  for(const change of [m=>{m.matched=1;},m=>{m.rawSum=null;},m=>{m.terms[0].contribution=null;},m=>{m.rawSum=scale===0?1:scale*1.1;}]){const copy=structuredClone(original);change(copy.polygenicScores[0]);assert.throws(()=>validateSaved(copy));}
 }
});
test('saved percentile bounds reject invalid claims while preserving hypothetical and historical snapshots',()=>{
 for(const change of [p=>{p.point=101;},p=>{p.lower=-1;},p=>{p.upper=Infinity;},p=>{p.measured='true';},p=>{p.lower=60;},p=>{p.upper=40;},p=>{p.point=null;}]){const copy=snapshot();change(copy.polygenicScores[0].referenceComparison);assert.throws(()=>validateSaved(copy));}
 const hypothetical=snapshot(),m=hypothetical.polygenicScores[0];m.matched=0;m.rawSum=null;m.terms.forEach(t=>{t.contribution=null;t.status='Quality limited';});m.referenceComparison={point:50,lower:0,upper:100,measured:false};assert.deepEqual(validateSaved(hypothetical).report,hypothetical);
 m.referenceComparison={point:null,lower:null,upper:null};assert.deepEqual(validateSaved(hypothetical).report,hypothetical);
 m.referenceComparison={point:99,lower:99,upper:99,measured:true};assert.throws(()=>validateSaved(hypothetical));
});
