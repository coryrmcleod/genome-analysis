import test from 'node:test';import assert from 'node:assert/strict';import {pgsCoverage} from '../public/pgs.js';
test('coverage distinguishes usable zero-effect calls from present exclusions and absent records',()=>{
 const model={terms:[{contribution:0,status:'Called'},{contribution:1,status:'Called'},{contribution:null,status:'Strand ambiguous'},{contribution:null,status:'Quality limited'},{contribution:null,status:'No call'},{contribution:null,status:'Not observed'}]};
 const before=JSON.stringify(model);assert.deepEqual(pgsCoverage(model),{usableMeasured:2,presentButUnusable:3,notObserved:1,unassessed:0,total:6});assert.equal(JSON.stringify(model),before);
});
test('overlap exclusions do not establish that a target record was observed',()=>{
 const model={terms:[{contribution:null,status:'Overlapping records',recordObserved:false},{contribution:null,status:'Overlapping records',recordObserved:true},{contribution:null,status:'Overlapping records'},{contribution:null,status:'Unsupported input',recordObserved:null}]};
 assert.deepEqual(pgsCoverage(model),{usableMeasured:0,presentButUnusable:1,notObserved:1,unassessed:2,total:4});
});
