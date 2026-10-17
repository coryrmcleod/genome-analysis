import {referenceAncestryEligibility} from './pgs-ancestry-eligibility.js';
export function scoreDisplayTrait(model){
 const trait=model.id==='PGS004586'&&String(model.publication?.PMID)==='38589358'?'Colorectal cancer prognosis after diagnosis':model.trait;
 const date=/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(model.publication?.date_publication||'');
 return date?`${trait} (${Number(date[2])}/${date[1]})`:trait;
}
export function scoreFamily(model){
 const family=model.family||model.trait;
 if(family==="Parkinson's disease"||family==='Parkinson’s disease')return 'Parkinson disease';
 if(family==='Lipoprotein(a)')return 'Lipoprotein (a)';
 if(family==='Gallstones')return 'Cholelithiasis (gallstones)';
 return family==='Nonalcoholic fatty liver disease'?'Non-alcoholic fatty liver disease':family;
}
const conflicts=new Set(['Model allele mismatch','Unsupported call','Allele / ID mismatch','Conflicting records','Overlapping records']);
const orientation=new Set(['Strand ambiguous','Effect orientation unresolved']);
export function scoreUncertainty(model){
 const groups={missing:[],orientation:[],conflicts:[],other:[]};
 for(const t of model.terms||[]){if(Number.isFinite(t.contribution))continue;
  const key=conflicts.has(t.status)?'conflicts':orientation.has(t.status)?'orientation':['Not observed','No call','Quality limited'].includes(t.status)?'missing':'other';groups[key].push(t);
 }
 const total=(model.terms||[]).reduce((n,t)=>n+Math.abs(t.weight),0);
 const row=(key,label,action)=>({key,label,count:groups[key].length,weightFraction:total?groups[key].reduce((n,t)=>n+Math.abs(t.weight),0)/total:0,variants:groups[key].map(t=>({id:t.id,status:t.status})),action});
 const s=model.referenceSensitivity;
 return {personal:[row('missing','Missing or quality-limited calls','Additional reliable sequencing calls can resolve these terms; population substitutions remain assumptions.'),row('orientation','Measured genotype, uncertain allele direction','The published scoring allele needs strand evidence. More sequencing depth alone does not establish that direction.'),row('conflicts','Allele or complex-variant conflicts','Review the original records and model allele definitions; these cannot be treated as ordinary missing calls.'),row('other','Other excluded terms','Review the scoring status before using this term.')],referenceMissing:s?.missingReferenceTerms||[],referenceConflicts:s?.blockingReferenceTerms||[],referenceOrientationTerms:s?.uncertainReferenceTerms??(Number.isFinite(model.referenceComparison?.point)?0:null),method:s?.comparisonMethod||null,scope:'Personal categories partition excluded terms. Weight percentages describe absolute published weight, not portions of percentile uncertainty. Reference uncertainty can overlap these categories; the contributions to range width are not additive.'};
}
export function scoreResult(model){
 if(referenceAncestryEligibility(model,model.referenceComparison?.population||model.referenceSensitivity?.population||'EUR').status==='mismatch')return {label:'Unavailable · evaluation population mismatch',point:null,lower:null,upper:null};
 const p=model.referenceComparison,s=model.referenceSensitivity;
 if(Number.isFinite(p?.point))return {label:p.measured?'Measured-score rank':'Hypothetical genotype scenario',point:p.point,lower:p.lower,upper:p.upper};
 if(Number.isFinite(s?.lower))return {label:s.scenarioSummary?.neutralReference?'Sensitivity · neutral reference':s.scenarioSummary?'Sensitivity · scenario median':'Conservative sensitivity bounds',point:s.scenarioSummary?.median??null,lower:s.lower,upper:s.upper};
 return {label:'Unavailable',point:null,lower:null,upper:null};
}
export function comparisonGroups(models){
 const aliases={'Fasting glucose':'Fasting glucose · different adjustments','Fasting glucose (BMI adjusted)':'Fasting glucose · different adjustments','Waist circumference':'Waist circumference · different study populations','Waist circumference (male)':'Waist circumference · different study populations','Waist circumference (female)':'Waist circumference · different study populations'};
 const map=new Map();for(const m of models){const family=scoreFamily(m),name=aliases[family]||family;if(!map.has(name))map.set(name,[]);map.get(name).push(m);}
 return [...map].filter(([,models])=>models.length>1).sort(([a],[b])=>a.localeCompare(b)).map(([family,models])=>({family,models}));
}
