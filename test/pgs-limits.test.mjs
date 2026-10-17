import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGS_LIMITS,validatePGSWorkload} from '../public/pgs-limits.js';
import {validatePGSLibrary,calculatePGS} from '../public/pgs.js';
import {validateSaved,saveWorkspace} from '../public/workspace.js';
test('model, per-model and total-term bounds reject excess without permitting truncation',()=>{
 assert.equal(validatePGSWorkload(Array.from({length:400},()=>({variants:[]})),'variants'),0);
 assert.throws(()=>validatePGSWorkload(Array.from({length:401},()=>({variants:[]})),'variants'),/model-count/);
 assert.equal(validatePGSWorkload([{terms:Array(60000)},{terms:Array(60000)}],'terms'),120000);
 assert.throws(()=>validatePGSWorkload([{terms:Array(60001)}],'terms'),/per-model/);
 assert.throws(()=>validatePGSWorkload([{terms:Array(60000)},{terms:Array(60000)},{terms:[{}]}],'terms'),/total-term/);
 for(const value of [null,[null],[{variants:null}]])assert.throws(()=>validatePGSWorkload(value,'variants'));
 assert.throws(()=>validatePGSWorkload([],'untrusted'));
 assert.equal(PGS_LIMITS.totalTerms,120000);
});
for(const [count,sourceId] of [[300,'PGS001883'],[400,'PGS003861']])test(count+' synthetic models remain complete and independently withheld through scoring and saved-report round trip',()=>{
 const installed=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 const base=installed.models.find(m=>m.id===sourceId); // Complete real weights; synthetic model copies only.
 const terms=base.variantCount;
 const wanted=new Set(base.variants.map(v=>v.id));
 const library={...installed,models:Array.from({length:count},(_,i)=>{const id='PGS'+String(800000+i);return {...base,id,name:'Synthetic capacity fixture',catalogURL:'https://www.pgscatalog.org/score/'+id+'/'};}),targets:installed.targets.filter(t=>wanted.has(t.id))};
 const start=performance.now();validatePGSLibrary(library);
 const scores=calculatePGS(library,{format:'VCF',build:'GRCh38',results:[]});
 assert.equal(scores.length,count);assert.equal(scores.reduce((n,m)=>n+m.terms.length,0),count*terms);
 assert.ok(scores.every(m=>m.rawSum===null&&m.matched===0&&m.total===terms));
 const report={syntheticDemo:true,build:'GRCh38',stats:{records:0},warnings:[],results:[],polygenicScores:scores.map(m=>({...m,hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null}}))};
 const bytes=JSON.stringify(saveWorkspace(report,{},'Synthetic capacity test only'));assert.ok(Buffer.byteLength(bytes)<150_000_000,'Capacity fixture must fit the app saved-file bound');
 const loaded=validateSaved(JSON.parse(bytes));
 assert.equal(loaded.report.polygenicScores.length,count);assert.ok(loaded.report.polygenicScores.every(m=>m.rawSum===null&&m.terms.length===terms));
 console.log('Synthetic '+count+'-model / '+(count*terms).toLocaleString()+'-term validation, scoring and JSON round trip: '+Math.round(performance.now()-start)+' ms; heap '+Math.round(process.memoryUsage().heapUsed/1048576)+' MiB. No installed models were added by this test.');
});
