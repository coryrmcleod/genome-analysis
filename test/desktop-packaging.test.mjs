import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

test('desktop pipeline packages the Python normalization verifier',async()=>{
 const config=JSON.parse(await readFile(new URL('../electron-builder.json',import.meta.url)));
 const pipeline=config.extraResources.find(resource=>resource.to==='pipeline');
 assert.ok(pipeline.filter.includes('scripts/**/*.py'));
 await access(new URL('../scripts/verify-normalization.py',import.meta.url));
});
