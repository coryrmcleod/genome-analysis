import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {isPalindromic} from '../public/pgs.js';
import {evaluationHtml} from '../public/pgs-evaluation.js';
test('QT score retains all 68 terms and distinguishes reduced-model evaluation from full-model validation',async()=>{
 const read=async name=>JSON.parse(await readFile(new URL('../public/data/'+name+'.json',import.meta.url)));
 const l=await read('pgs-library'),m=l.models.find(m=>m.id==='PGS000768'),e=await read('pgs-evaluation'),r=await read('pgs-score-reference');
 assert.equal(m.variantCount,68);assert.equal(m.variants.length,68);assert.equal(m.sourceFiles.original.sha256,'8fa965bb2d83d661a0eab19459144f5b8cb160835a328099ea4dd2fd6381e32f');
 assert.equal(m.variants.filter(v=>isPalindromic(v.effectAllele,v.otherAllele)).length,14);
 assert.match(m.coverageContext,/60\/68 variants plus a proxy/);assert.match(m.coverageContext,/not measured or predicted ECG milliseconds/);assert.match(m.coverageContext,/not a long-QT diagnosis/);
 assert.notEqual(r.models.find(x=>x.id===m.id).status,'Available');
 const html=evaluationHtml(m,e);assert.match(html,/Only 60 of the 68/);assert.match(html,/rs12300631/);assert.match(html,/not your predicted risk or GA performance/);
});
