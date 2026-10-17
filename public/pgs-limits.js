// Resource bounds, not scientific admission criteria. Complete models only.
export const PGS_LIMITS=Object.freeze({models:400,termsPerModel:60000,totalTerms:120000});
export function validatePGSWorkload(models,termField){
 if(!['variants','terms'].includes(termField)||!Array.isArray(models)||models.length>PGS_LIMITS.models)throw Error('PGS model-count resource limit exceeded or invalid inventory');
 let total=0;
 for(const model of models){
  const terms=model?.[termField];
  if(!Array.isArray(terms)||terms.length>PGS_LIMITS.termsPerModel)throw Error('PGS per-model term limit exceeded or invalid terms');
  total+=terms.length;
  if(total>PGS_LIMITS.totalTerms)throw Error('PGS total-term resource limit exceeded; models must not be truncated');
 }
 return total;
}
