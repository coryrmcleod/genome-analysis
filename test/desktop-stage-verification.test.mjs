import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {verifyDirectoryCopy} from '../scripts/verify-desktop-stage.mjs';
test('desktop staging verification detects missing and stale runtime/reference copies',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'ga-stage-test-')),source=path.join(temp,'source'),dest=path.join(temp,'stage');
 try{
  await mkdir(path.join(source,'data'),{recursive:true});await mkdir(path.join(dest,'data'),{recursive:true});
  await writeFile(path.join(source,'data','synthetic.json'),'synthetic public fixture');
  await assert.rejects(verifyDirectoryCopy(source,dest),/Missing staged path/);
  await writeFile(path.join(dest,'data','synthetic.json'),'stale fixture');
  await assert.rejects(verifyDirectoryCopy(source,dest),/Staged contents differ/);
  await writeFile(path.join(dest,'data','synthetic.json'),'synthetic public fixture');assert.equal(await verifyDirectoryCopy(source,dest),1);
 }finally{const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('ga-stage-test-'))throw Error('Unsafe synthetic cleanup path');await rm(resolved,{recursive:true,force:true});}
});
