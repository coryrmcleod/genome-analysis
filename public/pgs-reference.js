// A reference percentile is a rank within a finite public sample, not disease risk.
import {referenceAncestryEligibility} from './pgs-ancestry-eligibility.js';
import {termForBuild} from './pgs-build-alleles.js';
export function referenceDefinition(model, build, targets = null) {
 const terms=model.variants||model.terms;
 const lookup=targets&&new Map(targets.map(t=>[t.id,t]));
 return JSON.stringify({id:model.id,build,effectType:model.effectType,terms:terms.map(original=>{
  const t=termForBuild(original,build);
  const m=lookup?lookup.get(t.id)?.mappings[build]:t.mapping;
  return [t.id,t.weight,t.effectAllele,t.otherAllele,t.alleleMode||'explicit-pair',t.effectAlleleCandidates||null,m?.chrom,m?.position,m?.ref,m?.alleles];
 }).sort((a,b)=>a[0].localeCompare(b[0]))});
}
export function validateScoreReference(library) {
 if(library?.version!=='1.0.0'||library.population!=='EUR'||!Number.isFinite(Date.parse(library.retrievedAt))||!Array.isArray(library.models))throw Error('Invalid European score reference');
 const ids=new Set();
 for(const r of library.models){
  if(ids.has(r.id)||!/^PGS\d{6}$/.test(r.id))throw Error('Duplicate or invalid reference model');ids.add(r.id);
  if(!['Available','Unavailable'].includes(r.status))throw Error('Invalid reference status');
  if(r.status==='Unavailable'){if(typeof r.reason!=='string'||!r.reason.trim())throw Error('Missing reference exclusion reason');continue;}
  if(!Number.isInteger(r.sampleCount)||r.sampleCount<100||!Array.isArray(r.scores)||r.scores.length!==r.sampleCount||Array.from(r.scores).some((s,i)=>!Number.isFinite(s)||i&&s<r.scores[i-1])||r.scores[0]===r.scores.at(-1)||!r.definitions?.GRCh37||!r.definitions?.GRCh38||!/^[a-f0-9]{64}$/.test(r.modelSha256||''))throw Error('Invalid reference score distribution');
 }
 return library;
}
// Midrank handles ties: percentage strictly below + half the percentage equal.
// A small relative tolerance absorbs summation-order rounding, not biological differences.
export function empiricalPercentile(scores, value) {
 if(!Number.isFinite(value)||!scores?.length)throw Error('Invalid percentile input');
 if(Array.from(scores).some(s=>!Number.isFinite(s)))throw Error('Invalid percentile input');
 // No absolute unit floor: small published coefficient scales must not collapse
 // distinct scores into ties merely because the raw sum is much smaller than1.
 const scale=scores.reduce((largest,s)=>Math.max(largest,Math.abs(s)),Math.abs(value));
 const tolerance=1e-10*scale;
 let below=0,equal=0;for(const s of scores){if(s<value-tolerance)below++;else if(s<=value+tolerance)equal++;}
 return 100*(below+equal/2)/scores.length;
}
export function referencePercentile(model, estimate, library, population='EUR') {
 const result={kind:'European reference-sample percentile',population,point:null,lower:null,upper:null,reason:null};
 if(population!=='EUR'){result.reason='This installed score-distribution panel supports the European (EUR) comparison only. Select EUR to use it; no ancestry is inferred.';return result;}
 const ancestry=referenceAncestryEligibility(model,population);result.ancestryAssessment=ancestry;
 if(ancestry.status==='mismatch'){result.reason=ancestry.reason;return result;}
 const r=library?.models.find(r=>r.id===model.id);
 if(!r){result.reason='No compatible individual-level score distribution is installed for this model.';return result;}
 if(r.status!=='Available'){result.reason=r.reason;return result;}
 if(referenceDefinition(model,model.build)!==r.definitions[model.build]){result.reason='Reference/model definition mismatch: weights, alleles, positions or genome build changed. Rebuild the reference before comparing.';return result;}
 if(model.inputFormat!=='VCF'||!estimate||estimate.unconditionalLower===null||estimate.unconditionalUpper===null){result.reason='No usable score scenario: resolve the genotype/model matching problems before ranking.';return result;}
 const complete=model.rawSum!==null;
 const point=complete?model.rawSum:estimate.bestGuess;
 result.point=point===null?null:empiricalPercentile(r.scores,point);
 result.lower=empiricalPercentile(r.scores,complete?model.rawSum:estimate.unconditionalLower);
 result.upper=empiricalPercentile(r.scores,complete?model.rawSum:estimate.unconditionalUpper);
 result.measured=complete;result.sampleCount=r.sampleCount;result.referenceMin=r.scores[0];result.referenceMax=r.scores.at(-1);
 result.outsideReference=point===null?null:point<r.scores[0]?'below':point>r.scores.at(-1)?'above':null;
 result.modelSha256=r.modelSha256;result.referenceSha256=library.archiveSha256;result.referenceVersion=library.version;result.retrievedAt=library.retrievedAt;result.sourceURL=library.sourceURL;
 result.method='Empirical midrank: 100 × (reference scores below + half of tied scores) / reference sample count. Complete published model, unchanged weights and verified alleles; no normal-distribution extrapolation, PCA, age/sex adjustment or disease-risk calibration.';
 result.reason=complete?'Rank of the measured raw sum within this finite EUR reference sample. This comparison does not establish model applicability or disease probability.':'Rank of a hypothetical common-genotype raw score, not a statistically predicted personal percentile. The range maps full possible raw-score bounds to this same reference. It is not a confidence interval and does not include reference-sampling uncertainty. Missing-genotype substitutions can substantially distort rank.';
 return result;
}
