import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePGS} from '../public/pgs.js';
import {validateSaved} from '../public/workspace.js';
function report(weight=2,dosage=2){const contribution=weight*dosage;return {build:'GRCh38',stats:{records:1},warnings:[],results:[],polygenicScores:[{id:'PGS000001',matched:1,total:1,rawSum:contribution,terms:[{id:'rs1',weight,status:'Called',dosage,contribution}],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:50,lower:50,upper:50,measured:true}}]};}
test('saved measured terms reject excluded calls, invalid dosages and coefficient disagreement',()=>{
 for(const weight of [0,1e-100,-1e-100,1e-15,-1e-15,2,-2,1e100,-1e100])for(const dosage of [0,1,2]){
  const original=report(weight,dosage);assert.equal(validateSaved(original).report,original);
  for(const value of [null,'1',-1,3,.5,NaN,Infinity]){const invalid=structuredClone(original);invalid.polygenicScores[0].terms[0].dosage=value;assert.throws(()=>validateSaved(invalid));}
  for(const status of ['Quality limited','Strand ambiguous','Not observed','Effect orientation unresolved','Unsupported call']){const invalid=structuredClone(original);invalid.polygenicScores[0].terms[0].status=status;assert.throws(()=>validateSaved(invalid));}
  const invalid=structuredClone(original),model=invalid.polygenicScores[0];model.rawSum=model.terms[0].contribution=weight===0?1:weight*(dosage+.1);assert.throws(()=>validateSaved(invalid));
 }
});
test('saved measured terms preserve scorer output, omitted historical dosage and hypothetical scenarios',()=>{
 const library={version:'synthetic',models:[{id:'PGS000001',variantCount:1,variants:[{id:'rs1',weight:-.25,effectAllele:'A',otherAllele:'C'}]}]};
 for(const dosage of [0,1,2]){
  const input={build:'GRCh38',format:'VCF',results:[{id:'rs1',status:'Called',alleles:Array.from({length:2},(_,i)=>i<dosage?'A':'C')}]},scored=calculatePGS(library,input)[0],saved=report();Object.assign(scored,{hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:50,lower:50,upper:50,measured:true}});saved.polygenicScores=[scored];const serialized=JSON.stringify(saved);assert.deepEqual(validateSaved(JSON.parse(serialized)).report,JSON.parse(serialized));assert.equal(JSON.stringify(saved),serialized);
 }
 const historical=report();delete historical.polygenicScores[0].terms[0].dosage;assert.equal(validateSaved(historical).report,historical);
 const hypothetical=report(),m=hypothetical.polygenicScores[0];m.matched=0;m.rawSum=null;m.terms[0].status='Quality limited';m.terms[0].contribution=null;m.terms[0].dosage=null;m.referenceComparison.measured=false;assert.equal(validateSaved(hypothetical).report,hypothetical);
});
