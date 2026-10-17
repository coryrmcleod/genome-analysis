import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryInventory} from '../public/library-inventory.js';
test('inventory separates arithmetic availability from reported evaluation ancestry without changing scores',()=>{
 const scores={version:'test',models:[{id:'PGS000001',ancestry:{eval:{dist:{EUR:100}}}},{id:'PGS000002',ancestry:{eval:{dist:{EAS:100}}}},{id:'PGS000003',ancestry:{eval:{dist:{NR:100}}}}],targets:[]};
 const distributions={version:'test',sampleCount:503,models:[...scores.models.map(m=>({id:m.id,status:'Available'})),{id:'PGS000004',status:'Available'},{id:'PGS000005',status:'Unavailable'}]};
 const before=JSON.stringify(scores),rows=libraryInventory({scores,scoreDistributions:distributions,scoreSensitivity:distributions});
 for(const row of rows.filter(r=>r.key!=='scores')){assert.match(row.count,/EUR reported in evaluation: 1 · incompatible: 1 · uncertain or unlinked: 2/);assert.ok(!row.count.includes('5 complete'));assert.match(row.scope,/Model binding and usable calls/);}
 assert.equal(JSON.stringify(scores),before);
 assert.match(libraryInventory({scoreDistributions:distributions})[0].count,/Evaluation ancestry unavailable/);
});
test('ancestry inventory reports aggregate reference coverage without claiming countries or personal findings',()=>{
 const row=libraryInventory({ancestry:{version:'1.0.1',markers:Array(11348),populations:Array(80),groups:Array(7)}})[0];
 assert.equal(row.count,'11348 markers · 80 sampled populations · 7 broad groups');assert.match(row.scope,/country percentages and genealogical proportions are not calculated/);
});
