// Lossless numeric projection of public performance records, never a risk calculator.
const number=n=>n===undefined||n===null?null:n;
const duration=d=>d?structuredClone(d):null;
export function projectEvaluationRecord(r,id){
 if(r.associated_pgs_id!==id)throw Error('Wrong score evaluation');
 return {id:r.id,sampleSet:r.sampleset?.id,endpoint:r.phenotyping_reported||'',publication:[r.publication?.firstauthor,r.publication?.journal,r.publication?.date_publication,r.publication?.PMID?'PMID '+r.publication.PMID:''].filter(Boolean).join(' · '),covariates:r.covariates||'',comments:r.performance_comments||'',samples:(r.sampleset?.samples||[]).map(s=>({count:number(s.sample_number),cases:number(s.sample_cases),controls:number(s.sample_controls),malePercent:number(s.sample_percent_male),age:duration(s.sample_age),followup:duration(s.followup_time),ancestry:[s.ancestry_broad,s.ancestry_free].filter(Boolean).join(' / '),country:s.ancestry_country||'',populationDetails:s.ancestry_additional||'',cohort:[...(s.cohorts||[]).map(c=>c.name_short),s.cohorts_additional].filter(Boolean).join(', '),phenotyping:s.phenotyping_free||''})),metrics:Object.values(r.performance_metrics||{}).flat().map(v=>({name:v.name_long||v.name_short||'',estimate:number(v.estimate),lower:number(v.ci_lower),upper:number(v.ci_upper),standardError:number(v.se)}))};
}
