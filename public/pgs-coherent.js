import {empiricalPercentile} from './pgs-reference.js';
import {finitePGSMidpoint} from './pgs-numeric.js';
export function validateOrientationBasis(basis,sampleCount=basis?.baseScores?.length,requireReferenceBounds=false){
 const dense=(values,length,valid)=>Array.isArray(values)&&values.length===length&&Array.from(values).every(valid);
 if(!Number.isSafeInteger(sampleCount)||sampleCount<1||!dense(basis?.baseScores,sampleCount,Number.isFinite)||!Array.isArray(basis.terms)||Array.from(basis.terms).some(term=>!term||typeof term.id!=='string'||!term.id.trim())||new Set(basis.terms.map(term=>term.id)).size!==basis.terms.length)throw Error('Invalid orientation basis');
 const lower=basis.referenceLower===undefined?0:basis.referenceLower,upper=basis.referenceUpper===undefined?0:basis.referenceUpper;
 if(!Number.isFinite(lower)||!Number.isFinite(upper)||lower>upper||requireReferenceBounds&&(!Number.isFinite(basis.referenceLower)||!Number.isFinite(basis.referenceUpper)))throw Error('Invalid missing-reference bounds');
 for(const term of basis.terms){
  if(!Array.isArray(term.candidates)||term.candidates.length<2||!dense(term.candidates,term.candidates.length,value=>typeof value==='string'&&!!value.trim())||new Set(term.candidates).size!==term.candidates.length||!dense(term.contributions,term.candidates.length,vector=>dense(vector,sampleCount,Number.isFinite)))throw Error('Invalid orientation vectors');
 }
 return basis;
}
// Model orientation is shared by the target and all reference individuals.
export function coherentSensitivity(model,reference,maxScenarios=512,estimate=null){
 const basis=reference.orientationBasis;if(!basis)return null;
 validateOrientationBasis(basis,basis.baseScores?.length,!!reference.missingReferenceTerms?.length);
 const referenceLower=basis.referenceLower??0,referenceUpper=basis.referenceUpper??0,referenceMidpoint=finitePGSMidpoint(referenceLower,referenceUpper);
 const count=basis.terms.reduce((n,t)=>n*t.candidates.length,1);
 const lookup=new Map(model.terms.map(t=>[t.id,t])),uncertain=new Set(basis.terms.map(t=>t.id));
 const assumed=new Map((estimate?.terms||[]).filter(t=>t.assumedGenotypes?.length===1&&t.method.startsWith('Assumed population modal genotype')).map(t=>[t.id,t.assumedGenotypes[0].split('/')]));
 const modalGenotype=t=>{const g=assumed.get(t.id);return g?.length===2&&g.every(a=>t.alleleMode==='effect-only'?t.mapping.alleles.includes(a):a===t.effectAllele||a===t.otherAllele)?g:null;};
 let fixedLow=0,fixedHigh=0,missing=0;
 let fixedCentral=0,centralAvailable=true;
 for(const t of model.terms)if(!uncertain.has(t.id)){
  if(Number.isFinite(t.contribution)){fixedLow+=t.contribution;fixedHigh+=t.contribution;fixedCentral+=t.contribution;}
  else{fixedLow+=Math.min(0,2*t.weight);fixedHigh+=Math.max(0,2*t.weight);missing++;const g=modalGenotype(t);if(g)fixedCentral+=g.filter(a=>a===t.effectAllele).length*t.weight;else centralAvailable=false;}
 }
 const observed=t=>['Called','Strand ambiguous','Effect orientation unresolved'].includes(t.status)&&typeof t.genotype==='string'&&t.genotype.split(/[|/]/).length===2&&t.genotype.split(/[|/]/).every(a=>t.mapping.alleles.includes(a));
 for(const u of basis.terms)if(!observed(lookup.get(u.id)))missing++;
 if(count>maxScenarios){
  let guaranteed=0,possible=0;
  // Bound reference-minus-target, so a shared ambiguous allele cancels when
  // genotypes match. Different reference comparisons may still choose different
  // orientations, hence the final interval is conservative rather than exact.
  const tolerance=1e-9*model.terms.reduce((n,t)=>n+2*Math.abs(t.weight),0);
  for(let i=0;i<basis.baseScores.length;i++){
   let lo=basis.baseScores[i]+referenceLower-fixedHigh,hi=basis.baseScores[i]+referenceUpper-fixedLow;
   for(const u of basis.terms){const t=lookup.get(u.id),known=observed(t),gt=known?t.genotype.split(/[|/]/):null;
    const lower=[],upper=[];
    for(let a=0;a<u.candidates.length;a++){
     const value=u.contributions[a][i],target=known?gt.filter(x=>x===u.candidates[a]).length*t.weight:null;
     lower.push(value-(known?target:Math.max(0,2*t.weight)));
     upper.push(value-(known?target:Math.min(0,2*t.weight)));
    }
    lo+=Math.min(...lower);hi+=Math.max(...upper);
   }
   // Near-zero intervals are retained conservatively; only a numerically
   // collapsed zero interval is treated as an invariant tie.
   if(hi < -tolerance)guaranteed++;
   if(lo <= tolerance)possible++;
   if(lo===0&&hi===0){guaranteed+=0.5;possible-=0.5;}
  }
  return {lower:100*guaranteed/basis.baseScores.length,upper:100*possible/basis.baseScores.length,point:null,scenarioCount:null,comparisonMethod:'pairwise shared-orientation bounds',missingGenotypes:missing};
 }
 const scenarios=[];
 for(let k=0;k<count;k++){
  let code=k,low=fixedLow,high=fixedHigh,central=fixedCentral,hasCentral=centralAvailable;const scores=[...basis.baseScores],alleles={};
  for(const u of basis.terms){
   const index=code%u.candidates.length;code=Math.floor(code/u.candidates.length);
   const allele=u.candidates[index],t=lookup.get(u.id);alleles[u.id]=allele;
   for(let i=0;i<scores.length;i++)scores[i]+=u.contributions[index][i];
   if(observed(t)){const contribution=t.genotype.split(/[|/]/).filter(a=>a===allele).length*t.weight;low+=contribution;high+=contribution;central+=contribution;}
   else{low+=Math.min(0,2*t.weight);high+=Math.max(0,2*t.weight);const g=modalGenotype(t);if(g)central+=g.filter(a=>a===allele).length*t.weight;else hasCentral=false;}
  }
  scenarios.push({alleles,scoreLower:low,scoreUpper:high,lower:empiricalPercentile(scores.map(s=>s+referenceUpper),low),upper:empiricalPercentile(scores.map(s=>s+referenceLower),high),centralRank:hasCentral?empiricalPercentile(scores.map(s=>s+referenceMidpoint),central):null});
 }
 let scenarioSummary=null;
 if(scenarios.every(s=>s.centralRank!==null)){
  const values=scenarios.map(s=>s.centralRank).sort((a,b)=>a-b),mid=Math.floor(values.length/2);
  scenarioSummary={median:values.length%2?values[mid]:(values[mid-1]+values[mid])/2,lower:values[0],upper:values.at(-1),count:values.length,assumedGenotypes:Object.fromEntries(assumed),method:'Descriptive median of scenario ranks, counting each enumerated allele-direction combination once. Missing or quality-excluded calls use the unique population-modal genotype when available. Directions have not been assigned biological probabilities; the median is not a most-likely percentile and may not itself be attainable. The full range still retains all missing-genotype dosages.'};
  if(reference.missingReferenceTerms?.length){scenarioSummary.neutralReference=true;scenarioSummary.method+=' Additional neutral assumption: every reference individual receives one effect-allele copy at each absent reference site. This is an assumed midpoint contribution, not a measured genotype or an estimate from allele frequencies. The resulting central comparison and conditional range are hypothetical; the full bounds retain all possible reference dosages.';}
 }
 return {lower:Math.min(...scenarios.map(s=>s.lower)),upper:Math.max(...scenarios.map(s=>s.upper)),point:null,scenarioCount:count,comparisonMethod:'exhaustive shared-orientation scenarios',missingGenotypes:missing,scenarioSummary,scenarios};
}
