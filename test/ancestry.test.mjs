import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateAncestryChallenges} from '../public/ancestry-challenges.js';
import {validateAncestryReference,ancestryTargetCatalog,estimateAncestry,identifiableAncestryInformation} from '../public/ancestry.js';
import {analyzeText} from '../public/engine.js';
import {ancestryHtml,ancestryComparisonHtml} from '../public/ancestry-view.js';
import {validateSaved,saveWorkspace} from '../public/workspace.js';
const panel=validateAncestryReference(JSON.parse(await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url))));
const fixtures=JSON.parse(await readFile(new URL('./fixtures/ancestry/public-fixtures.json',import.meta.url)));
const calls=f=>({build:'GRCh38',format:'VCF',results:panel.markers.map((m,i)=>({id:m.id,status:f.dosages[i]===null?'No call':'Called',alleles:f.dosages[i]===null?null:Array.from({length:2},(_,j)=>j<f.dosages[i]?m.alt:m.mappings.GRCh38.ref)}))});
function vcf(f,{build='GRCh38',select=()=>true,transform=x=>x}={}){
 const rows=panel.markers.flatMap((m,i)=>{if(!select(f.dosages[i],i))return [];const a=m.mappings[build],d=f.dosages[i],gt=d===null?'./.':d===0?'0/0':d===1?'0/1':'1/1';return [transform(`${a.chrom}\t${a.position}\t${m.id}\t${a.ref}\t${m.alt}\t.\tPASS\t.\tGT:GQ:DP\t${gt}:40:30`,i)];});
 return `##fileformat=VCFv4.2\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPUBLIC_REFERENCE\n`+rows.join('\n');
}
const scan=(text,options={})=>analyzeText(text,ancestryTargetCatalog(panel),{ancestryReference:panel,...options});
test('ancestry reference rejects missing frequency slots before likelihood calculation',()=>{
 for(const key of ['frequencies','populationFrequencies'])for(const index of [0,panel.markers[0][key].length-1]){
  const reference=structuredClone(panel);delete reference.markers[0][key][index];
  assert.throws(()=>validateAncestryReference(reference),/Invalid ancestry allele frequencies/);
  assert.equal(Object.hasOwn(reference.markers[0][key],index),false);
 }
 assert.equal(validateAncestryReference(panel),panel);
});
test('direct ancestry estimator excludes strings and sparse genotypes from every fitted statistic',()=>{
 const report=calls(fixtures[1]),original=report.results.find(r=>r.status==='Called'),marker=panel.markers.find(m=>m.id===original.id),before=JSON.stringify(report);
 const excluded={...report,results:report.results.map(r=>r.id===original.id?{...r,alleles:[null,null]}:r)},expected=estimateAncestry(excluded,panel);
 for(const alleles of [marker.mappings.GRCh38.ref.repeat(2),Array(2),[,marker.alt],[marker.alt,],{0:marker.alt,1:marker.alt,length:2}]){
  const results=report.results.map(r=>r.id===original.id?{...r,alleles}:r);assert.deepEqual(estimateAncestry({...report,results},panel),expected);
 }
 assert.equal(expected.usableMarkers,estimateAncestry(report,panel).usableMarkers-1);assert.equal(JSON.stringify(report),before);
});
test('direct ancestry estimator withholds conflicting duplicate calls regardless of order and retains identical diploid calls',()=>{
 const report=calls(fixtures[1]),original=report.results.find(r=>r.status==='Called'),marker=panel.markers.find(m=>m.id===original.id),conflict={...original,alleles:original.alleles.every(a=>a===marker.alt)?[marker.mappings.GRCh38.ref,marker.mappings.GRCh38.ref]:[marker.alt,marker.alt]};
 const excluded={...report,results:report.results.map(r=>r.id===original.id?{...r,status:'Conflicting records',alleles:null}:r)},expected=estimateAncestry(excluded,panel),before=JSON.stringify(report);
 for(const results of [[...report.results,conflict],[conflict,...report.results],[...report.results,conflict,original]])assert.deepEqual(estimateAncestry({...report,results},panel),expected);
 const baseline=estimateAncestry(report,panel),identical={...original,alleles:original.alleles.slice().reverse()};assert.deepEqual(estimateAncestry({...report,results:[...report.results,identical]},panel),baseline);
 assert.equal(expected.usableMarkers,baseline.usableMarkers-1);assert.equal(expected.callStatuses['Conflicting records'],1);assert.equal(JSON.stringify(report),before);
});
test('population-exclusion aggregate maximum must agree with its exhaustive subgroup rows',()=>{
 const original=panel.validation.referenceChallenges;
 for(const maximum of [0,1]){
  const bad=structuredClone(original);bad.populationExcluded.maximumFractionChange=maximum;bad.populationExcluded.percentile95FractionChange=0;
  assert.throws(()=>validateAncestryChallenges(bad),/challenge evidence/);
  const reference=structuredClone(panel);reference.validation.referenceChallenges=bad;
  assert.throws(()=>validateAncestryReference(reference),/challenge evidence/);
  const report=structuredClone(scan(vcf(fixtures[0])));report.ancestry.validation.referenceChallenges=bad;
  assert.throws(()=>validateSaved(report),/challenge evidence/);
 }
 assert.equal(validateAncestryChallenges(original),original);
});

