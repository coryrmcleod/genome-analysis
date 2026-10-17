import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateExpansionReferences as validate} from '../scripts/validate-expansion-references.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
const library=read('pgs-library'),reference=read('pgs-score-reference'),sensitivity=read('pgs-score-sensitivity');
test('publication requires a coherent public reference inventory and cohort',()=>{
 assert.equal(validate(reference,sensitivity,library).reference,reference);
 assert.throws(()=>validate({...reference,models:reference.models.slice(1)},sensitivity,library),/inventory/);
 assert.throws(()=>validate(reference,{...sensitivity,models:[...sensitivity.models,{id:'PGS999999',status:'Unavailable',reason:'Unknown'}]},library),/Unknown/);
 const unavailable=reference.models.find(r=>r.status==='Unavailable');
 assert.throws(()=>validate(reference,{...sensitivity,models:sensitivity.models.filter(r=>r.id!==unavailable.id)},library),/Missing sensitivity/);
 for(const sampleCount of [502,504,undefined])assert.throws(()=>validate({...reference,sampleCount},sensitivity,library),/panel/);
 assert.throws(()=>validate(reference,{...sensitivity,archiveSha256:'a'.repeat(64)},library),/archive/);
 const available=reference.models.find(r=>r.status==='Available');
 const changed={...available,definitions:{...available.definitions,GRCh37:'changed'}};
 assert.throws(()=>validate({...reference,models:reference.models.map(r=>r===available?changed:r)},sensitivity,library),/definition/);
});
