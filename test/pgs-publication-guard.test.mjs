import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {importLibrary} from '../scripts/import-pgs-library.mjs';
test('legacy importer cannot publish a library independently of reference artifacts',async()=>{
 const file=new URL('../public/data/pgs-library.json',import.meta.url),before=await readFile(file);
 await assert.rejects(()=>importLibrary(),/Direct score-library publication is disabled/);
 await assert.rejects(()=>importLibrary({selection:[],publish:true}),/Direct score-library publication is disabled/);
 assert.deepEqual(await readFile(file),before);
});
test('user-facing score update entry points stage public changes instead of publishing',async()=>{
 const root=new URL('../',import.meta.url),pkg=JSON.parse(await readFile(new URL('package.json',root)));
 assert.equal(pkg.scripts['pgs:update'],'node scripts/stage-pgs-refresh.mjs');
 const cmd=await readFile(new URL('Update Score Library.cmd',root),'utf8');
 assert.match(cmd,/stage-pgs-refresh\.mjs/);assert.doesNotMatch(cmd,/import-pgs-library\.mjs/);
});
