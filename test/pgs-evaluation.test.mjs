import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePGSEvaluationLibrary,evaluationForModel,evaluationHtml} from '../public/pgs-evaluation.js';
import {calculatePGS} from '../public/pgs.js';
import {saveWorkspace,validateSaved} from '../public/workspace.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
test('offline evaluation rows retain frozen primary endpoints, covariates, comments and metric values',()=>{
 const evidence=validatePGSEvaluationLibrary(read('pgs-evaluation')),library=read('pgs-library');
 assert.deepEqual(evidence.models.map(m=>m.id).sort(),library.models.map(m=>m.id).sort());
 for(const m of evidence.models){
  assert.equal(m.originalSha256,library.models.find(x=>x.id===m.id).sourceFiles.original.sha256);
  const metadataBytes=readFileSync(new URL('./fixtures/pgs/evidence/'+m.id+'.json',import.meta.url)),metadata=JSON.parse(metadataBytes);
  assert.equal(createHash('sha256').update(metadataBytes).digest('hex'),m.development.metadataSource.sha256);
  assert.deepEqual(m.development.metadataSource,library.models.find(x=>x.id===m.id).sourceFiles.metadata);
  assert.deepEqual(m.development.phenotypes,['samples_variants','samples_training'].flatMap(key=>(metadata[key]||[]).filter(s=>typeof s.phenotyping_free==='string'&&s.phenotyping_free.trim()).map(s=>({stage:key==='samples_variants'?'Variant-association discovery':'Score development/training',definition:s.phenotyping_free}))));
  const original=[];
  for(const source of m.sources){const bytes=readFileSync(new URL('./fixtures/pgs/evaluation/'+m.id+'-'+source.sha256+'.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);original.push(...JSON.parse(bytes).results);}
  assert.deepEqual(m.evaluations.map(r=>r.id),original.map(r=>r.id));
  for(const [i,r] of m.evaluations.entries()){
   const source=original[i];assert.equal(source.associated_pgs_id,m.id);assert.equal(r.endpoint,source.phenotyping_reported||'');assert.equal(r.covariates,source.covariates||'');assert.equal(r.comments,source.performance_comments||'');
   assert.deepEqual(r.metrics.map(v=>[v.estimate,v.lower,v.upper,v.standardError]),Object.values(source.performance_metrics||{}).flat().map(v=>[v.estimate??null,v.ci_lower??null,v.ci_upper??null,v.se??null]));
   assert.deepEqual(r.samples.map(s=>[s.count,s.cases,s.controls]),source.sampleset.samples.map(s=>[s.sample_number??null,s.sample_cases??null,s.sample_controls??null]));
   assert.deepEqual(r.samples.map(s=>[s.country,s.populationDetails]),source.sampleset.samples.map(s=>[s.ancestry_country||'',s.ancestry_additional||'']));
   assert.deepEqual(r.samples.map(s=>[s.malePercent,s.age,s.followup]),source.sampleset.samples.map(s=>[s.sample_percent_male??null,s.sample_age??null,s.followup_time??null]));
  }
 }
});
test('development definitions remain distinct from evaluation definitions without inferred equivalence',()=>{
 const evidence=read('pgs-evaluation'),model=read('pgs-library').models.find(m=>m.id==='PGS018671');
 const before=JSON.stringify(evidence),html=evaluationHtml(model,evidence);
 assert.match(html,/Compare development and evaluation definitions/);assert.match(html,/Score development\/training: 242, 376.2/);assert.match(html,/Study phenotype definition: 242.0,E05.0/);assert.match(html,/different wording alone does not prove/);
 assert.equal(JSON.stringify(evidence),before);
 const row=evidence.models.find(m=>m.id===model.id);row.development.phenotypes[0].definition='<img src=x onerror=alert(1)>';
 assert.doesNotMatch(evaluationHtml(model,validatePGSEvaluationLibrary(evidence)),/<img/);
 assert.match(evaluationHtml(model,evidence),/&lt;img/);
 for(const change of [d=>d.metadataSource.url='https://example.org',d=>d.metadataSource.sha256='bad',d=>d.phenotypes[0].stage='Assumed diagnosis',d=>d.phenotypes[0].definition='']){const altered=structuredClone(evidence);change(altered.models.find(m=>m.id===model.id).development);assert.throws(()=>validatePGSEvaluationLibrary(altered));}
 row.development.phenotypes=[];assert.match(evaluationHtml(model,evidence),/agreement with evaluation definitions is unknown/);
});
test('study age and follow-up retain source units and reject malformed intervals',()=>{
 const evidence=read('pgs-evaluation'),library=read('pgs-library');
 const m=evidence.models.find(m=>m.evaluations.some(r=>r.samples.some(s=>s.followup?.interval)));
 assert.ok(m);const html=evaluationHtml(library.models.find(x=>x.id===m.id),evidence);
 assert.match(html,/Study follow-up:/);assert.match(html,/do not establish an individual age-specific risk/);
 for(const mutate of [s=>s.malePercent=101,s=>s.age={estimate:'54',unit:'years'},s=>s.followup={interval:{type:'range',lower:20,upper:10}},s=>s.age={unit:'years',unexpected:1}]){const changed=structuredClone(evidence);mutate(changed.models[0].evaluations[0].samples[0]);assert.throws(()=>validatePGSEvaluationLibrary(changed));}
 const changed=structuredClone(evidence);const sample=changed.models.find(x=>x.id===m.id).evaluations[0].samples[0];sample.age={estimate:0,unit:'<img src=x>'};sample.malePercent=0;
 const escaped=evaluationHtml(library.models.find(x=>x.id===m.id),validatePGSEvaluationLibrary(changed));assert.match(escaped,/estimate 0/);assert.match(escaped,/participants: 0%/);assert.match(escaped,/&lt;img/);assert.doesNotMatch(escaped,/<img/);
});
test('study evidence is bound to the scoring file, escaped, and never interpreted as personal risk',()=>{
 const evidence=read('pgs-evaluation'),model=read('pgs-library').models.find(m=>m.id==='PGS018956'),before=JSON.stringify(model);
 const row=evaluationForModel(model,evidence);assert.ok(row);assert.equal(row.evaluations[0].samples[0].cases,185);
 const html=evaluationHtml(model,evidence);assert.match(html,/not your predicted risk or GA performance/);assert.match(html,/sex, age, array, PCs 1-10/);assert.match(html,/Sample sets can overlap/);
 assert.equal(evaluationHtml({...model,sourceFiles:{original:{sha256:'0'.repeat(64)}}},evidence),'');
 row.evaluations[0].endpoint='<img src=x onerror=alert(1)>';const escaped=evaluationHtml(model,evidence);assert.match(escaped,/&lt;img/);assert.doesNotMatch(escaped,/<img/);
 assert.equal(JSON.stringify(model),before);
 const celiac=read('pgs-library').models.find(m=>m.id==='PGS001894');
 assert.match(evaluationHtml(celiac,evidence),/UK \(\+ Ireland\)/);
 assert.match(evaluationHtml(celiac,evidence),/Poland \(NE Europe\)/);
});
test('evaluation validation rejects wrong source, duplicate records and malformed numeric values',()=>{
 const evidence=read('pgs-evaluation');
 for(const mutate of [m=>m.sources[0].url='https://example.org/rest/performance/search?pgs_id='+m.id,m=>m.originalSha256='bad',m=>m.evaluations.push(m.evaluations[0]),m=>m.evaluations[0].metrics[0].estimate='not numeric',m=>m.evaluations[0].samples[0].count=-1]){const changed=structuredClone(evidence);mutate(changed.models[0]);assert.throws(()=>validatePGSEvaluationLibrary(changed));}
});

test('development evidence cannot drift from the installed metadata snapshot',()=>{
 const evidence=read('pgs-evaluation'),model=read('pgs-library').models[0];
 assert.ok(evaluationForModel(model,evidence));
 for(const mutate of [m=>m.sourceFiles.metadata.sha256='0'.repeat(64),m=>m.sourceFiles.metadata.url='https://example.org',m=>delete m.sourceFiles.metadata]){
  const altered=structuredClone(model);mutate(altered);assert.equal(evaluationForModel(altered,evidence),null);assert.equal(evaluationHtml(altered,evidence),'');
 }
 const altered=structuredClone(evidence);altered.models[0].evaluations[0].metrics[0].standardError=-0.01;
 assert.throws(()=>validatePGSEvaluationLibrary(altered),/Invalid study metric/);
 altered.models[0].evaluations[0].metrics[0].standardError=0;assert.doesNotThrow(()=>validatePGSEvaluationLibrary(altered));
});
test('saved score reports preserve exact evidence binding without changing missing-genotype scores',()=>{
 const library=read('pgs-library'),evidence=read('pgs-evaluation');
 const scores=calculatePGS(library,{format:'VCF',build:'GRCh38',results:[]});
 const report={syntheticDemo:true,build:'GRCh38',stats:{records:0},warnings:[],results:[],polygenicScores:scores.map(m=>({...m,hypotheticalEstimate:{population:'EUR'},referenceComparison:{point:null}}))};
 const bytes=JSON.stringify(saveWorkspace(report,{},'Synthetic evidence binding test'));assert.ok(Buffer.byteLength(bytes)<150_000_000,'Complete installed report must fit the app saved-file bound');
 const saved=validateSaved(JSON.parse(bytes));
 const before=JSON.stringify(saved);
 for(const score of saved.report.polygenicScores){assert.ok(evaluationForModel(score,evidence));assert.match(evaluationHtml(score,evidence),/not your predicted risk/);assert.equal(score.rawSum,null);}
 assert.equal(JSON.stringify(saved),before);
});

test('Catalog title typography becomes plain report text without changing frozen evidence or allowing markup',()=>{
 const library=read('pgs-library'),source=library.models.find(m=>m.id==='PGS001775'),before=JSON.stringify(source);
 assert.match(source.publication.title,/<i>APOE<\/i>/);
 const make=title=>{const scores=calculatePGS({...library,models:[{...source,publication:{...source.publication,title}}]},{format:'VCF',build:'GRCh38',results:[]});return {build:'GRCh38',stats:{records:0},warnings:[],results:[],polygenicScores:scores.map(m=>({...m,hypotheticalEstimate:{},referenceComparison:{point:null}}))};};
 const report=make(source.publication.title),saved=validateSaved(JSON.parse(JSON.stringify(saveWorkspace(report,{},''))));
 assert.equal(saved.report.polygenicScores[0].publication.title,'Risk of dementia in APOE ε4 carriers is mitigated by a polygenic risk score.');
 assert.deepEqual(saved.report.polygenicScores[0].sourceFiles,source.sourceFiles);assert.equal(JSON.stringify(source),before);
 for(const title of ['<img src=x onerror=alert(1)>','<script>alert(1)</script>','javascript:alert(1)','<i onclick=alert(1)>Title</i>'])assert.throws(()=>validateSaved(make(title)),/Unsafe URL or embedded markup/);
});

test('evaluation inventory shares the 400-model workload bound without weakening evidence limits',()=>{
 const source=read('pgs-evaluation').models[0];
 const models=Array.from({length:400},(_,i)=>{const id='PGS'+String(800000+i);return {...structuredClone(source),id,sources:source.sources.map(s=>({...s,url:'https://www.pgscatalog.org/rest/performance/search?pgs_id='+id})),development:{...source.development,metadataSource:{...source.development.metadataSource,url:'https://www.pgscatalog.org/rest/score/'+id}}};});
 const evidence={version:1,retrievedAt:'2026-09-22T00:00:00Z',models};assert.equal(validatePGSEvaluationLibrary(evidence).models.length,400);
 assert.throws(()=>validatePGSEvaluationLibrary({...evidence,models:[...models,models[0]]}),/Invalid PGS evaluation evidence library/);
 const oversized=structuredClone(evidence);oversized.models[0].evaluations=Array(1001).fill(source.evaluations[0]);assert.throws(()=>validatePGSEvaluationLibrary(oversized),/Invalid score evaluation inventory/);
});
