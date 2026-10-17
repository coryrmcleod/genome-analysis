import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {referenceDefinition,empiricalPercentile} from '../public/pgs-reference.js';
import {percentileSensitivity,validateSensitivityReference} from '../public/pgs-sensitivity.js';
const model={id:'PGS000001',build:'GRCh38',inputFormat:'VCF',terms:[]};
const repeat=a=>Array.from({length:100},(_,i)=>a[i%a.length]).sort((a,b)=>a-b);
const library={version:'1.0.0',population:'EUR',models:[{id:model.id,status:'Available',sampleCount:100,definitions:{GRCh37:'other',GRCh38:referenceDefinition(model,'GRCh38')},lowerScores:repeat([-2,-1,0,1]),centralScores:repeat([-1,0,1,2]),upperScores:repeat([0,1,2,3])}]};
test('unavailable comparison preserves the actual missing-data explanation',()=>{
 const e={unconditionalLower:null,unconditionalUpper:null,reason:'No usable measured score terms are available.'};
 const r=percentileSensitivity(model,e,library);assert.equal(r.point,null);assert.equal(r.lower,null);assert.equal(r.reason,e.reason);
});
test('sensitivity bounds encompass every enumerated reference endpoint and target scenario',()=>{
 const e={bestGuess:0.5,unconditionalLower:-1,unconditionalUpper:2},before=JSON.stringify({model,e,library});
 const r=percentileSensitivity(model,e,validateSensitivityReference(library));
 for(let mask=0;mask<16;mask++)for(const target of [-1,0,0.5,1,2]){
  const scores=repeat([-2,-1,0,1].map((v,i)=>v+((mask>>i)&1)*2));
  const rank=empiricalPercentile(scores,target);assert.ok(rank>=r.lower&&rank<=r.upper);
 }
 assert.ok(r.point>=r.lower&&r.point<=r.upper);assert.equal(r.measured,false);
 assert.match(r.reason,/not an expected or most-likely/);assert.equal(JSON.stringify({model,e,library}),before);
});
test('signed weights and coherent shared allele orientations remain within conservative bounds',()=>{
 const g=[[0,0],[0,1],[1,0],[2,2]],weights=[-2,3],score=(gt,mask)=>gt.reduce((s,d,i)=>s+weights[i]*((mask>>i)&1?2-d:d),0);
 const per=g.map(gt=>Array.from({length:4},(_,m)=>score(gt,m)));
 const lowerScores=repeat(per.map(v=>Math.min(...v))),upperScores=repeat(per.map(v=>Math.max(...v))),centralScores=repeat(per.map(v=>(Math.min(...v)+Math.max(...v))/2));
 const lib={...library,models:[{...library.models[0],lowerScores,upperScores,centralScores}]};
 const r=percentileSensitivity(model,{bestGuess:1,unconditionalLower:-4,unconditionalUpper:6},lib);
 for(let m=0;m<4;m++)for(let a=0;a<=2;a++)for(let b=0;b<=2;b++){
  const rank=empiricalPercentile(repeat(g.map(gt=>score(gt,m))),score([a,b],m));assert.ok(rank>=r.lower&&rank<=r.upper);
 }
});
test('mismatches, missing references and genotype conflicts cannot produce sensitivity ranks',()=>{
 const e={bestGuess:1,unconditionalLower:0,unconditionalUpper:2};
 for(const r of [percentileSensitivity(model,e,null),percentileSensitivity(model,e,library,'EAS'),percentileSensitivity({...model,build:'GRCh37'},e,library),percentileSensitivity({...model,inputFormat:'array'},e,library),percentileSensitivity(model,{...e,unconditionalLower:null},library)])assert.equal(r.lower,null);
 assert.throws(()=>validateSensitivityReference({...library,models:[{...library.models[0],lowerScores:[2,1]}]}));
 assert.throws(()=>validateSensitivityReference({...library,models:[{...library.models[0],centralScores:Array(100).fill(100)}]}));
});
test('installed sensitivity references preserve complete model definitions on both builds',()=>{
 const lib=validateSensitivityReference(JSON.parse(fs.readFileSync(new URL('../public/data/pgs-score-sensitivity.json',import.meta.url))));
 const pgs=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 assert.equal(lib.models.filter(m=>m.status==='Available').length,208);
 const carbohydrate=lib.models.find(m=>m.id==='PGS004221');
 assert.equal(carbohydrate?.status,'Available');
 assert.equal(carbohydrate.uncertainTerms,2);
 assert.equal(pgs.models.find(m=>m.id==='PGS004221').variantCount,8);
 const synaptic=lib.models.find(m=>m.id==='PGS004918');
 assert.equal(synaptic?.status,'Available');
 assert.equal(synaptic.uncertainTerms,3);
 assert.equal(pgs.models.find(m=>m.id==='PGS004918').variantCount,8);
 assert.equal(lib.models.find(m=>m.id==='PGS000745')?.status,'Available');
 assert.equal(lib.models.find(m=>m.id==='PGS000824')?.status,'Available');
 for(const r of lib.models.filter(m=>m.status==='Available'))for(const b of ['GRCh37','GRCh38'])assert.equal(r.definitions[b],referenceDefinition(pgs.models.find(m=>m.id===r.id),b,pgs.targets));
});
