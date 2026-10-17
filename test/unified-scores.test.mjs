import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {migrateEuropeanSnapshot,europeanSnapshotNotice} from '../public/european-scores.js';
import {lifetimeRiskHtml,LIFETIME_RISK} from '../public/lifetime-risk.js';
test('saved non-European scenarios are recalculated without changing measured calls; EUR snapshots stay intact',()=>{
 const model={id:'PGS999999',inputFormat:'VCF',matched:1,rawSum:null,terms:[{id:'rs1',status:'Called',contribution:2,dosage:1,weight:2,genotype:'A/G',effectAllele:'A',otherAllele:'G'},{id:'rs2',status:'Not observed',contribution:null,weight:1,effectAllele:'A',otherAllele:'G'}],hypotheticalEstimate:{population:'SAS'}};
 const before=structuredClone(model.terms),report={polygenicScores:[model]};
 assert.equal(migrateEuropeanSnapshot(report,null,null,null),1);assert.equal(model.hypotheticalEstimate.population,'EUR');assert.deepEqual(model.terms,before);assert.equal(model.rawSum,null);
 const saved=structuredClone(report);assert.equal(migrateEuropeanSnapshot(report,null,null,null),0);assert.deepEqual(report,saved);
});
test('lifetime context is population-specific and never transformed by a personal score',()=>{
 const first=lifetimeRiskHtml({id:'PGS000086',percentile:1}),second=lifetimeRiskHtml({id:'PGS000086',percentile:99});assert.equal(first,second);assert.match(first,/UK population born in 1961/);assert.match(first,/1 in 220/);assert.match(first,/No personal lifetime disease probability/);
 assert.match(lifetimeRiskHtml({id:'PGS005111'}),/age 45/);assert.equal(lifetimeRiskHtml({id:'PGS000034'}),'');
 const ra=lifetimeRiskHtml({id:'PGS004118'});assert.match(ra,/2.3–3.4%/);assert.match(ra,/four registry definitions/);assert.doesNotMatch(ra,/study 95% CI/);
 const ms=lifetimeRiskHtml({id:'PGS000809'});assert.match(ms,/0.53%/);assert.match(ms,/0.23%/);assert.match(ms,/1993–2000/);assert.match(ms,/not annual incidence/);
 const hf=lifetimeRiskHtml({id:'PGS005319'});assert.match(hf,/age 55/);assert.match(hf,/33%/);assert.match(hf,/29%/);assert.match(hf,/separate from the calcium-channel-blocker-treated population/);
 for(const r of Object.values(LIFETIME_RISK)){assert.ok(r.url.startsWith('https://'));assert.ok(r.cohort&&r.period&&r.scope);}
});
test('snapshot notices distinguish migration and identify newly installed models',()=>{
 const report={polygenicScores:[{id:'PGS000001'}]},library={models:[{id:'PGS000001'},{id:'PGS000002'}]};
 assert.match(europeanSnapshotNotice(report,library),/1 installed model is absent/);
 assert.match(europeanSnapshotNotice(report,library,1),/1 non-European score scenario was recalculated/);
 assert.doesNotMatch(europeanSnapshotNotice(report,library,1),/assumptions are preserved/);
 assert.doesNotMatch(europeanSnapshotNotice(report,{models:report.polygenicScores}),/models are absent/);
});
test('combined score navigation is second and has no disease tab or population selector',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const group=html.split('aria-label="Report view">')[1].split('</div>')[0];const ids=[...group.matchAll(/id="([^\"]+)-view"/g)].map(m=>m[1]);assert.deepEqual(ids.slice(0,2),['overview','scores']);assert.ok(!ids.includes('diseases'));
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/id="scenario-population"/);assert.match(app,/migrateEuropeanSnapshot/);
});
