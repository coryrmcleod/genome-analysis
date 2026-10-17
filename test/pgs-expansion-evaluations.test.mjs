import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {projectEvaluationRecord} from '../scripts/pgs-evaluation-projection.mjs';
import {EVALUATION_REVIEW_EXCLUSIONS} from '../scripts/pgs-evaluation-review-exclusions.mjs';
import {importEvaluations} from '../scripts/import-pgs-evaluations.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateExpansionEvaluations as validate,verifyExpansionEvaluationEvidence as verify} from '../scripts/validate-expansion-evaluations.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
const library=read('pgs-library'),evidence=read('pgs-evaluation');
test('known metric conflicts reject before source access and preserve staged files with a clean CLI failure',async()=>{
 const stage=fs.mkdtempSync(join(tmpdir(),'pgs-evaluation-conflict-'));
 const originalFetch=globalThis.fetch;let requests=0;
 const snapshots={'pgs-evaluation.json':'previous evidence\n','evaluation-audit.json':'previous audit\n','pgs-evaluation.json.next':'previous pending file\n'};
 try{
  fs.writeFileSync(join(stage,'pgs-library.json'),JSON.stringify({models:[{id:'PGS003748'}]}));
  for(const [name,bytes] of Object.entries(snapshots))fs.writeFileSync(join(stage,name),bytes);
  globalThis.fetch=()=>{requests++;throw Error('Unexpected network request');};
  await assert.rejects(()=>importEvaluations(['--stage',stage]),/primary evaluation metric unresolved/);
  assert.equal(requests,0);
  const result=spawnSync(process.execPath,['scripts/import-pgs-evaluations.mjs','--stage',stage],{encoding:'utf8',cwd:new URL('../',import.meta.url)});
  assert.equal(result.status,1);assert.equal(result.signal,null);
  assert.match(result.stderr,/primary evaluation metric unresolved/);
  assert.doesNotMatch(result.stderr,/Assertion failed|UV_HANDLE_CLOSING|at file:/);
  assert.equal(result.stdout,'');
  for(const [name,bytes] of Object.entries(snapshots))assert.equal(fs.readFileSync(join(stage,name),'utf8'),bytes);
  assert.deepEqual(fs.readdirSync(stage).sort(),['pgs-library.json',...Object.keys(snapshots)].sort());
 }finally{globalThis.fetch=originalFetch;fs.rmSync(stage,{recursive:true,force:true});}
});
test('a frozen but conflicting primary metric cannot be published or silently replaced',()=>{
 const proof=EVALUATION_REVIEW_EXCLUSIONS.PGS003748;
 const bytes=fs.readFileSync(new URL('./fixtures/pgs/evaluation/PGS003748-'+proof.sourceSha256+'.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.sourceSha256);
 const record=projectEvaluationRecord(JSON.parse(bytes).results[0],'PGS003748');
 assert.equal(record.id,proof.record);assert.equal(record.endpoint,'Cigarettes per day');
 assert.deepEqual(record.metrics.map(m=>[m.name,m.estimate,m.lower,m.upper]),[['Odds Ratio',0.68,0.43,0.93]]);
 const model={...library.models[0],id:'PGS003748'},row={...structuredClone(evidence.models[0]),id:model.id,evaluations:[record],sources:[{url:'https://www.pgscatalog.org/rest/performance/search?pgs_id=PGS003748',sha256:proof.sourceSha256}]};
 row.development.metadataSource.url='https://www.pgscatalog.org/rest/score/PGS003748';
 const candidate={...evidence,models:[row]},candidateLibrary={...library,models:[model]};
 assert.throws(()=>validate(candidate,candidateLibrary),/primary evaluation metric unresolved/);
 const before=JSON.stringify(candidate);assert.throws(()=>validate(candidate,candidateLibrary));assert.equal(JSON.stringify(candidate),before);
 row.evaluations[0].metrics[0].name='Beta';assert.throws(()=>validate(candidate,candidateLibrary),/primary evaluation metric unresolved/);
 row.sources[0].sha256='a'.repeat(64);assert.throws(()=>validate(candidate,candidateLibrary),/evidence changed.*re-review/);
});
test('complete installed evaluation evidence stages from frozen local sources without changing metrics',async()=>{
 const stage=fs.mkdtempSync(join(tmpdir(),'pgs-evaluation-local-'));
 const originalFetch=globalThis.fetch;let requests=0;
 try{
  fs.writeFileSync(join(stage,'pgs-library.json'),JSON.stringify(library));
  globalThis.fetch=()=>{requests++;throw Error('Unexpected network request');};
  const result=await importEvaluations(['--stage',stage]);
  assert.equal(requests,0);assert.deepEqual(result.models,evidence.models);
  assert.deepEqual(JSON.parse(fs.readFileSync(join(stage,'pgs-evaluation.json'),'utf8')),result);
  assert.deepEqual(JSON.parse(fs.readFileSync(join(stage,'evaluation-audit.json'),'utf8')),{models:library.models.length,failures:[]});
  assert.equal(fs.existsSync(join(stage,'pgs-evaluation.json.next')),false);
 }finally{globalThis.fetch=originalFetch;fs.rmSync(stage,{recursive:true,force:true});}
});
test('publication evidence requires complete ordered model inventory and both provenance bindings',()=>{
 assert.equal(validate(evidence,library),evidence);
 assert.throws(()=>validate({...evidence,models:evidence.models.slice(1)},library),/inventory/);
 assert.throws(()=>validate({...evidence,models:[...evidence.models].reverse()},library),/inventory/);
 for(const change of [m=>m.originalSha256='a'.repeat(64),m=>m.development.metadataSource.sha256='a'.repeat(64),m=>delete m.development,m=>m.evaluations=[],m=>m.sources.push({...m.sources[0]})]){
  const changed=structuredClone(evidence);change(changed.models[0]);assert.throws(()=>validate(changed,library));
 }
});
test('publication evidence must reproduce every frozen page, metric and development definition',async()=>{
 const before=JSON.stringify(evidence);assert.equal(await verify(evidence,library),evidence);assert.equal(JSON.stringify(evidence),before);
 const one={...evidence,models:[structuredClone(evidence.models[0])]},lib={...library,models:[library.models[0]]};
 for(const change of [m=>m.evaluations[0].metrics[0].estimate+=0.001,m=>m.evaluations.pop(),m=>m.sources[0].url+='&offset=50',m=>m.development.phenotypes.push({stage:'Score development/training',definition:'Invented definition'})]){
  const changed=structuredClone(one);change(changed.models[0]);await assert.rejects(()=>verify(changed,lib),/projection|pagination|Missing published/);
 }
});
test('evaluation staging rejects malformed CLI options before any source access',()=>{
 for(const args of [['unknown'],['--stage'],['--stage','--refresh'],['--refresh','--refresh'],['--stage','a','--stage','b']]){
  const result=spawnSync(process.execPath,['scripts/import-pgs-evaluations.mjs',...args],{encoding:'utf8',cwd:new URL('../',import.meta.url)});
  assert.equal(result.status,1);assert.match(result.stderr,/Usage: import-pgs-evaluations/);
 }
});
