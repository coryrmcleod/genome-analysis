import {referenceDefinition,empiricalPercentile} from './pgs-reference.js';
import {coherentSensitivity,validateOrientationBasis} from './pgs-coherent.js';
import {referenceAncestryEligibility} from './pgs-ancestry-eligibility.js';
export function validateSensitivityReference(library){
 if(library?.version!=='1.0.0'||library.population!=='EUR'||!Array.isArray(library.models))throw Error('Invalid sensitivity reference');
 const ids=new Set();for(const m of library.models){
  if(ids.has(m.id)||!/^PGS\d{6}$/.test(m.id))throw Error('Duplicate or invalid sensitivity model');ids.add(m.id);
  if(!['Available','Unavailable'].includes(m.status))throw Error('Invalid sensitivity status');
  if(m.status==='Unavailable'){if(typeof m.reason!=='string'||!m.reason.trim())throw Error('Missing sensitivity exclusion reason');continue;}
  if(!Number.isInteger(m.sampleCount)||m.sampleCount<100||!m.definitions?.GRCh38||!m.definitions?.GRCh37)throw Error('Incomplete sensitivity reference');
  for(const k of ['lowerScores','centralScores','upperScores'])if(!Array.isArray(m[k])||m[k].length!==m.sampleCount||Array.from(m[k]).some((v,i)=>!Number.isFinite(v)||i>0&&v<m[k][i-1]))throw Error('Invalid sensitivity bounds');
  for(let i=0;i<m.sampleCount;i++){
   const tolerance=1e-12*Math.max(Math.abs(m.lowerScores[i]),Math.abs(m.centralScores[i]),Math.abs(m.upperScores[i]));
   if(m.lowerScores[i]-m.centralScores[i]>tolerance||m.centralScores[i]-m.upperScores[i]>tolerance)throw Error('Sensitivity intervals disagree');
  }
  if(m.orientationBasis){const b=m.orientationBasis;
   validateOrientationBasis(b,m.sampleCount,!!m.missingReferenceTerms?.length);
  }
 }
 return library;
}
export function percentileSensitivity(model,estimate,library,population='EUR'){
 const r=library?.models.find(r=>r.id===model.id),out={kind:'Neutral-assumption percentile sensitivity',point:null,lower:null,upper:null,population,measured:false};
 if(population!=='EUR'){out.reason='Sensitivity reference supports EUR only.';return out;}
 const ancestry=referenceAncestryEligibility(model,population);out.ancestryAssessment=ancestry;
 if(ancestry.status==='mismatch'){out.reason=ancestry.reason;return out;}
 if(!r||r.status!=='Available'){out.reason=r?.reason||'No compatible sensitivity reference.';out.blockingReferenceTerms=r?.excludedTermDetails||[];return out;}
 if(referenceDefinition(model,model.build)!==r.definitions[model.build]){out.reason='Model definition changed; sensitivity reference must be rebuilt.';return out;}
 if(model.inputFormat!=='VCF'||!Number.isFinite(estimate?.unconditionalLower)||!Number.isFinite(estimate?.unconditionalUpper)){out.reason=estimate?.reason||'No supported genotype scenario is available for a sensitivity comparison.';return out;}
 // A reference score cannot exceed its upper bound or fall below its lower bound.
 // Using the opposite reference endpoints therefore gives conservative rank bounds.
 out.lower=empiricalPercentile(r.upperScores,estimate.unconditionalLower);
 out.upper=empiricalPercentile(r.lowerScores,estimate.unconditionalUpper);
 out.point=Number.isFinite(estimate.bestGuess)?empiricalPercentile(r.centralScores,estimate.bestGuess):null;
 out.sampleCount=r.sampleCount;out.uncertainReferenceTerms=r.uncertainTerms;out.uncertainWeightFraction=r.uncertainWeightFraction;
 out.modelSha256=r.modelSha256;out.referenceSha256=library.archiveSha256;out.referenceVersion=library.version;out.sourceURL=library.sourceURL;
 out.method='Reference individuals retain their joint genotypes. Each uncertain weighted-allele orientation yields a contribution interval; its midpoint supplies the neutral comparison. Target bounds retain all unresolved genotypes before substitution. Lower rank compares the target lower bound with reference upper bounds; upper rank compares the target upper bound with reference lower bounds. Central rank compares the existing target common-genotype/midpoint scenario with reference midpoint scores.';
 out.reason='The central value is a neutral-assumption comparison, not an expected or most-likely percentile of the published score. Midpoint contributions remove unresolved orientation-related variation from the comparison. Bounds are conservative, may not be jointly attainable, and are not a confidence interval. They exclude reference-sampling uncertainty. No allele direction, measured genotype, or disease risk is inferred.';
 const coherent=coherentSensitivity(model,r,512,estimate);
 if(coherent){
  out.independentEnvelope={lower:out.lower,upper:out.upper};Object.assign(out,coherent);
  out.kind='Shared-orientation percentile sensitivity';
  out.method='Enumerate every compatible model allele-orientation combination, applying each choice consistently to the target and all reference individuals. Calculate the target rank interval within each resulting full reference distribution, then retain the minimum and maximum across scenarios. Measured genotypes are retained; genuinely missing or quality-excluded genotypes retain all dosage possibilities.';
  out.reason=coherent.missingGenotypes===0?'All target genotypes are measured. The interval spans the attainable ranks across consistent allele-orientation scenarios; values between those ranks need not be attainable. No orientation probabilities are established, so there is no probability-supported best guess.':'The interval spans consistent allele-orientation scenarios and all unresolved genotype dosages. Missing-genotype combinations may not be jointly attainable. No orientation probabilities are established, so there is no probability-supported best guess.';
  out.reason+=' This is a sensitivity range, not a confidence interval or disease probability; reference-sampling uncertainty is excluded.';
  if(coherent.scenarioCount===null){
   out.method='For each reference individual, bound reference-minus-target score using the same allele orientation in both people. Count reference individuals guaranteed or potentially below the target. Shared genotypes cancel orientation uncertainty. Orientations may still vary between pairwise comparisons, making the overall bounds conservative.';
   out.reason='Shared allele directions tighten the pairwise comparisons, but the overall range may still include endpoints that cannot be attained simultaneously. No orientation probabilities are established, so there is no probability-supported best guess. This is not a confidence interval or disease probability; reference-sampling uncertainty is excluded.';
  }
  if(r.missingReferenceTerms?.length){
   out.missingReferenceTerms=r.missingReferenceTerms;
   out.kind='Incomplete-reference percentile sensitivity';
   out.method+=' '+r.missingReferenceTerms.length+' reference sites are absent. Every reference individual retains dosage 0–2 at those sites. Lower percentile bounds use reference upper-score bounds and upper percentiles use reference lower-score bounds, without discarding the missing terms.';
   out.reason='The reference panel lacks '+r.missingReferenceTerms.length+' scoring sites ('+r.missingReferenceTerms.map(t=>t.id).join(', ')+'). Full bounds allow every reference genotype there, as well as target and allele-direction uncertainty. They may include combinations not jointly attainable. A central comparison additionally assumes one effect-allele copy at each missing reference site for everyone; it is not a population-supported best guess. This is a sensitivity range, not a confidence interval or disease probability; sampling uncertainty is excluded.';
  }
 }
 return out;
}