test('population-exclusion accuracy combines subgroup means by sample count',()=>{
 const original=panel.validation.referenceChallenges;
 const bad=structuredClone(original);bad.populationExcluded.dominantAccuracy=0;
 assert.throws(()=>validateAncestryChallenges(bad),/challenge evidence/);
 const reference=structuredClone(panel);reference.validation.referenceChallenges=bad;
 assert.throws(()=>validateAncestryReference(reference),/challenge evidence/);
 const report=structuredClone(scan(vcf(fixtures[0])));report.ancestry.validation.referenceChallenges=bad;
 assert.throws(()=>validateSaved(report),/challenge evidence/);
 const historical=structuredClone(original);historical.populationExcluded.dominantAccuracy=null;
 for(const row of Object.values(historical.populationExcludedByGroup))row.dominantAccuracy=null;
 assert.equal(validateAncestryChallenges(historical),historical);
 assert.equal(validateAncestryChallenges(original),original);
});

test('challenge accuracy must represent integer correct classifications at reference and saved boundaries',()=>{
 const original=panel.validation.referenceChallenges,bad=structuredClone(original);
 for(const r of Object.values(bad.populationExcludedByGroup))r.dominantAccuracy=.123;
 bad.populationExcluded.dominantAccuracy=.123;
 assert.throws(()=>validateAncestryChallenges(bad),/challenge evidence/);
 const reference=structuredClone(panel);reference.validation.referenceChallenges=bad;
 assert.throws(()=>validateAncestryReference(reference),/challenge evidence/);
 const report=structuredClone(scan(vcf(fixtures[0])));report.ancestry.validation.referenceChallenges=bad;
 assert.throws(()=>validateSaved(report),/challenge evidence/);
 let checked=0;
 for(const r of [...Object.values(original.populationExcludedByGroup),original.populationExcluded])for(let i=0;i<=r.count;i++){
  const good=structuredClone(original);
  for(const row of Object.values(good.populationExcludedByGroup))row.dominantAccuracy=null;
  good.populationExcluded.dominantAccuracy=null;
  good.missingness.random={...good.missingness.random,count:r.count,passing:r.count,dominantAccuracy:i/r.count};
  assert.equal(validateAncestryChallenges(good),good);checked++;
 }
 assert.equal(checked,1106);assert.equal(validateAncestryChallenges(original),original);
});

