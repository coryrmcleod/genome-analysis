import test from 'node:test';import assert from 'node:assert/strict';
import {validateSaved} from '../public/workspace.js';
function snapshot(measured=true){return {build:'GRCh38',stats:{records:2},warnings:[],results:[],polygenicScores:[{id:'PGS999999',matched:measured?2:0,total:2,rawSum:measured?3:null,terms:[{id:'rs1',weight:1,status:measured?'Called':'Not observed',dosage:measured?1:null,contribution:measured?1:null},{id:'rs2',weight:2,status:measured?'Called':'Not observed',dosage:measured?1:null,contribution:measured?2:null}],hypotheticalEstimate:{population:'EUR'},referenceComparison:measured?{point:50,lower:50,upper:50,measured:true}:{point:null,lower:null,upper:null}}]};}
test('saved scores reject duplicate or empty term identities without merging weights',()=>{
 for(const measured of [true,false])for(const id of ['rs1','','   ']){const report=snapshot(measured);report.polygenicScores[0].terms[1].id=id;const parsed=JSON.parse(JSON.stringify(report)),before=JSON.stringify(parsed);assert.throws(()=>validateSaved(parsed),/duplicate saved score term/);assert.equal(JSON.stringify(parsed),before);}
});
test('saved scores preserve shared variants across models and custom historical identities',()=>{
 const report=snapshot(),second=structuredClone(report.polygenicScores[0]);second.id='PGS999998';report.polygenicScores.push(second);const before=JSON.stringify(report),parsed=JSON.parse(before);assert.deepEqual(validateSaved(parsed).report,parsed);assert.equal(JSON.stringify(parsed),before);
 const historical=snapshot(false);historical.polygenicScores[0].terms[0].id='reviewed-deletion:chr14:synthetic';const serialized=JSON.stringify(historical);assert.deepEqual(validateSaved(JSON.parse(serialized)).report,JSON.parse(serialized));
});
