import test from 'node:test';import assert from 'node:assert/strict';
import {validateSaved,saveWorkspace,unresolvedPriorities,compareReports,parseEvidence} from '../public/workspace.js';
const term={id:'rs1',weight:-2,status:'Quality limited',genotype:'A/T',contribution:null};
const model={id:'PGS000001',trait:'Trait',matched:0,total:1,terms:[term],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null,lower:null,upper:null},rawSum:null};
const report={sample:'S',build:'GRCh38',stats:{records:1},warnings:[],results:[{id:'rs1',gene:'G',status:'Called',priority:1,mappings:{}}],polygenicScores:[model]};
test('workspace round trip preserves score snapshot, notes and filters without mutation',()=>{
 const before=JSON.stringify(report),ui={activeView:'scores',search:'BMI'},saved=saveWorkspace(report,ui,'Private notes'),loaded=validateSaved(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(loaded.report,report);assert.deepEqual(loaded.ui,ui);assert.equal(loaded.notes,'Private notes');assert.equal(JSON.stringify(report),before);assert.deepEqual(validateSaved(report).report,report);
});
test('saved import rejects unsafe URLs, invalid schemas and injected numeric attributes',()=>{
 for(const value of [{},{...report,build:'unknown'},{...report,results:[{...report.results[0],priority:'1\" onclick='}]},{...report,sourceURL:'java\nscript:alert(1)'},{kind:'genome-workspace',version:2,report}])assert.throws(()=>validateSaved(value));
});
test('prioritization uses signed-weight spans within models and retains conflict statuses',()=>{
 const result=unresolvedPriorities({...report,polygenicScores:[{...model,terms:[term,{...term,id:'rs2',weight:1,status:'Overlapping records'}]}]});assert.equal(result[0].term,'rs1');assert.equal(result[0].span,4);assert.equal(result[1].status,'Overlapping records');assert.equal(result[0].fraction,2/3);
});
test('comparison distinguishes model, genotype and assumption changes and rejects specimen mismatch',()=>{
 assert.deepEqual(compareReports(report,report),[]);
 const next=structuredClone(report);next.polygenicScores[0].terms[0].status='Called';next.polygenicScores[0].hypotheticalEstimate.population='AFR';const rows=compareReports(report,next);assert.match(rows[0].reason,/genotype\/status/);assert.match(rows[0].reason,/population changed/);
 assert.throws(()=>compareReports(report,{...report,sample:'Other'}));assert.throws(()=>compareReports(report,{...report,build:'GRCh37'}));
});
test('VCF evidence retains indels and FORMAT and requires correct multisample selection',()=>{
 const line='chr1\t10\trs1\tCAT\tC,GAT\t40\tPASS\t.\tGT:GQ:DP\t1/2:30:22';const rows=parseEvidence(line,'S');assert.equal(rows[0].ref,'CAT');assert.equal(rows[0].fields.GT,'1/2');assert.equal(rows[0].fields.DP,'22');assert.throws(()=>parseEvidence(line+'\t0/0:50:30','S'));
 const header='#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tOther\tS\n';assert.equal(parseEvidence(header+line+'\t0/0:50:30','S')[0].fields.GT,'0/0');
});