test('main validation accuracy represents integer correct counts at reference and saved boundaries',()=>{
 for(const change of [v=>{v.populationTop1Accuracy=.123;v.populationTop5Accuracy=.456;},v=>{v.broadGroups.OCE.dominantGroupAccuracy=.123;}]){
  const bad=structuredClone(panel);change(bad.validation);
  assert.throws(()=>validateAncestryReference(bad),/validation evidence/);
  const report=structuredClone(scan(vcf(fixtures[0])));change(report.ancestry.validation);
  assert.throws(()=>validateSaved(report),/validation evidence/);
 }
 for(let correct=0;correct<=4;correct++){
  const good=structuredClone(panel);good.validation.broadGroups.OCE.dominantGroupAccuracy=correct/4;
  assert.equal(validateAncestryReference(good),good);
 }
 assert.equal(validateAncestryReference(panel),panel);
 const valid=structuredClone(panel);valid.validation.populationTop1Accuracy=1/valid.validation.heldOutSamples;valid.validation.populationTop5Accuracy=2/valid.validation.heldOutSamples;
 assert.equal(validateAncestryReference(valid),valid);
});

test('installed ancestry reference has complete dual-build identities and public validation provenance',()=>{
 assert.ok(panel.markers.length>=3000);assert.ok(panel.populations.length>=70);assert.ok(panel.validation.heldOutSamples>=300);
 assert.equal(panel.sources.kg.sha256,'a3749573b7f2bdbafbe724a13bf111d7fe0ba4c9daa18db0b8a68bb95094fca9');
 for(const changes of [p=>p.markers[0].frequencies[0]=NaN,p=>p.markers[0].mappings.GRCh38.ref='N',p=>p.markers[1].id=p.markers[0].id,p=>p.minimumCoverage=.1]){const bad=structuredClone(panel);changes(bad);assert.throws(()=>validateAncestryReference(bad));}
});
test('browser estimator independently agrees with Python reference fits across seven held-out public genomes',()=>{
 assert.equal(fixtures.length,7);
 for(const f of fixtures){const result=estimateAncestry(calls(f),panel);assert.equal(result.status,'Estimated',f.publicSample+' '+result.reason);
  for(let i=0;i<7;i++){const row=result.groups.find(g=>g.code===panel.groups[i].code);assert.ok(Math.abs(row.fraction-f.expectedFractions[i])<2e-7,f.publicSample+' '+row.code);assert.ok(row.sensitivityLow<=row.fraction&&row.sensitivityHigh>=row.fraction);}
  assert.ok(Math.abs(result.residual-f.expectedResidual)<2e-7);assert.ok(Math.abs(result.groups.reduce((s,g)=>s+g.fraction,0)-1)<1e-10);
 }
});
test('reference metadata cannot produce an unsaveable version or blank reference identity',()=>{
 for(const change of [p=>p.version='',p=>p.version=' ',p=>p.version='x'.repeat(65),p=>p.groups[0].code='',p=>p.groups[0].code=' ',p=>p.populations[0].code='',p=>p.populations[0].code=' ',p=>p.groups[0].sampleCount=Number.MAX_SAFE_INTEGER+1,p=>p.populations[0].sampleCount=Number.MAX_SAFE_INTEGER+1]){
  const bad=structuredClone(panel);change(bad);assert.throws(()=>validateAncestryReference(bad),/ancestry reference|ancestry group|ancestry population/);
 }
 assert.equal(validateAncestryReference(panel),panel);
});

