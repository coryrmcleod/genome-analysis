import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeAnalysis} from '../public/analysis-export.js';

test('compact analysis export preserves all fields and Unicode while avoiding formatting inflation',()=>{
 const value={kind:'genome-workspace',notes:'  Keep spaces\nαβ and 🧬  ',report:{terms:Array.from({length:10},(_,i)=>({id:'rs'+i,weight:-0.123,missing:null,status:'Not observed'}))}};
 const compact=JSON.stringify(value),limit=new TextEncoder().encode(compact).length;
 assert.ok(new TextEncoder().encode(JSON.stringify(value,null,2)).length>limit);
 assert.deepEqual(JSON.parse(serializeAnalysis(value,limit)),value);
 assert.throws(()=>serializeAnalysis(value,limit-1),/exceeds 150 MB/);
 assert.throws(()=>serializeAnalysis(undefined),/No analysis/);
});
