import test from 'node:test';import assert from 'node:assert/strict';
import {ANALYSIS_METHOD_VERSION,analysisMethodNotice,analysisMethodCardNotice} from '../public/analysis-method.js';
import {analyzeText} from '../public/engine.js';import {saveWorkspace,validateSaved,compareReports} from '../public/workspace.js';
import {europeanSnapshotNotice,migrateEuropeanSnapshot} from '../public/european-scores.js';
const model={id:'PGS000001',trait:'Synthetic',matched:0,total:1,rawSum:null,terms:[{id:'rs1',weight:1,status:'Not observed'}],hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null}};
const report={sample:'S',build:'GRCh38',stats:{records:1},warnings:[],results:[],polygenicScores:[model]};
test('saved record presence accepts only explicit boolean or unknown flags',()=>{
 for(const flag of [true,false,null,undefined]){const r=structuredClone(report);r.polygenicScores[0].terms[0].recordObserved=flag;assert.doesNotThrow(()=>validateSaved(r));}
 for(const flag of ['false',0,1,{},[]]){const r=structuredClone(report);r.polygenicScores[0].terms[0].recordObserved=flag;assert.throws(()=>validateSaved(r),/presence flag/);}
});
test('new scans record the analysis method and saved snapshots preserve rather than upgrade that provenance',()=>{
 const scanned=analyzeText('##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS\n1\t1\t.\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n',{version:'test',records:[]});
 assert.equal(scanned.analysisMethodVersion,ANALYSIS_METHOD_VERSION);
 assert.equal(analysisMethodNotice(scanned),'');
 assert.equal(analysisMethodCardNotice(scanned),'');assert.match(analysisMethodCardNotice(report),/Historical saved result/);assert.match(analysisMethodCardNotice(report),/preserved snapshots/);
 const legacy=structuredClone(report),before=JSON.stringify(legacy);assert.equal(migrateEuropeanSnapshot(legacy,null,null,null),0);assert.equal(JSON.stringify(legacy),before);
 const saved=validateSaved(saveWorkspace(legacy,{},''));assert.equal(saved.report.analysisMethodVersion,undefined);
 assert.match(europeanSnapshotNotice(saved.report,{models:[]}),/cannot reconstruct omitted off-panel records/);
 for(const value of [null,1,{},'current','<img>'])assert.throws(()=>validateSaved({...report,analysisMethodVersion:value}),/method version/);
});
test('historical methods are visible even if all score values and library versions match',()=>{
 const current={...report,analysisMethodVersion:ANALYSIS_METHOD_VERSION};assert.match(compareReports(report,current)[0].reason,/Analysis method version changed/);
 assert.deepEqual(compareReports(current,current),[]);
 const old={...report,analysisMethodVersion:'2026-09-17.1'},before=JSON.stringify(old);
 assert.match(analysisMethodNotice(old),/2026-09-17.1/);assert.match(analysisMethodNotice(old),/Reanalyze the original VCF locally/);assert.equal(JSON.stringify(old),before);
});