test('invalid descriptive ancestry benchmarks cannot enter references or saved reports',()=>{
 const changes=[v=>v.populationTop1Accuracy=12,v=>v.populationTop5Accuracy=-.1,v=>v.populationTop1Accuracy=v.populationTop5Accuracy+.01,v=>v.heldOutSamples=Number.MAX_SAFE_INTEGER+1,v=>v.broadGroups.AFR.heldOutSamples=v.heldOutSamples,v=>v.broadGroups.AFR.minimumAssignedFraction=1,v=>v.broadGroups.AFR.dominantGroupAccuracy=NaN,v=>delete v.broadGroups.OCE,v=>v.simulatedHalfMixtures.medianMaximumAbsoluteFractionError=-.2,v=>v.simulatedHalfMixtures.percentile95MaximumAbsoluteFractionError=.01,v=>v.simulatedHalfMixtures.count=0,v=>v.independentOptimizationCheck.maximumAbsoluteFractionDifference=Infinity,v=>v.heterozygosityScreen.minimumHeldOut=1,v=>v.referenceChallenges.heldOutSamples++];
 const original=estimateAncestry(calls(fixtures[1]),panel);
 for(const change of changes){
  const bad=structuredClone(panel);change(bad.validation);assert.throws(()=>validateAncestryReference(bad),/validation evidence|challenge evidence/);
  const report={results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:structuredClone(original)};change(report.ancestry.validation);
  assert.throws(()=>validateSaved(report),/validation evidence|challenge evidence/);
 }
 const historical=structuredClone(original);delete historical.validation.referenceChallenges;delete historical.validation.independentOptimizationCheck;delete historical.validation.heterozygosityScreen;
 assert.equal(validateSaved({results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:historical}).report.ancestry.status,'Estimated');
 assert.equal(panel.validation.populationTop1Accuracy,.7430340557275542);
});
test('indistinguishable reference components are rejected in full, usable and chromosome fits',()=>{
 const duplicate=structuredClone(panel);for(const m of duplicate.markers)m.frequencies[1]=m.frequencies[0];
 assert.throws(()=>validateAncestryReference(duplicate),/cannot distinguish/);
 const dependent=structuredClone(panel);for(const m of dependent.markers)m.frequencies[6]=(m.frequencies[0]+m.frequencies[1])/2;
 assert.throws(()=>validateAncestryReference(dependent),/cannot distinguish/);
 const unsupported=estimateAncestry(calls(fixtures[1]),duplicate);assert.equal(unsupported.status,'Unavailable');assert.match(unsupported.reason,/Usable markers cannot distinguish/);assert.deepEqual(unsupported.groups,[]);assert.deepEqual(unsupported.populationAffinities,[]);
 const concentrated=structuredClone(panel);concentrated.residualLimit=100;
 for(const m of concentrated.markers)if(m.mappings.GRCh38.chrom!=='1')m.frequencies[1]=m.frequencies[0];
 validateAncestryReference(concentrated);
 const missing=calls(fixtures[1]);missing.results=missing.results.filter(r=>panel.markers.find(m=>m.id===r.id).mappings.GRCh38.chrom!=='1');
 const incomplete=estimateAncestry(missing,concentrated);assert.ok(incomplete.coverage>=.9);assert.equal(incomplete.status,'Unavailable');assert.match(incomplete.reason,/Usable markers cannot distinguish/);
 const sensitivity=estimateAncestry(calls(fixtures[1]),concentrated);assert.equal(sensitivity.status,'Unavailable');assert.match(sensitivity.reason,/Chromosome sensitivity markers cannot distinguish/);assert.deepEqual(sensitivity.groups,[]);assert.deepEqual(sensitivity.populationAffinities,[]);
});

