import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSetup} from '../desktop/setup.mjs';
const runner=responses=>async()=>responses.shift();
test('setup routes missing WSL and missing Ubuntu to Windows installation',async()=>{
  for(const result of [{code:1,output:'not installed'},{code:0,output:'Debian'}])assert.equal((await checkSetup(runner([result]))).state,'windows');
});
test('setup requires supported Node and both processing tools',async()=>{
  const list={code:0,output:'Ubuntu\r\n'};
  assert.equal((await checkSetup(runner([list,{code:0,output:'v20.0.0'}]))).state,'tools');
  assert.equal((await checkSetup(runner([list,{code:0,output:'v22.0.0'},{code:1,output:'missing'}]))).state,'tools');
  assert.equal((await checkSetup(runner([list,{code:0,output:'v22.0.0'},{code:0,output:'samtools 1.22'},{code:0,output:'bcftools 1.22'}]))).state,'ready');
});
test('setup handles launch failures without claiming readiness',async()=>{
  assert.equal((await checkSetup(async()=>{throw Error('missing executable');})).state,'windows');
});
