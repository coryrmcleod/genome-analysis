// A finite reference-template perturbation, never calibrated uncertainty.
const simplex=values=>{
 const ordered=[...values].sort((a,b)=>b-a);let sum=0,threshold=0;
 for(let i=0;i<ordered.length;i++){sum+=ordered[i];const next=(sum-1)/(i+1);if(ordered[i]>next)threshold=next}
 return values.map(value=>Math.max(value-threshold,0));
};
function identifiable(matrix,markers){
 const contrasts=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>matrix[i][j]-matrix[i][6]-matrix[6][j]+matrix[6][6]));
 const scale=Math.max(...contrasts.map((row,index)=>row[index]));if(!Number.isFinite(scale)||scale<=0)return false;
 const tolerance=Number.EPSILON*Math.max(1,markers)*scale,lower=Array.from({length:6},()=>Array(6).fill(0));
 for(let i=0;i<6;i++)for(let j=0;j<=i;j++){
  let value=contrasts[i][j];for(let k=0;k<j;k++)value-=lower[i][k]*lower[j][k];
  if(i===j){if(!Number.isFinite(value)||value<=tolerance)return false;lower[i][j]=Math.sqrt(value)}else lower[i][j]=value/lower[j][j];
 }
 return true;
}
function fit(matrix,vector){
 const step=1/Math.max(...matrix.map(row=>row.reduce((sum,value)=>sum+Math.abs(value),0)));
 if(!Number.isFinite(step))return null;
 let fractions=Array(7).fill(1/7);
 for(let iteration=0;iteration<2000;iteration++){
  const next=simplex(fractions.map((value,i)=>value-step*(matrix[i].reduce((sum,value,j)=>sum+value*fractions[j],0)-vector[i])));
  const change=Math.max(...fractions.map((value,i)=>Math.abs(value-next[i])));fractions=next;
  if(change<1e-9)return fractions;
 }
 return null;
}
export function referenceTemplateSensitivity(panel,dosages,pointFractions){
 if(!Array.isArray(dosages)||dosages.length!==panel.markers.length||Array.from(dosages).some(value=>value!==null&&![0,1,2].includes(value))||!Array.isArray(pointFractions)||pointFractions.length!==7||Array.from(pointFractions).some(value=>!Number.isFinite(value)||value<0||value>1)||Math.abs(pointFractions.reduce((sum,value)=>sum+value,0)-1)>1e-6)throw Error('Invalid ancestry sensitivity inputs');
 const codes=panel.groups.map(group=>group.code),members=codes.map(code=>panel.populations.map((population,index)=>population.region===code?index:-1).filter(index=>index>=0));
 const sums=members.map(indexes=>panel.markers.map(marker=>indexes.reduce((sum,index)=>sum+marker.populationFrequencies[index],0)));
 const low=[...pointFractions],high=[...pointFractions],failures=[];let attempted=0,evaluated=0,largest=null;
 const omittedSinglePopulationGroups=codes.filter((_,index)=>members[index].length<2);
 const finish=reason=>({kind:'ancestry-reference-template-sensitivity',version:1,method:'leave-one-sampled-population-v1',status:evaluated===0?'Unavailable':failures.length||omittedSinglePopulationGroups.length?'Partial':'Complete',...(reason?{reason}:{}),attempted,evaluated,failures,omittedSinglePopulationGroups,usableMarkers:dosages.filter(value=>value!==null).length,maximumAbsoluteChange:Math.max(...low.map((value,index)=>Math.max(pointFractions[index]-value,high[index]-pointFractions[index]))),largestChangeOmission:largest,groups:codes.map((code,index)=>({code,low:low[index],high:high[index]}))});
 // This perturbation assumes equal population weights within each group.
 // Do not present it for a different or incoherent template construction.
 if(members.some(indexes=>!indexes.length)||panel.markers.some((marker,index)=>codes.some((_,group)=>Math.abs(sums[group][index]/members[group].length-marker.frequencies[group])>1e-6)))return finish('Broad templates do not reproduce the stored population averages within rounding precision');
 for(let populationIndex=0;populationIndex<panel.populations.length;populationIndex++){
  const population=panel.populations[populationIndex],groupIndex=codes.indexOf(population.region);
  if(groupIndex<0||members[groupIndex].length<2)continue;attempted++;
  const matrix=Array.from({length:7},()=>Array(7).fill(0)),vector=Array(7).fill(0);let usable=0;
  for(let markerIndex=0;markerIndex<dosages.length;markerIndex++){
   const dosage=dosages[markerIndex];if(dosage===null)continue;usable++;
   const marker=panel.markers[markerIndex],frequencies=[...marker.frequencies];
   frequencies[groupIndex]=(sums[groupIndex][markerIndex]-marker.populationFrequencies[populationIndex])/(members[groupIndex].length-1);
   const mean=frequencies.reduce((sum,value)=>sum+value,0)/7,weight=1/Math.max(mean*(1-mean),.05),x=frequencies.map(value=>2*(value-mean)),y=dosage-2*mean;
   for(let i=0;i<7;i++){vector[i]+=weight*x[i]*y;for(let j=0;j<7;j++)matrix[i][j]+=weight*x[i]*x[j]}
  }
  if(!identifiable(matrix,usable)){failures.push({code:population.code,reason:'Numerically indistinguishable components'});continue}
  const fractions=fit(matrix,vector);
  if(!fractions){failures.push({code:population.code,reason:'Fit did not converge'});continue}
  evaluated++;const change=Math.max(...fractions.map((value,index)=>Math.abs(value-pointFractions[index])));
  if(change>1e-12&&(!largest||change>largest.maximumAbsoluteChange))largest={code:population.code,label:population.label,region:population.region,maximumAbsoluteChange:change};
  fractions.forEach((value,index)=>{low[index]=Math.min(low[index],value);high[index]=Math.max(high[index],value)});
 }
 return finish(evaluated===0?'No reference-population omission produced an identifiable converged fit':undefined);
}
export function validateReferenceTemplateSensitivity(result,pointGroups,usableMarkers){
 const fail=()=>{throw Error('Invalid ancestry reference sensitivity');};
 const fraction=value=>Number.isFinite(value)&&value>=0&&value<=1;
 if(!Array.isArray(pointGroups)||pointGroups.length!==7||Array.from(pointGroups).some(group=>!group||typeof group.code!=='string'||!group.code.trim()||!fraction(group.fraction))||new Set(pointGroups.map(group=>group.code)).size!==7)fail();
 if(result&&['groups','failures','omittedSinglePopulationGroups'].some(key=>Array.isArray(result[key])&&Array.from(result[key]).some(value=>value===undefined)))fail();
 const codes=pointGroups.map(group=>group.code),points=new Map(pointGroups.map(group=>[group.code,group.fraction]));
 if(!result||result.kind!=='ancestry-reference-template-sensitivity'||result.version!==1||result.method!=='leave-one-sampled-population-v1'||!['Complete','Partial','Unavailable'].includes(result.status)||!Number.isInteger(result.attempted)||result.attempted<0||result.attempted>120||!Number.isInteger(result.evaluated)||result.evaluated<0||result.evaluated>result.attempted||result.usableMarkers!==usableMarkers||!Array.isArray(result.failures)||result.failures.length!==result.attempted-result.evaluated||!Array.isArray(result.omittedSinglePopulationGroups)||result.omittedSinglePopulationGroups.length>7||new Set(result.omittedSinglePopulationGroups).size!==result.omittedSinglePopulationGroups.length||result.omittedSinglePopulationGroups.some(code=>!codes.includes(code))||!Array.isArray(result.groups)||result.groups.length!==7||new Set(result.groups.map(group=>group?.code)).size!==7||result.groups.some(group=>!group||!points.has(group.code)||![group.low,group.high].every(fraction)||group.low>points.get(group.code)||group.high<points.get(group.code))||!fraction(result.maximumAbsoluteChange))fail();
 if(new Set(result.failures.map(row=>row?.code)).size!==result.failures.length||result.failures.some(row=>!row||typeof row.code!=='string'||!row.code.trim()||row.code.length>128||!['Numerically indistinguishable components','Fit did not converge'].includes(row.reason)))fail();
 const expectedStatus=result.evaluated===0?'Unavailable':result.failures.length||result.omittedSinglePopulationGroups.length?'Partial':'Complete';if(result.status!==expectedStatus)fail();
 if(result.status==='Unavailable'&&(typeof result.reason!=='string'||!result.reason.trim()||result.reason.length>512))fail();
 if(result.reason!==undefined&&(typeof result.reason!=='string'||result.reason.length>512))fail();
 const maximum=Math.max(...result.groups.map(group=>Math.max(points.get(group.code)-group.low,group.high-points.get(group.code))));
 if(Math.abs(maximum-result.maximumAbsoluteChange)>1e-9)fail();
 if(!result.evaluated&&(maximum!==0||result.largestChangeOmission!==null))fail();
 const largest=result.largestChangeOmission;
 if(largest===null){if(maximum>1e-12)fail()}
 else if(!largest||typeof largest.code!=='string'||!largest.code.trim()||largest.code.length>128||typeof largest.label!=='string'||!largest.label.trim()||largest.label.length>256||!codes.includes(largest.region)||result.failures.some(row=>row.code===largest.code)||!fraction(largest.maximumAbsoluteChange)||Math.abs(largest.maximumAbsoluteChange-maximum)>1e-9||maximum<=1e-12)fail();
 return result;
}