test('training sample inventories preserve admixed references and reject contradictory counts',()=>{
 assert.equal(panel.populations.reduce((n,p)=>n+p.sampleCount,0),panel.validation.trainingSamples);
 const admixed=panel.populations.filter(p=>p.region==='ADMIXED').reduce((n,p)=>n+p.sampleCount,0);
 assert.equal(panel.groups.reduce((n,g)=>n+g.sampleCount,0)+admixed,panel.validation.trainingSamples);assert.ok(admixed>0);
 for(const change of [p=>p.validation.trainingSamples=1,p=>p.groups[0].sampleCount++,p=>p.populations[0].sampleCount++,p=>p.populations.find(pop=>pop.region==='ADMIXED').sampleCount++]){
  const bad=structuredClone(panel);change(bad);assert.throws(()=>validateAncestryReference(bad),/training sample inventories/);
 }
 const original=estimateAncestry(calls(fixtures[1]),panel);
 for(const change of [a=>a.validation.trainingSamples=1,a=>a.groups[0].sampleCount=Number.MAX_SAFE_INTEGER+1,a=>a.populationAffinities[0].sampleCount=Number.MAX_SAFE_INTEGER+1,a=>a.populationAffinities[0].sampleCount=a.validation.trainingSamples]){
  const a=structuredClone(original);change(a);assert.throws(()=>validateSaved({results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:a}),/Invalid saved ancestry/);
 }
 const historical=structuredClone(original);delete historical.validation;
 assert.equal(validateSaved({results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:historical}).report.ancestry.status,'Estimated');
});
test('simplex information rank is scale invariant and rejects numerically unresolved directions',()=>{
 const full=Array.from({length:7},(_,i)=>Array.from({length:7},(_,j)=>i===j&&i<6?1:0)),snapshot=JSON.stringify(full);
 for(const scale of [1e-12,1,1e12])assert.equal(identifiableAncestryInformation(full.map(r=>r.map(v=>v*scale)),11348),true);
 const unresolved=structuredClone(full);unresolved[5][5]=Number.EPSILON;assert.equal(identifiableAncestryInformation(unresolved,11348),false);
 assert.equal(identifiableAncestryInformation(full.map(r=>r.map(()=>0)),11348),false);
 assert.equal(JSON.stringify(full),snapshot);
});
test('VCF scanning produces the same ancestry from both verified genome builds',()=>{
 const f=fixtures[1],r37=scan(vcf(f,{build:'GRCh37'})),r38=scan(vcf(f));
 assert.equal(r37.ancestry.status,'Estimated');assert.equal(r38.ancestry.status,'Estimated');assert.deepEqual(r37.ancestry.groups,r38.ancestry.groups);
 assert.equal(r37.ancestry.usableMarkerMaskHex,r38.ancestry.usableMarkerMaskHex);
 assert.throws(()=>scan(vcf(f),{build:'GRCh37'}),/disagrees/);
});
test('variants-only and insufficient coverage withhold ancestry without reference-genotype substitution',()=>{
 const f=fixtures[1],variantOnly=scan(vcf(f,{select:d=>d>0})),sparse=scan(vcf(f,{select:(_,i)=>i%2===0}));
 for(const r of [variantOnly,sparse]){assert.equal(r.ancestry.status,'Unavailable');assert.deepEqual(r.ancestry.groups,[]);assert.deepEqual(r.ancestry.populationAffinities,[]);assert.ok(r.ancestry.coverage<.9);}
 assert.equal(variantOnly.ancestry.referenceHomozygotes,0);
 const artificial=calls(f);for(const [i,r] of artificial.results.entries()){r.status='Called';r.alleles=Array(2).fill(panel.markers[i].mappings.GRCh38.ref);}assert.equal(estimateAncestry(artificial,panel).status,'Unavailable');
});
test('failed quality, conflicting calls and overlapping indels cannot contribute to ancestry',()=>{
 const f=fixtures[1],m=panel.markers[0],a=m.mappings.GRCh38;
 const bad=scan(vcf(f,{transform:(line,i)=>i<Math.ceil(panel.markers.length*.2)?line.replace(':40:30',':5:2'):line}));assert.equal(bad.ancestry.status,'Unavailable');assert.ok(bad.ancestry.callStatuses['Quality limited']>0);
 const duplicate=scan(vcf(f)+`\n${a.chrom}\t${a.position}\t${m.id}\t${a.ref}\t${m.alt}\t.\tPASS\t.\tGT:GQ:DP\t${f.dosages[0]===2?'0/0':'1/1'}:40:30`);
 assert.ok(duplicate.ancestry.callStatuses['Conflicting records']>=1);
 const overlap=scan(vcf(f)+`\n${a.chrom}\t${a.position-1}\t.\tA${a.ref}\tA\t.\tPASS\t.\tGT:GQ:DP\t0/1:40:30`);
 assert.ok(overlap.ancestry.callStatuses['Overlapping records']>=1);
});
test('exact forward-strand consumer calls work but incorrect marker identities are excluded',()=>{
 const f=fixtures[1],text='# AncestryDNA\n# reference=GRCh38\nrsid chromosome position allele1 allele2\n'+panel.markers.map((m,i)=>{const a=m.mappings.GRCh38,d=f.dosages[i];return `${m.id}\t${a.chrom}\t${a.position}\t${d===null?'0':d>0?m.alt:a.ref}\t${d===null?'0':d===2?m.alt:a.ref}`;}).join('\n');
 const good=scan(text);assert.equal(good.ancestry.status,'Estimated');assert.ok(good.ancestry.warnings.some(w=>w.includes('Consumer-array')));
 const bad=scan(text.replaceAll(/rs\d+/g,'rs999999999999'));assert.equal(bad.ancestry.status,'Unavailable');assert.equal(bad.ancestry.usableMarkers,0);
});
test('ancestry results survive saved-workspace round trips and invalid fractions are rejected',()=>{
 const report={results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:estimateAncestry(calls(fixtures[1]),panel)};
 const saved=JSON.parse(JSON.stringify(saveWorkspace(report,{activeView:'ancestry'},'')));assert.deepEqual(validateSaved(saved).report.ancestry,report.ancestry);
 const bad=structuredClone(saved);bad.report.ancestry.groups[0].fraction=2;assert.throws(()=>validateSaved(bad),/ancestry/);
});
test('ancestry view labels uncertainty and escapes untrusted saved labels',()=>{
 const result=estimateAncestry(calls(fixtures[1]),panel);result.groups[0].label='<img src=x onerror=alert(1)>';
 const html=ancestryHtml(result);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(html.includes('not country percentages'));assert.ok(html.includes('not calibrated confidence intervals'));
 assert.ok(ancestryHtml(null).includes('Reanalyze'));assert.ok(ancestryHtml(result,{demo:true}).includes('not your ancestry'));
 assert.ok(ancestryComparisonHtml(null,result).includes('Not analyzed'));assert.ok(ancestryComparisonHtml(result,result).includes('not a biological ancestry change'));
});

