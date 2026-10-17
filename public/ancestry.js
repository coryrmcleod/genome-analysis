import {validateAncestryNumericalVerification} from './ancestry-numerical-verification.js';
// Aggregate public references only. Personal genotypes never leave the scanner.
import {validateAncestryChallenges} from './ancestry-challenges.js';
import {referenceTemplateSensitivity,validateReferenceTemplateSensitivity} from './ancestry-reference-sensitivity.js';
export const ANCESTRY_METHOD='supervised-frequency-simplex-wls-v1';
// Descriptive benchmarks must be coherent before reference loading or display.
// These checks validate metadata, not the underlying scientific experiment.
export function validateAncestryValidation(v,groupCodes){
 const fail=()=>{throw Error('Invalid ancestry validation evidence');};
 const count=n=>Number.isSafeInteger(n)&&n>0;
 const fraction=n=>Number.isFinite(n)&&n>=0&&n<=1;
 const countAccuracy=(accuracy,n)=>Math.abs(accuracy*n-Math.round(accuracy*n))<=1e-9;
 if(!v||!count(v.heldOutSamples)||v.heldOutSamples<100||!count(v.trainingSamples)||!fraction(v.populationTop1Accuracy)||!fraction(v.populationTop5Accuracy)||v.populationTop1Accuracy>v.populationTop5Accuracy||!fraction(v.randomTenPercentMissingMaxChange95)||!v.broadGroups||Array.isArray(v.broadGroups)||!Array.isArray(v.limitations)||v.limitations.some(s=>typeof s!=='string'))fail();
 if(JSON.stringify(Object.keys(v.broadGroups).sort())!==JSON.stringify([...groupCodes].sort()))fail();
 if(![v.populationTop1Accuracy,v.populationTop5Accuracy].every(a=>countAccuracy(a,v.heldOutSamples)))fail();
 let total=0;for(const g of Object.values(v.broadGroups)){
  if(!g||!count(g.heldOutSamples)||g.heldOutSamples>v.heldOutSamples||![g.dominantGroupAccuracy,g.medianAssignedFraction,g.minimumAssignedFraction].every(fraction)||g.minimumAssignedFraction>g.medianAssignedFraction)fail();
  total+=g.heldOutSamples;
  if(!countAccuracy(g.dominantGroupAccuracy,g.heldOutSamples))fail();
 }
 // Admixed held-out participants need not have a single broad-group label.
 if(total>v.heldOutSamples)fail();
 const m=v.simulatedHalfMixtures;
 if(!m||!count(m.count)||![m.medianMaximumAbsoluteFractionError,m.percentile95MaximumAbsoluteFractionError].every(fraction)||m.medianMaximumAbsoluteFractionError>m.percentile95MaximumAbsoluteFractionError)fail();
 if(v.independentOptimizationCheck!==undefined){const c=v.independentOptimizationCheck;if(!c||typeof c.method!=='string'||!c.method.trim()||!count(c.samples)||c.samples>v.heldOutSamples||!fraction(c.maximumAbsoluteFractionDifference))fail();}
 if(v.heterozygosityScreen!==undefined){const h=v.heterozygosityScreen;if(!h||![h.minimumHeldOut,h.maximumHeldOut,h.supportedMinimum,h.supportedMaximum].every(fraction)||h.minimumHeldOut>h.maximumHeldOut||h.supportedMinimum!==.08||h.supportedMaximum!==.6)fail();}
 if(v.referenceChallenges!==undefined){validateAncestryChallenges(v.referenceChallenges);if(v.referenceChallenges.heldOutSamples!==v.heldOutSamples)fail();}
 return v;
}
// Six contrasts span the seven-component simplex. This is a numerical rank
// screen, not a precision or population-representativeness assessment.
export function identifiableAncestryInformation(a,markers){
 const c=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>a[i][j]-a[i][6]-a[6][j]+a[6][6]));
 const scale=Math.max(...c.map((r,i)=>r[i]));if(!Number.isFinite(scale)||scale<=0)return false;
 const tolerance=Number.EPSILON*Math.max(1,markers)*scale;
 const l=Array.from({length:6},()=>Array(6).fill(0));
 for(let i=0;i<6;i++)for(let j=0;j<=i;j++){
  let v=c[i][j];for(let k=0;k<j;k++)v-=l[i][k]*l[j][k];
  if(i===j){if(!Number.isFinite(v)||v<=tolerance)return false;l[i][j]=Math.sqrt(v);}
  else l[i][j]=v/l[j][j];
 }
 return true;
}
// Saved fits must remain internally coherent before being displayed or compared.
export function validateSavedAncestry(a){
 const fail=()=>{throw Error('Invalid saved ancestry result');};
 if(Array.isArray(a?.groups)&&Array.from(a.groups).some(row=>row===undefined))fail();
 if(Array.isArray(a?.populationAffinities)&&Array.from(a.populationAffinities).some(row=>row===undefined))fail();
 if(a?.referenceSha256!==undefined&&(typeof a.referenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(a.referenceSha256)))fail();
 if(!a||!['Estimated','Unavailable'].includes(a.status)||typeof a.reason!=='string'||!Array.isArray(a.groups)||a.groups.length>7||!Array.isArray(a.populationAffinities)||a.populationAffinities.length>8||!Number.isInteger(a.usableMarkers)||!Number.isInteger(a.markerCount)||a.usableMarkers<0||a.markerCount<3000||a.markerCount>30000||a.usableMarkers>a.markerCount||!Number.isFinite(a.coverage)||a.coverage<0||a.coverage>1||Math.abs(a.coverage-a.usableMarkers/a.markerCount)>1e-9||!Array.isArray(a.warnings)||a.warnings.some(w=>typeof w!=='string'))fail();
 if(a.usableMarkerMaskHex!==undefined){
  const mask=a.usableMarkerMaskHex;
  if(typeof mask!=='string'||mask.length!==Math.ceil(a.markerCount/4)||!/^[a-f0-9]+$/.test(mask))fail();
  let count=0;for(let i=0;i<mask.length;i++){
   const n=parseInt(mask[i],16);for(let bit=0;bit<4;bit++)if(n&(8>>bit)){if(i*4+bit>=a.markerCount)fail();count++;}
  }
  if(count!==a.usableMarkers)fail();
 }
 if(a.numericalVerification!==undefined)validateAncestryNumericalVerification(a.numericalVerification,a.referenceSha256,a.validation?.heldOutSamples);
 if(a.status==='Unavailable'){if(a.groups.length||a.populationAffinities.length||a.referenceSensitivity!==undefined)fail();if(a.validation!==undefined)validateAncestryValidation(a.validation,['AFR','EUR','MENA','SAS','EAS','OCE','IAM']);return a;}
 if(!['GRCh37','GRCh38'].includes(a.build)||typeof a.method!=='string'||!a.method.trim()||a.method.length>128||typeof a.referenceVersion!=='string'||!a.referenceVersion.trim()||a.referenceVersion.length>64||typeof a.inputFormat!=='string'||!a.inputFormat.trim())fail();
 if(a.groups.length!==7||new Set(a.groups.map(g=>g?.code)).size!==7||a.groups.some(g=>!g||typeof g.code!=='string'||!g.code||typeof g.label!=='string'||![g.fraction,g.sensitivityLow,g.sensitivityHigh].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||g.sensitivityLow>g.fraction||g.sensitivityHigh<g.fraction)||Math.abs(a.groups.reduce((s,g)=>s+g.fraction,0)-1)>1e-6)fail();
 if(a.validation!==undefined)validateAncestryValidation(a.validation,a.groups.map(g=>g.code));
 if(a.usableMarkers<3000||a.coverage<.9||!Number.isInteger(a.chromosomes)||a.chromosomes<20||a.chromosomes>22||!Number.isFinite(a.residual)||a.residual<0||!Number.isFinite(a.residualLimit)||a.residualLimit<=0||a.residual>a.residualLimit||![a.referenceHomozygotes,a.heterozygotes].every(n=>Number.isInteger(n)&&n>=0)||a.referenceHomozygotes+a.heterozygotes>a.usableMarkers||a.referenceHomozygotes/a.usableMarkers<.05||a.heterozygotes/a.usableMarkers<.08||a.heterozygotes/a.usableMarkers>.6)fail();
 if(a.groups.some(g=>!Number.isSafeInteger(g.sampleCount)||g.sampleCount<5))fail();
 if(a.validation!==undefined&&a.groups.reduce((sum,g)=>sum+g.sampleCount,0)>a.validation.trainingSamples)fail();
 const groupCodes=new Set(a.groups.map(g=>g.code));
 if(a.populationAffinities.length<7||new Set(a.populationAffinities.map(g=>g?.code)).size!==a.populationAffinities.length||a.populationAffinities.some((g,i)=>!g||typeof g.code!=='string'||!g.code||typeof g.label!=='string'||!Number.isSafeInteger(g.sampleCount)||g.sampleCount<1||(!groupCodes.has(g.region)&&g.region!=='ADMIXED')||!Number.isFinite(g.meanLogLikelihood)||g.meanLogLikelihood>=0||(i>0&&g.meanLogLikelihood>a.populationAffinities[i-1].meanLogLikelihood)))fail();
 if(a.validation!==undefined&&a.populationAffinities.reduce((sum,g)=>sum+g.sampleCount,0)>a.validation.trainingSamples)fail();
 if(a.referenceSensitivity!==undefined)validateReferenceTemplateSensitivity(a.referenceSensitivity,a.groups,a.usableMarkers);
 return a;
}
export function validateAncestryReference(p){
 if(p?.referenceSha256!==undefined&&(typeof p.referenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(p.referenceSha256)))throw Error('Invalid ancestry reference fingerprint');
 if(p?.kind!=='genome-ancestry-reference'||p.method!==ANCESTRY_METHOD||typeof p.version!=='string'||!p.version.trim()||p.version.length>64||!Array.isArray(p.groups)||p.groups.length!==7||!Array.isArray(p.populations)||p.populations.length<7||p.populations.length>120||!Array.isArray(p.markers)||p.markers.length<3000||p.markers.length>30000)throw Error('Unsupported ancestry reference');
 if(p.minimumCoverage!==0.9||p.minimumMarkers!==3000||p.minimumChromosomes!==20||p.minimumReferenceHomozygoteFraction!==0.05||!Number.isFinite(p.residualLimit)||p.residualLimit<=0||!p.validation||!Number.isInteger(p.validation.heldOutSamples)||p.validation.heldOutSamples<100)throw Error('Ancestry reference lacks validated coverage gates');
 const codes=new Set();for(const g of p.groups){if(typeof g.code!=='string'||!g.code.trim()||codes.has(g.code)||typeof g.label!=='string'||!Number.isSafeInteger(g.sampleCount)||g.sampleCount<5)throw Error('Invalid ancestry group');codes.add(g.code);}
 const popcodes=new Set();for(const g of p.populations){if(typeof g.code!=='string'||!g.code.trim()||popcodes.has(g.code)||typeof g.label!=='string'||!Number.isSafeInteger(g.sampleCount)||g.sampleCount<1||(!codes.has(g.region)&&g.region!=='ADMIXED'))throw Error('Invalid ancestry population');popcodes.add(g.code);}
 validateAncestryValidation(p.validation,codes);
 // Each training participant belongs to one sampled population. Admixed
 // populations are retained for affinities but excluded from broad templates.
 if(p.populations.reduce((sum,g)=>sum+g.sampleCount,0)!==p.validation.trainingSamples||p.groups.some(g=>g.sampleCount!==p.populations.filter(pop=>pop.region===g.code).reduce((sum,pop)=>sum+pop.sampleCount,0)))throw Error('Ancestry training sample inventories disagree');
 const ids=new Set(),positions={GRCh37:new Set(),GRCh38:new Set()},information=Array.from({length:7},()=>Array(7).fill(0));
 for(const m of p.markers){if(!/^rs\d+$/.test(m.id)||ids.has(m.id)||!/^[ACGT]$/.test(m.alt))throw Error('Invalid ancestry marker identity');ids.add(m.id);
  for(const build of ['GRCh37','GRCh38']){const a=m.mappings?.[build],key=a?.chrom+':'+a?.position;if(!a||! /^(?:[1-9]|1\d|2[0-2])$/.test(a.chrom)||!Number.isSafeInteger(a.position)||a.position<1||!/^[ACGT]$/.test(a.ref)||!Array.isArray(a.alleles)||a.alleles.length!==2||a.alleles[0]!==a.ref||a.alleles[1]!==m.alt||a.ref===m.alt||['AT','TA','CG','GC'].includes(a.ref+m.alt)||positions[build].has(key))throw Error('Invalid ancestry assembly mapping');positions[build].add(key);}
  if(m.mappings.GRCh37.chrom!==m.mappings.GRCh38.chrom||m.mappings.GRCh37.ref!==m.mappings.GRCh38.ref)throw Error('Unsupported ancestry assembly reversal');
  for(const [key,n] of [['frequencies',7],['populationFrequencies',p.populations.length]])if(!Array.isArray(m[key])||m[key].length!==n||Array.from(m[key]).some(f=>!Number.isFinite(f)||f<=0||f>=1))throw Error('Invalid ancestry allele frequencies');
  const mean=m.frequencies.reduce((s,f)=>s+f,0)/7,w=1/Math.max(mean*(1-mean),.05),x=m.frequencies.map(f=>2*(f-mean));
  for(let i=0;i<7;i++)for(let j=0;j<7;j++)information[i][j]+=w*x[i]*x[j];
 }
 if(!identifiableAncestryInformation(information,p.markers.length))throw Error('Ancestry reference cannot distinguish all seven components numerically');
 return p;
}
export function ancestryTargetCatalog(p){return {version:p.version,retrievedAt:p.retrievedAt,records:p.markers.map(m=>({id:m.id,mappings:m.mappings,effectAllele:m.alt,frequency:null,priority:1,gene:'Ancestry',trait:'Ancestry reference markers',label:'Ancestry marker',category:'Ancestry',summary:'Ancestry reference marker'}))};}
const simplex=v=>{const u=[...v].sort((a,b)=>b-a);let sum=0,theta=0;for(let i=0;i<u.length;i++){sum+=u[i];const t=(sum-1)/(i+1);if(u[i]>t)theta=t;}return v.map(x=>Math.max(x-theta,0));};
function solve(a,b){let q=Array(7).fill(1/7);const step=1/Math.max(...a.map(r=>r.reduce((s,x)=>s+Math.abs(x),0)));if(!Number.isFinite(step))throw Error('Ancestry reference is uninformative');
 let converged=false;
 for(let iter=0;iter<2000;iter++){const next=simplex(q.map((v,i)=>v-step*(a[i].reduce((s,x,j)=>s+x*q[j],0)-b[i])));const change=Math.max(...q.map((v,i)=>Math.abs(v-next[i])));q=next;if(change<1e-9){converged=true;break;}}
 return {fractions:q,converged};
}
const sufficient=()=>({a:Array.from({length:7},()=>Array(7).fill(0)),b:Array(7).fill(0),yy:0,n:0});
export function estimateAncestry(targetReport,p){
 const base={method:ANCESTRY_METHOD,referenceVersion:p.version,...(p.referenceSha256?{referenceSha256:p.referenceSha256}:{}),referenceRetrievedAt:p.retrievedAt,referenceSource:p.sourceURL,referenceSources:p.sources,...(p.numericalVerification?{numericalVerification:validateAncestryNumericalVerification(p.numericalVerification,p.referenceSha256,p.validation.heldOutSamples)}:{}),build:targetReport.build,inputFormat:targetReport.format,markerCount:p.markers.length,validation:p.validation,minimumCoverage:p.minimumCoverage,status:'Unavailable',groups:[],populationAffinities:[],warnings:['These are fits to sampled reference populations, not nationality, genealogical ancestry fractions or proof of ethnic identity.','Small fractions and nearby population rankings may change with the reference panel. Country percentages are not calculated.','Chromosome sensitivity ranges are not calibrated confidence intervals. Missing genotypes are never filled as reference.','The public panels were intersected locally; they were not jointly sequenced or called. Reference sample and geographic coverage remain uneven.']};
 const calls=new Map(),signature=r=>JSON.stringify({status:r.status,explicitlyUnobserved:r.recordObserved===false,alleles:Array.isArray(r.alleles)?r.alleles.slice().sort():r.alleles});
 for(const r of targetReport.results){const old=calls.get(r.id);if(!old)calls.set(r.id,r);else if(signature(old)!==signature(r))calls.set(r.id,{id:r.id,status:'Conflicting records',alleles:null});}
 const total=sufficient(),byChrom=new Map(),statuses={},popScores=Array(p.populations.length).fill(0),usableMask=Array(Math.ceil(p.markers.length/4)).fill(0),usableDosages=Array(p.markers.length).fill(null);let referenceHomozygotes=0,heterozygotes=0;
 for(let markerIndex=0;markerIndex<p.markers.length;markerIndex++){const m=p.markers[markerIndex],r=calls.get(m.id),status=r?.status==='Called'&&r.recordObserved===false?'Conflicting records':r?.status||'Not observed';statuses[status]=(statuses[status]||0)+1;
  if(status!=='Called'||!Array.isArray(r.alleles)||r.alleles.length!==2||[r.alleles[0],r.alleles[1]].some(a=>!m.mappings[targetReport.build]?.alleles.includes(a)))continue;
  usableMask[Math.floor(markerIndex/4)]|=8>>(markerIndex%4);
  const d=r.alleles.filter(a=>a===m.alt).length;usableDosages[markerIndex]=d;if(d===0)referenceHomozygotes++;if(d===1)heterozygotes++;
  const mean=m.frequencies.reduce((s,x)=>s+x,0)/7,w=1/Math.max(mean*(1-mean),.05),x=m.frequencies.map(f=>2*(f-mean)),y=d-2*mean;
  const chrom=m.mappings[targetReport.build].chrom;if(!byChrom.has(chrom))byChrom.set(chrom,sufficient());
  for(const part of [total,byChrom.get(chrom)]){part.n++;part.yy+=w*y*y;for(let i=0;i<7;i++){part.b[i]+=w*x[i]*y;for(let j=0;j<7;j++)part.a[i][j]+=w*x[i]*x[j];}}
  for(let j=0;j<popScores.length;j++){const f=Math.min(.9999,Math.max(.0001,m.populationFrequencies[j]));popScores[j]+=d*Math.log(f)+(2-d)*Math.log(1-f);}
 }
 const coverage=total.n/p.markers.length,chromosomes=[...byChrom.values()].filter(c=>c.n>=30).length;
 Object.assign(base,{usableMarkers:total.n,usableMarkerMaskHex:usableMask.map(n=>n.toString(16)).join(''),coverage,chromosomes,referenceHomozygotes,heterozygotes,callStatuses:statuses});
 if(total.n<p.minimumMarkers||coverage<p.minimumCoverage||chromosomes<p.minimumChromosomes){base.reason=`Ancestry needs at least ${p.minimumMarkers.toLocaleString()} usable markers, 90% panel coverage and 20 autosomes with at least 30 calls each. This input supplies ${total.n.toLocaleString()} markers (${(coverage*100).toFixed(1)}%) across ${chromosomes} qualifying autosomes. Use Prepare VCF with your original VCF, BAM/CRAM and matching FASTA to call missing ancestry positions.`;return base;}
 if(referenceHomozygotes/total.n<p.minimumReferenceHomozygoteFraction){base.reason='Too few explicit reference-homozygous calls. A variants-only or selectively filtered input can bias ancestry; prepare a VCF that includes reference genotypes at the ancestry markers.';return base;}
 if(heterozygotes/total.n<.08||heterozygotes/total.n>.6){base.reason='The marker genotype pattern is outside the supported heterozygosity screen (8–60%). Selective genotype filtering or unusual input requires review; ancestry estimates are withheld.';return base;}
 if(!identifiableAncestryInformation(total.a,total.n)){base.reason='Usable markers cannot distinguish all seven reference components numerically; ancestry estimates are withheld.';return base;}
 const solved=solve(total.a,total.b),q=solved.fractions;
 if(!solved.converged){base.reason='The ancestry fit did not converge; no fractions or population rankings are reported.';return base;}
 const residual=(total.yy-2*q.reduce((s,v,i)=>s+v*total.b[i],0)+q.reduce((s,v,i)=>s+v*total.a[i].reduce((t,a,j)=>t+a*q[j],0),0))/total.n;
 Object.assign(base,{residual,residualLimit:p.residualLimit});
 if(!Number.isFinite(residual)||residual>p.residualLimit){base.reason='The genome does not fit this reference panel within its held-out validation threshold. Coverage alone cannot establish that these references represent your ancestry.';return base;}
 const jackknife=[];
 for(const part of byChrom.values()){const a=total.a.map((r,i)=>r.map((v,j)=>v-part.a[i][j])),b=total.b.map((v,i)=>v-part.b[i]);if(!identifiableAncestryInformation(a,total.n-part.n)){base.reason='Chromosome sensitivity markers cannot distinguish all seven reference components numerically; ancestry percentages withheld.';return base;}const fit=solve(a,b);if(!fit.converged){base.reason='Chromosome sensitivity analysis did not converge; ancestry percentages withheld.';return base;}jackknife.push(fit.fractions);}
 base.groups=p.groups.map((g,i)=>({...g,fraction:q[i],sensitivityLow:Math.min(q[i],...jackknife.map(r=>r[i])),sensitivityHigh:Math.max(q[i],...jackknife.map(r=>r[i]))})).sort((a,b)=>b.fraction-a.fraction);
 base.populationAffinities=p.populations.map((g,i)=>({...g,meanLogLikelihood:popScores[i]/total.n})).sort((a,b)=>b.meanLogLikelihood-a.meanLogLikelihood).slice(0,8);
 base.status='Estimated';base.reason='Broad reference mixture fitted from explicit usable diploid genotypes. Population similarity ranks do not describe percentage contributions.';
 base.referenceSensitivity=referenceTemplateSensitivity(p,usableDosages,q);
 if(targetReport.format!=='VCF')base.warnings.push('Consumer-array genotypes have no sequencing quality metrics. Only exact forward alleles and marker identities are used; no strand guessing.');
 return base;
}


