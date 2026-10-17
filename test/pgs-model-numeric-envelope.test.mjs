import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePGSNumericEnvelope} from '../public/pgs-numeric.js';
import {validatePGSLibrary,calculatePGS} from '../public/pgs.js';
test('numeric envelope rejects individual and accumulated overflow without cancellation or clipping',()=>{
 for(const weights of [[1e308],[-1e308],[5e307,5e307],[5e307,-5e307],[-5e307,-5e307]]){const terms=weights.map(weight=>({weight})),before=JSON.stringify(terms);assert.throws(()=>validatePGSNumericEnvelope(terms),/numeric range/);assert.equal(JSON.stringify(terms),before);assert.throws(()=>calculatePGS({models:[{variants:terms}]},{results:[]}),/numeric range/);}
 for(const weights of [[0],[1e-100,-1e-100],[Number.MIN_VALUE],[8e307],[-8e307],[4e307,-4e307]])assert.ok(Number.isFinite(validatePGSNumericEnvelope(weights.map(weight=>({weight})))));
});
test('library validation rejects finite coefficients whose diploid products overflow',async()=>{
 const library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),model=library.models[0],term=model.variants[0];term.weight=1e308;term.weightText='1e308';assert.throws(()=>validatePGSLibrary(library),/numeric range/);
});
test('all installed source coefficients retain their complete finite envelopes',async()=>{
 const bytes=await readFile(new URL('../public/data/pgs-library.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),'dd926e1e16632dc0e5b07aab34881ba71a437a4200618692e18e67b8404df6ea');const library=JSON.parse(bytes);validatePGSLibrary(library);assert.equal(library.models.length,354);assert.equal(library.models.reduce((n,m)=>n+m.variants.length,0),81869);assert.equal(Math.max(...library.models.map(m=>validatePGSNumericEnvelope(m.variants))),1001.8);
});
