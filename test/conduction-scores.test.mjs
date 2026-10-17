import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {isPalindromic} from '../public/pgs.js';
test('conduction scores preserve complete models and separate referred-cohort evidence from drug safety',()=>{
 const l=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
 for(const [id,n,pal,sha] of [['PGS000735',44,8,'db33544fe46fd6d12103c885c732da45877bb68dd932f148b2178bb51116f64b'],['PGS000736',26,2,'18b1c330faffff287d8c143dc7b90957a42893ce4ff358e3a81e1f91af7e5390']]){
  const m=l.models.find(m=>m.id===id);assert.equal(m.variantCount,n);assert.equal(m.variants.length,n);assert.equal(m.sourceFiles.original.sha256,sha);assert.equal(m.variants.filter(v=>isPalindromic(v.effectAllele,v.otherAllele)).length,pal);
  assert.match(m.coverageContext,/1257 European-ancestry patients/);assert.match(m.coverageContext,/not a general screening cohort/);assert.match(m.coverageContext,/medication safety or dosing advice/);assert.match(m.coverageContext,/does not validate this score alone/);
 }
 assert.match(l.models.find(m=>m.id==='PGS000735').coverageContext,/P=0.062/);
});
