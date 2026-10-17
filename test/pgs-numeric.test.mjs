import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parsePGSDecimal} from '../public/pgs-numeric.js';
import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
import {validatePGSLibrary} from '../public/pgs.js';
import {diagnoseSourceTerms} from '../scripts/pgs-source-diagnostics.mjs';
import {verifyLogOddsWeights} from '../scripts/pgs-weight-evidence.mjs';
test('source decimal weights reject coercion, overflow and silent nonzero underflow',()=>{
 const source=w=>'#pgs_id=PGS999999\n#variants_number=1\nrsID\teffect_allele\tother_allele\teffect_weight\nrs1\tA\tG\t'+w;
 for(const text of ['0','-0','+1.25','.125','1.','-1.2e-3','1E+2',' 0.25 ','0e999']){assert.equal(parsePGSDecimal(text),Number(text));assert.equal(parseScoringFile(source(text)).rows[0].effect_weight,text);}
 for(const text of ['',' ','0x10','0b10','0o10','NaN','Infinity','1,000','1e999','1e-999','-0.00001e-999']){assert.throws(()=>parsePGSDecimal(text));assert.throws(()=>parseScoringFile(source(text)));assert.equal(diagnoseSourceTerms(source(text)).findings[0].issues.includes('invalid weight'),true);}
 assert.throws(()=>verifyLogOddsWeights([{OR:'0x1',effect_weight:'0'}]),/log\(OR\)/);
});
test('installed numeric weights remain exactly bound to original decimal strings',async()=>{
 const library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url)));assert.equal(validatePGSLibrary(library),library);
 const changed=structuredClone(library);changed.models[0].variants[0].weightText='0x10';assert.throws(()=>validatePGSLibrary(changed),/decimal/);
 changed.models[0].variants[0].weightText=String(changed.models[0].variants[0].weight+1);assert.throws(()=>validatePGSLibrary(changed),/differs/);
});