test('reopened ancestry rejects contradictory fits and duplicate reference identities',()=>{
 const report={results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:estimateAncestry(calls(fixtures[1]),panel)};
 for(const change of [a=>a.groups[1].code=a.groups[0].code,a=>a.groups[0]=null,a=>a.chromosomes=19,a=>a.residual=a.residualLimit+1,a=>a.populationAffinities[0].meanLogLikelihood=null,a=>a.populationAffinities[1].code=a.populationAffinities[0].code,a=>a.warnings.push(42),a=>a.status='Unavailable']){
  const bad=structuredClone(report);change(bad.ancestry);assert.throws(()=>validateSaved(bad),/Invalid saved ancestry/);
 }
 const sparse=structuredClone(report);sparse.ancestry=estimateAncestry({...calls(fixtures[1]),results:[]},panel);assert.equal(validateSaved(sparse).report.ancestry.status,'Unavailable');
});
test('saved ancestry rejects contradictory input provenance and failed genotype screens',()=>{
 const report={results:[],polygenicScores:[],build:'GRCh38',format:'VCF',stats:{records:5000},warnings:[],ancestry:estimateAncestry(calls(fixtures[1]),panel)};
 for(const change of [a=>a.build='GRCh37',a=>a.inputFormat='23andMe',a=>delete a.method,a=>a.method=17,a=>a.referenceVersion='',a=>a.referenceHomozygotes=0,a=>a.heterozygotes=0,a=>a.heterozygotes=a.usableMarkers,a=>a.referenceHomozygotes=a.usableMarkers,a=>a.residual=-.1]){
  const bad=structuredClone(report);change(bad.ancestry);assert.throws(()=>validateSaved(bad),/ancestry/i);
 }
 assert.deepEqual(validateSaved(JSON.parse(JSON.stringify(saveWorkspace(report,{},'')))).report.ancestry,report.ancestry);
});
test('ancestry comparisons identify changed and unknown methods without attributing differences to biology',()=>{
 const before=estimateAncestry(calls(fixtures[1]),panel),after=structuredClone(before);after.method='historical-frequency-fit';const snapshot=JSON.stringify([before,after]);
 assert.ok(ancestryComparisonHtml(before,after).includes('Recorded fitting methods differ'));
 assert.ok(!ancestryComparisonHtml(before,before).includes('Recorded fitting methods differ'));
 const historical=structuredClone(before);delete historical.method;assert.ok(ancestryComparisonHtml(historical,after).includes('Method compatibility is unknown'));
 assert.equal(JSON.stringify([before,after]),snapshot);
});
test('saved population similarity retains valid log probabilities, reference membership and ranking',()=>{
 const report={results:[],polygenicScores:[],build:'GRCh38',format:'VCF',stats:{records:5000},warnings:[],ancestry:estimateAncestry(calls(fixtures[1]),panel)};
 const snapshot=JSON.stringify(report);
 for(const change of [a=>a.populationAffinities=[],a=>a.populationAffinities.splice(6),a=>a.populationAffinities[0].meanLogLikelihood=0,a=>a.populationAffinities[0].meanLogLikelihood=.1,a=>a.populationAffinities.reverse(),a=>a.populationAffinities[0].region='UNLISTED',a=>a.groups[0].sampleCount=4,a=>delete a.groups[0].sampleCount]){
  const bad=structuredClone(report);change(bad.ancestry);
  assert.throws(()=>validateSaved(bad),/Invalid saved ancestry/);
 }
 assert.deepEqual(validateSaved(report).report.ancestry,report.ancestry);assert.equal(JSON.stringify(report),snapshot);
 const seven=structuredClone(report);seven.ancestry.populationAffinities.pop();assert.deepEqual(validateSaved(seven).report.ancestry,seven.ancestry);
 const tied=structuredClone(report);tied.ancestry.populationAffinities[1].meanLogLikelihood=tied.ancestry.populationAffinities[0].meanLogLikelihood;assert.deepEqual(validateSaved(tied).report.ancestry,tied.ancestry);
 const admixed=structuredClone(report);admixed.ancestry.populationAffinities[0].region='ADMIXED';assert.deepEqual(validateSaved(admixed).report.ancestry,admixed.ancestry);
});

