const complement={A:'T',T:'A',C:'G',G:'C'};
export function harmonizeModelAlleles(effect,other,referenceAlleles){
 if(typeof effect!=='string'||!/^[ACGT]$/.test(effect)||typeof other!=='string'||!/^[ACGT]$/.test(other)||effect===other||!Array.isArray(referenceAlleles)||!referenceAlleles.length||Array.from(referenceAlleles).some(a=>typeof a!=='string'||!/^[ACGT]+$/.test(a)))throw Error('Invalid model alleles');
 if(referenceAlleles.includes(effect)&&referenceAlleles.includes(other))return {effectAllele:effect,otherAllele:other,reverseComplemented:false};
 const e=complement[effect],o=complement[other];
 if(referenceAlleles.includes(e)&&referenceAlleles.includes(o))return {effectAllele:e,otherAllele:o,reverseComplemented:true};
 throw Error('Model alleles cannot be matched or reverse-complemented to the reference');
}

