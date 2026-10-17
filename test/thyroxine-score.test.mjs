import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {evaluationHtml} from '../public/pgs-evaluation.js';import {isPalindromic} from '../public/pgs.js';
test('FT4 retains the full adult-derived score with pediatric evaluation and no laboratory prediction',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url))),l=read('pgs-library'),m=l.models.find(m=>m.id==='PGS004907');
 assert.equal(m.variantCount,31);assert.equal(m.variants.length,31);assert.equal(m.sourceFiles.original.sha256,'e8a62df6d532e6473bfa3e96b4958c9b26b9e49df461e23adfaaa6f469b6c3a9');assert.equal(m.variants.filter(v=>isPalindromic(v.effectAllele,v.otherAllele)).length,7);
 assert.match(m.coverageContext,/7231 European-ancestry children/);assert.match(m.coverageContext,/Catalog covariates are blank/);assert.match(m.coverageContext,/not a measured hormone concentration/);
 const html=evaluationHtml(m,read('pgs-evaluation'));assert.match(html,/Generation_R/);assert.match(html,/ALSPAC/);assert.match(html,/BLTS/);assert.match(html,/Reported participant age/);
});
