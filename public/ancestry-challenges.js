const groups=['AFR','EUR','MENA','SAS','EAS','OCE','IAM'];
export const ANCESTRY_MISSINGNESS_LABELS=Object.freeze({random:'Random missing calls',reference_homozygotes_first:'Reference homozygotes missing first',alternate_homozygotes_first:'Alternate homozygotes missing first',group_informative_markers_first:'Group-informative markers missing first',chromosome_clustered:'Calls missing in chromosome order'});
export function validateAncestryChallenges(s){
 const fail=()=>{throw Error('Invalid ancestry challenge evidence');};
 if(!s||s.kind!=='ancestry-reference-challenges'||s.version!==1||s.frequencyReproductionExact!==true||!Number.isFinite(Date.parse(s.evaluatedAt))||!Number.isInteger(s.heldOutSamples)||s.heldOutSamples<100||s.heldOutSamples>10000||s.browserVerifiedCases!==5||![s.testedReferenceSha256,s.publicGenotypesSha256,s.browserVerificationSha256].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))||!Array.isArray(s.limitations)||s.limitations.length>20||s.limitations.some(v=>typeof v!=='string'))fail();
 if(!s.populationExcludedByGroup||JSON.stringify(Object.keys(s.populationExcludedByGroup).sort())!==JSON.stringify([...groups].sort())||!s.missingness||JSON.stringify(Object.keys(s.missingness).sort())!==JSON.stringify(Object.keys(ANCESTRY_MISSINGNESS_LABELS).sort()))fail();
 for(const row of [s.populationExcluded,...Object.values(s.populationExcludedByGroup),...Object.values(s.missingness)]){
  if(!row||!Number.isInteger(row.count)||row.count<1||row.count>s.heldOutSamples||!Number.isInteger(row.passing)||row.passing<0||row.passing>row.count||![row.maximumFractionChange,row.percentile95FractionChange].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||row.percentile95FractionChange>row.maximumFractionChange||row.dominantAccuracy!==null&&(!Number.isFinite(row.dominantAccuracy)||row.dominantAccuracy<0||row.dominantAccuracy>1))fail();
  if(row.dominantAccuracy!==null){const correct=row.dominantAccuracy*row.count;if(Math.abs(correct-Math.round(correct))>1e-9)fail();}
 }
 if(Object.values(s.populationExcludedByGroup).reduce((sum,r)=>sum+r.count,0)!==s.populationExcluded.count||Object.values(s.populationExcludedByGroup).reduce((sum,r)=>sum+r.passing,0)!==s.populationExcluded.passing)fail();
 // These rows partition the same population-exclusion experiment. Its overall
 // maximum must equal the largest subgroup maximum, regardless of group size.
 if(s.populationExcluded.maximumFractionChange!==Math.max(...Object.values(s.populationExcludedByGroup).map(r=>r.maximumFractionChange)))fail();
 const rows=Object.values(s.populationExcludedByGroup);
 // Accuracy is a per-person mean, so exhaustive subgroup means combine by
 // sample counts. Do not derive an accuracy when a historical row omits it.
 if(s.populationExcluded.dominantAccuracy!==null&&rows.every(r=>r.dominantAccuracy!==null)){
  const weighted=rows.reduce((sum,r)=>sum+r.count*r.dominantAccuracy,0)/s.populationExcluded.count;
  if(Math.abs(weighted-s.populationExcluded.dominantAccuracy)>1e-12)fail();
 }
 return s;
}