test('ancestry comparisons keep small components unresolved and preserve both reference inventories',()=>{
 const before={status:'Estimated',groups:[{code:'OLD',label:'Earlier reference',fraction:.025}]},after={status:'Estimated',groups:[{code:'NEW',label:'Current reference',fraction:.8}]};
 const html=ancestryComparisonHtml(before,after);assert.ok(html.includes('Earlier reference'));assert.ok(html.includes('Current reference'));assert.ok(html.includes('Below 5%'));assert.ok(!html.includes('2.5%'));
 const unavailable=ancestryComparisonHtml({...before,status:'Unavailable'},null);assert.ok(!unavailable.includes('Below 5%'));assert.ok(unavailable.includes('Unavailable'));
});
test('ancestry display and comparison flag unstable small-component cutoffs without changing fits',()=>{
 const a=estimateAncestry(calls(fixtures[1]),panel);
 a.groups[0]={...a.groups[0],fraction:.08,sensitivityLow:.04,sensitivityHigh:.12};
 a.groups[1]={...a.groups[1],fraction:.049,sensitivityLow:.02,sensitivityHigh:.05};
 a.groups[2]={...a.groups[2],fraction:.05,sensitivityLow:.05,sensitivityHigh:.09};
 const before=JSON.stringify(a),html=ancestryHtml(a),comparison=ancestryComparisonHtml(null,a);
 for(const text of [html,comparison]){assert.ok(text.includes('8.0% · crosses 5% display threshold'));assert.ok(text.includes('Below 5% · crosses 5% display threshold'));assert.ok(!text.includes('5.0% · crosses 5% display threshold'));}
 assert.ok(html.includes('it is not a significance test'));assert.equal(JSON.stringify(a),before);
});

