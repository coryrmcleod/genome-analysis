import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('IgE keeps every frozen beta term and labels adolescent evidence without allergy diagnosis',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url))),m=read('pgs-library').models.find(m=>m.id==='PGS000315');
 assert.equal(m.variantCount,7);assert.equal(m.variants.length,7);assert.equal(m.sourceFiles.original.sha256,'252985f2ae2a8e461c2536d26ed9ec834c343a0db13c87fff17570570d3c4486');
 assert.match(m.coverageContext,/adolescent cohort/);assert.match(m.coverageContext,/not a measured serum IgE/);assert.match(m.coverageContext,/not retrievable/);
 const e=read('pgs-evaluation').models.find(row=>row.id===m.id).evaluations;assert.equal(e.length,1);assert.equal(e[0].samples[0].cohort,'TRAILS');assert.equal(e[0].metrics[0].estimate,.0206);assert.equal(e[0].samples[0].age.estimate,16.22);
});
