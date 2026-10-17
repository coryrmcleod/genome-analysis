import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeText} from '../public/engine.js';
import {calculatePGS,isPalindromic,validatePGSLibrary,pgsTargetCatalog} from '../public/pgs.js';
import {parseScoringFile,SELECTED_SCORES} from '../scripts/import-pgs-library.mjs';
import {termForBuild} from '../public/pgs-build-alleles.js';
import {verifyInstalledCervical} from '../scripts/import-reviewed-cervical.mjs';
const library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url)));
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
function fixture(build='GRCh38'){
  const pairs=new Map();for(const model of library.models)for(const original of model.variants){const v=termForBuild(original,build);if(v.alleleMode==='effect-only')continue;if(pairs.has(v.id))assert.deepEqual([v.effectAllele,v.otherAllele].sort(),pairs.get(v.id).slice().sort());else pairs.set(v.id,[v.effectAllele,v.otherAllele]);}
  const alleles=new Map();const rows=library.targets.map((t,i)=>{
    const m=t.mappings[build],pair=pairs.get(t.id)||m.alleles.slice(0,2),gt=isPalindromic(...pair)?pair:i%3===0?[pair[0],pair[0]]:i%3===1?pair:[pair[1],pair[1]];
    alleles.set(t.id,gt);const all=[m.ref,...m.alleles.filter(a=>a!==m.ref)];
    return [m.chrom,m.position,t.id,m.ref,all.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',`${all.indexOf(gt[0])}/${all.indexOf(gt[1])}:60:30`].join('\t');
  });return {header:`##fileformat=VCFv4.3\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n`,rows,alleles};
}
test('installed models retain every original weight and source-file hash',async()=>{
  validatePGSLibrary(library);assert.deepEqual(library.models.map(m=>m.variantCount),SELECTED_SCORES.map(m=>m.count));
  for(const m of library.models){const bytes=await readFile(new URL(`./fixtures/pgs/${m.id}.txt.gz`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sourceFiles.original.sha256);if(m.id==='PGS005165'){assert.equal(await verifyInstalledCervical(m,library.targets),true);continue;}const source=parseScoringFile(gunzipSync(bytes).toString(),{allowEffectOnly:m.variants.some(v=>v.alleleMode==='effect-only'),allowCoordinateIds:m.coordinateSource===true,reviewedNarcolepsyFixedTerms:m.id==='PGS000757'});assert.equal(source.rows.length,m.variantCount);const sourceRows=new Map(source.rows.map(r=>[r.rsID,r]));for(const t of m.variants){const r=sourceRows.get(t.sourceId);assert.equal(t.weight,Number(r.effect_weight));assert.equal(t.sourceEffectAllele??t.effectAllele,r.effect_allele);assert.equal(t.sourceOtherAllele??t.otherAllele,r.other_allele??null);}}
});
test('PGC-derived MDD score retains its exact source lineage and is not merged with the compact MDD model',()=>{
 const pgc=library.models.find(m=>m.id==='PGS000193'),compact=library.models.find(m=>m.id==='PGS004591');
 assert.equal(pgc.variantCount,1138);assert.equal(pgc.pgcSource.dataset,'OpenMed/pgc-mdd');assert.equal(pgc.pgcSource.config,'mdd2018');assert.equal(pgc.pgcSource.sourcePMID,'29700475');
 assert.ok(pgc.studySamples.variantAssociation.some(s=>String(s.source_PMID)==='29700475'&&s.cohorts.some(c=>c.name_short==='PGC')));
 assert.equal(compact.variantCount,17);assert.notEqual(pgc.id,compact.id);
 const changed=structuredClone(library);changed.models.find(m=>m.id==='PGS000193').pgcSource.url='https://example.test/data';assert.throws(()=>validatePGSLibrary(changed),/PGC score lineage/);
});
test('complete signed weighted sums agree on both builds without percentile or normalization',()=>{
  for(const build of ['GRCh37','GRCh38']){const f=fixture(build),r=analyzeText(f.header+f.rows.join('\n'),catalog,{pgsLibrary:library});assert.equal(r.scoringTargetCount,library.targets.length);for(const [i,s] of r.polygenicScores.entries()){const contributions=library.models[i].variants.map(original=>{const t=termForBuild(original,build),a=f.alleles.get(t.id),ds=[...new Set((t.alleleMode==='effect-only'?t.effectAlleleCandidates:[t.effectAllele]).map(e=>a.filter(x=>x===e).length))];return ds.length===1?ds[0]*t.weight:null;}),included=contributions.filter(x=>x!==null),expected=included.reduce((a,b)=>a+b,0);if(included.length===s.total)assert.ok(Math.abs(s.rawSum-expected)<1e-12);else assert.equal(s.rawSum,null);assert.ok(Math.abs(s.matchedSubtotal-expected)<1e-12);assert.equal(s.matched,included.length);assert.equal(s.percentile,null);}}
});
test('missing calls, failed quality and conflicting duplicate records withhold complete scores',()=>{
  const f=fixture(),first=f.rows[0],id=library.targets[0].id,baseline=analyzeText(f.header+f.rows.join('\n'),catalog,{pgsLibrary:library});
  for(const rows of [f.rows.slice(1),[first.replace(':60:30',':5:30'),...f.rows.slice(1)],[...f.rows,first.replace(':60:30',':5:30')],[first.replace('GT:GQ:DP','GT:GQ:GQ:DP').replace(':60:30',':60:2:30'),...f.rows.slice(1)],[first.replace(':60:30',':'+ '9'.repeat(400)+':30'),...f.rows.slice(1)]]){
    const r=analyzeText(f.header+rows.join('\n'),catalog,{pgsLibrary:library});for(const s of r.polygenicScores.filter(s=>s.terms.some(t=>t.id===id))){assert.equal(s.rawSum,null);assert.equal(s.matched,baseline.polygenicScores.find(m=>m.id===s.id).matched-1);assert.notEqual(s.matchedSubtotal,null);assert.equal(s.terms.find(t=>t.id===id).contribution,null);}
  }
});
test('palindromic homozygotes are withheld while heterozygous dosage is strand invariant',()=>{
  const f=fixture(),r=analyzeText(f.header+f.rows.join('\n'),pgsTargetCatalog(library));
  const t=library.models.flatMap(m=>m.variants).find(v=>isPalindromic(v.effectAllele,v.otherAllele));const call=r.results.find(v=>v.id===t.id);
  for(const base of [t.effectAllele,t.otherAllele]){call.alleles=[base,base];const s=calculatePGS(library,r).find(s=>s.terms.some(v=>v.id===t.id));assert.equal(s.terms.find(v=>v.id===t.id).status,'Strand ambiguous');assert.equal(s.rawSum,null);}
  call.alleles=[t.effectAllele,t.otherAllele];assert.equal(calculatePGS(library,r).flatMap(s=>s.terms).find(v=>v.id===t.id).dosage,1);
});
test('unmodeled third alleles are not assigned zero effect dosage',()=>{
  const f=fixture(),r=analyzeText(f.header+f.rows.join('\n'),pgsTargetCatalog(library));const t=library.models[0].variants[0],call=r.results.find(v=>v.id===t.id);call.alleles=['A','C','G','T'].filter(a=>a!==t.effectAllele&&a!==t.otherAllele);const term=calculatePGS(library,r)[0].terms[0];assert.equal(term.status,'Model allele mismatch');assert.equal(term.contribution,null);
});
test('consumer arrays do not get a sequencing-validated PGS',()=>{const f=fixture(),r=analyzeText(f.header+f.rows.join('\n'),pgsTargetCatalog(library));r.format='23andMe';for(const s of calculatePGS(library,r)){assert.equal(s.rawSum,null);assert.equal(s.matchedSubtotal,null);assert.equal(s.matched,0);}});
test('invalid weights, count changes, duplicate terms and unsupported inheritance are rejected',()=>{
  for(const change of [m=>m.variantCount--,m=>m.effectType='dominant',m=>m.variants[0].weight=NaN,m=>m.variants[1]={...m.variants[0]}]){const l=structuredClone(library);change(l.models[0]);assert.throws(()=>validatePGSLibrary(l));}
  assert.throws(()=>parseScoringFile('#variants_number=1\nrsID\teffect_allele\tother_allele\teffect_weight\tis_dominant\nrs1\tA\tG\t0.1\tTrue\n'),/Unsupported/);
});

