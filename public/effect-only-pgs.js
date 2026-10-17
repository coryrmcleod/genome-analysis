// Do not invent a missing comparison allele. Retain every reference-compatible orientation.
const complement={A:'T',C:'G',G:'C',T:'A'};
export function effectAlleleCandidates(effect,referenceAlleles){
 if(typeof effect!=='string'||!/^[ACGT]$/.test(effect)||!Array.isArray(referenceAlleles)||!referenceAlleles.length||Array.from(referenceAlleles).some(a=>typeof a!=='string'||!/^[ACGT]+$/.test(a)))throw Error('Invalid effect-only allele');
 const candidates=[effect,complement[effect]].filter(a=>referenceAlleles.includes(a));
 if(!candidates.length)throw Error('Weighted allele has no reference-compatible orientation');return candidates;
}
export function possibleEffectDosages(genotypeAlleles,candidates){
 if(!Array.isArray(genotypeAlleles)||genotypeAlleles.length!==2||Array.from(genotypeAlleles).some(a=>typeof a!=='string'||!/^[ACGT]$/.test(a))||!Array.isArray(candidates)||!candidates.length||Array.from(candidates).some(a=>typeof a!=='string'||!/^[ACGT]$/.test(a)))throw Error('Invalid effect-only genotype or candidate alleles');
 return [...new Set(candidates.map(effect=>genotypeAlleles.filter(a=>a===effect).length))].sort((a,b)=>a-b);
}


