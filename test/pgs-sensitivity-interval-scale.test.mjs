import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {validateSensitivityReference} from '../public/pgs-sensitivity.js';
function numericReference(scale){return {version:'1.0.0',population:'EUR',models:[{id:'PGS000001',status:'Available',sampleCount:100,definitions:{GRCh37:'synthetic numeric definition',GRCh38:'synthetic numeric definition'},lowerScores:Array.from({length:100},(_,i)=>i*scale),centralScores:Array.from({length:100},(_,i)=>(i+1)*scale),upperScores:Array.from({length:100},(_,i)=>(i+2)*scale)}]}}
test('interval ordering is independent of published coefficient units',()=>{
 for(const scale of [1e-100,1e-15,1,1e15,1e100]){
  const reference=numericReference(scale);assert.equal(validateSensitivityReference(reference),reference);
  for(const kind of ['lower','central']){const changed=structuredClone(reference),row=changed.models[0];if(kind==='lower')row.lowerScores[99]=row.centralScores[99]+scale;else row.centralScores[99]=row.upperScores[99]+scale;assert.throws(()=>validateSensitivityReference(changed),/intervals disagree/)}
  const rounded=structuredClone(reference);rounded.models[0].lowerScores[99]=rounded.models[0].centralScores[99]*(1+Number.EPSILON);assert.equal(validateSensitivityReference(rounded),rounded);
 }
 const zero=numericReference(0);assert.equal(validateSensitivityReference(zero),zero);
});
test('tiny score arrays cannot hide an absolute-unit endpoint reversal',()=>{
 for(const kind of ['lower','central']){const reference=numericReference(1e-15),row=reference.models[0];if(kind==='lower')row.lowerScores[99]=row.centralScores[99]+5e-10;else row.centralScores[99]=row.upperScores[99]+5e-10;assert.throws(()=>validateSensitivityReference(reference),/intervals disagree/)}
});
test('all installed intervals and unchanged reference bytes retain compatibility',async()=>{
 const raw=await readFile(new URL('../public/data/pgs-score-sensitivity.json',import.meta.url)),reference=JSON.parse(raw);assert.equal(validateSensitivityReference(reference),reference);let count=0;
 for(const row of reference.models)if(row.status==='Available')for(let i=0;i<row.sampleCount;i++){count++;assert.ok(row.lowerScores[i]<=row.centralScores[i]);assert.ok(row.centralScores[i]<=row.upperScores[i])}
 assert.equal(count,104624);assert.equal(createHash('sha256').update(raw).digest('hex'),'c667c4d88ac52c0075ff1ee51973ba5cc5169eff0f5ecc549d7c0bc4927981a2');
});