test('challenge evidence preserves frozen aggregate results and independent browser/Python checks',async()=>{
 const evidence=JSON.parse(await readFile(new URL('./fixtures/ancestry/challenge-evidence.json',import.meta.url)));
 const browserBytes=await readFile(new URL('./fixtures/ancestry/challenge-browser-verification.json',import.meta.url));
 const challenges=JSON.parse(await readFile(new URL('./fixtures/ancestry/challenge-fixtures.json',import.meta.url)));
 const summary=validateAncestryChallenges(panel.validation.referenceChallenges);
 assert.equal(summary.testedReferenceSha256,evidence.referenceSha256);
 assert.equal(summary.publicGenotypesSha256,evidence.publicGenotypesSha256);
 assert.equal(summary.browserVerificationSha256,createHash('sha256').update(browserBytes).digest('hex'));
 for(const key of ['populationExcluded','populationExcludedByGroup','missingness'])assert.deepEqual(summary[key],evidence[key]);
 assert.equal(challenges.referenceSha256,summary.testedReferenceSha256);
 for(const f of challenges.cases){
  const result=estimateAncestry(calls(f),panel);assert.equal(result.status,'Estimated',f.pattern);
  for(let i=0;i<7;i++)assert.ok(Math.abs(result.groups.find(g=>g.code===panel.groups[i].code).fraction-f.expectedFractions[i])<2e-7,f.pattern);
  assert.ok(Math.abs(result.residual-f.expectedResidual)<2e-7);
 }
 const r=estimateAncestry(calls(fixtures[1]),panel),html=ancestryHtml(r);
 const maximumText=(summary.populationExcluded.maximumFractionChange*100).toFixed(1)+' percentage points',percentileText=(summary.populationExcluded.percentile95FractionChange*100).toFixed(1)+' percentage points';
 assert.ok(html.includes(maximumText));assert.ok(html.includes(percentileText));assert.ok(html.includes('Passing the coverage and fit screens does not establish precision'));
 assert.deepEqual(validateSaved({results:[],polygenicScores:[],build:'GRCh38',stats:{records:5000},warnings:[],ancestry:r}).report.ancestry.validation.referenceChallenges,summary);
 const historical=structuredClone(r);delete historical.validation.referenceChallenges;assert.ok(!ancestryHtml(historical).includes(maximumText));
});

test('challenge metadata cannot invent counts, reversed ranges or unsupported source bindings',()=>{
 const summary=panel.validation.referenceChallenges;
 for(const change of [s=>s.populationExcluded.passing=s.populationExcluded.count+1,s=>s.missingness.random.maximumFractionChange=NaN,s=>s.populationExcluded.percentile95FractionChange=1,s=>s.publicGenotypesSha256='unknown',s=>delete s.populationExcludedByGroup.MENA,s=>s.populationExcludedByGroup.EUR.count+=1,s=>s.browserVerifiedCases=0,s=>s.limitations=[null]]){
  const bad=structuredClone(summary);change(bad);assert.throws(()=>validateAncestryChallenges(bad),/challenge evidence/);
  const reference=structuredClone(panel);reference.validation.referenceChallenges=bad;assert.throws(()=>validateAncestryReference(reference),/challenge evidence/);
 }
});
