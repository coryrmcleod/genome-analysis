import {possibleEffectDosages} from './effect-only-pgs.js';
import {finitePGSMidpoint} from './pgs-numeric.js';
const imputable=new Set(['Not observed','No call','Quality limited']);
const scenarioStatuses=new Set(['Called','Not observed','No call','Quality limited','Strand ambiguous','Effect orientation unresolved']);
const palindrome=(a,b)=>['AT','CG'].includes([a,b].sort().join(''));
export function hasCompletePopulationGenotypes(group){
 if(!Number.isSafeInteger(group?.sampleCount)||group.sampleCount<=0||!Array.isArray(group.genotypes)||!group.genotypes.length)return false;
 const categories=new Set();let total=0;
 for(const row of group.genotypes){
  if(!row||!Number.isSafeInteger(row.count)||row.count<0||typeof row.genotype!=='string')return false;
  const alleles=row.genotype.split('/');if(alleles.length!==2||alleles.some(allele=>!allele||allele!==allele.trim()))return false;
  const key=[...alleles].sort().join('/');if(categories.has(key))return false;categories.add(key);
  total+=row.count;if(!Number.isSafeInteger(total))return false;
 }
 return total===group.sampleCount;
}
export function estimatePGS(model,reference,population='none'){
 const result={kind:'Hypothetical common-genotype scenario',population:population==='none'?null:population,source:reference?.source||null,ensemblReleases:reference?.ensemblData?.releases||[],retrievedAt:reference?.retrievedAt||null,point:null,bestGuess:null,neutralTerms:0,bestGuessMethod:'Keep measured contributions; substitute per-site population-modal genotypes where usable. For remaining ambiguity, use the midpoint of the retained contribution bounds. Midpoints are neutral assumptions, not inferred genotypes or a statistical prediction.',lower:null,upper:null,unconditionalLower:null,unconditionalUpper:null,terms:[],assumedTerms:0,orientationTerms:0,unresolvedTerms:0,percentile:null,percentileReason:'No compatible individual-level reference score distribution is installed. Single-site genotype frequencies do not describe correlations between variants, so they cannot determine a population percentile, its range, or a best guess.'};
 const observedOrientation=t=>t.status==='Effect orientation unresolved'&&Array.isArray(t.possibleDosages)&&t.possibleDosages.length>1&&Array.from(t.possibleDosages).every(d=>Number.isInteger(d)&&d>=0&&d<=2);
 if(model.terms.some(t=>t.kind==='reviewed-deletion'&&t.contribution===null)){result.reason='The certified deletion requires an observed usable sequencing call. No population-mode or neutral-genotype substitution is provided for this mixed model.';return result;}
 if(model.inputFormat!=='VCF'){result.reason='This scenario requires sequencing VCF input; consumer-array input is not supported for polygenic scoring.';return result;}
 if(model.terms.some(t=>!scenarioStatuses.has(t.status)||t.status==='Effect orientation unresolved'&&!observedOrientation(t))){result.reason='Resolve unresolved genotype/model matching conflicts before estimating; excluded calls cannot be replaced with assumed genotypes.';return result;}
 if(!model.matched&&!model.terms.some(observedOrientation)){result.reason='No usable measured score terms are available. A population-only scenario is withheld; missing or quality-excluded records are not reference genotypes.';return result;}
 let low=0,high=0,allLow=0,allHigh=0,central=0;
 for(const t of model.terms){let dosages=t.contribution!==null?[t.dosage]:[0,1,2],method='Observed usable call',assumedGenotypes=[],frequency=null,sampleCount=null,sourceURL=null;
  if(t.contribution===null){
   if(observedOrientation(t)){dosages=t.possibleDosages;method='Measured genotype retained across all reference-compatible weighted-allele orientations';result.orientationTerms++;}
   else if(t.status==='Strand ambiguous'){dosages=[0,2];method='Known homozygote retained; effect orientation unresolved';result.orientationTerms++;}
   else if(population!=='none'&&imputable.has(t.status)){
    const record=reference?.records?.[t.id],group=record?.populations?.[population],rows=group?.genotypes;
    if(!t.buildAlleles&&record?.status==='Verified public forward mapping'&&hasCompletePopulationGenotypes(group)){
     const max=Math.max(...rows.map(r=>r.count)),modes=rows.filter(r=>r.count===max),alleles=modes.map(r=>r.genotype.split('/'));
     if(max>0&&alleles.every(a=>a.length===2&&a.every(x=>t.alleleMode==='effect-only'?t.mapping?.alleles.includes(x):x===t.effectAllele||x===t.otherAllele))){
      dosages=[...new Set(alleles.flatMap(a=>t.alleleMode==='effect-only'?possibleEffectDosages(a,t.effectAlleleCandidates):palindrome(t.effectAllele,t.otherAllele)&&a[0]===a[1]?[0,2]:[a.filter(x=>x===t.effectAllele).length]))];
      assumedGenotypes=modes.map(r=>r.genotype);frequency=max/group.sampleCount;sampleCount=group.sampleCount;sourceURL=record.sourceURL;
      method='Assumed population modal genotype'+(modes.length>1?' (tied modes retained)':'');result.assumedTerms++;
      if(t.alleleMode==='effect-only'?t.effectAlleleCandidates.length>1&&dosages.length>1:palindrome(t.effectAllele,t.otherAllele)&&alleles.some(a=>a[0]===a[1])){method+='; effect orientation unresolved';result.orientationTerms++;}
     }else {method='Population mode has an allele outside the model; not substituted';result.unresolvedTerms++;}
    }else {method=t.buildAlleles?'Build-specific allele term: no population-mode substitution; all dosage possibilities retained':'No verified population genotype frequencies; unresolved';result.unresolvedTerms++;}
   }else {method='Unresolved genotype; all effect-copy counts retained';result.unresolvedTerms++;}
  }
  const contributions=dosages.map(d=>d*t.weight),minimum=Math.min(...contributions),maximum=Math.max(...contributions),midpoint=finitePGSMidpoint(minimum,maximum);
  low+=minimum;high+=maximum;central+=midpoint;if(t.contribution===null&&dosages.length>1)result.neutralTerms++;
  const unconditional=observedOrientation(t)?t.possibleDosages.map(d=>d*t.weight):[0,2*t.weight];
  allLow+=t.contribution!==null?t.contribution:Math.min(...unconditional);allHigh+=t.contribution!==null?t.contribution:Math.max(...unconditional);
  if(t.contribution===null)result.terms.push({id:t.id,originalStatus:t.status,originalGenotype:t.genotype,method,assumedGenotypes,frequency,sampleCount,sourceURL,dosages,contributionLower:minimum,contributionUpper:maximum,centralContribution:population==='none'?null:midpoint,centralMethod:dosages.length>1?'Neutral midpoint; not an inferred genotype':'Population-modal contribution'});
 }
 result.lower=low;result.upper=high;result.point=low===high?low:null;result.unconditionalLower=allLow;result.unconditionalUpper=allHigh;
 result.bestGuess=population==='none'&&result.terms.length?null:central;
 result.reason='What-if raw weighted sum, not a measured complete score, statistical imputation, confidence interval, percentile, or trait prediction. Bounds vary unresolved terms independently and may include combinations not jointly possible, and not every value between the bounds is attainable. Per-site population modes are not the most likely combined genotype. No allele orientation is inferred from population frequency.';
 return result;
}
