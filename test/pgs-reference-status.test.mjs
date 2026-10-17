import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScoreReference} from '../public/pgs-reference.js';
import {validateSensitivityReference} from '../public/pgs-sensitivity.js';
test('reference validators require explicit statuses and audited exclusions',()=>{
 for(const validate of [validateScoreReference,validateSensitivityReference]){
  const base={version:'1.0.0',population:'EUR',retrievedAt:'2026-09-18',models:[{id:'PGS000001',status:'Unavailable',reason:'Unresolved original allele orientation'}]};
  assert.equal(validate(base),base);
  for(const status of [undefined,null,'available','Failed','Pending'])assert.throws(()=>validate({...base,models:[{...base.models[0],status}]}),/status/);
  for(const reason of [undefined,null,'','   ',42])assert.throws(()=>validate({...base,models:[{...base.models[0],reason}]}),/reason/);
  for(const id of ['bad','PGS1',undefined])assert.throws(()=>validate({...base,models:[{...base.models[0],id}]}),/invalid/i);
  assert.throws(()=>validate({...base,models:[...base.models,...base.models]}),/Duplicate/);
 }
});
