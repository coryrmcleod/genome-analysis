export function validateAncestryNumericalVerification(evidence,referenceSha256,heldOutSamples){
 const fail=()=>{throw Error('Invalid ancestry numerical verification evidence');};
 const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 const count=value=>Number.isSafeInteger(value)&&value>=0;
 if(!evidence||evidence.kind!=='ancestry-numerical-verification'||evidence.version!==1||!hash(referenceSha256)||evidence.referenceSha256!==referenceSha256||typeof evidence.scope!=='string'||!evidence.scope.trim()||evidence.scope.length>512)fail();
 const original=evidence.original,missing=evidence.missing;
 for(const row of [original,missing])if(!row||!count(row.cases)||row.cases<100||!count(row.estimated)||!count(row.withheld)||row.estimated<1||row.estimated+row.withheld!==row.cases||!Number.isFinite(row.maximumFractionDifference)||row.maximumFractionDifference<0||row.maximumFractionDifference>2e-7||!Number.isFinite(row.maximumResidualDifference)||row.maximumResidualDifference<0||row.maximumResidualDifference>1e-7||!hash(row.evidenceSha256)||!hash(row.independentProofSha256))fail();
 if(original.components!==7||original.estimated!==original.cases||original.withheld!==0||missing.cases!==original.cases||!Number.isSafeInteger(missing.excludedMarkerStep)||missing.excludedMarkerStep<2||missing.excludedMarkerStep>10000||heldOutSamples!==undefined&&original.cases!==heldOutSamples)fail();
 return evidence;
}
