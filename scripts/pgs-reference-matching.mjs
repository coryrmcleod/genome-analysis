import {isPalindromic} from '../public/pgs.js';
import {matchReferenceGenotypes} from './pgs-reference-genotypes.mjs';
export function matchReferenceTerm(term,mapping,rows,sampleCount){
 if(term.alleleMode==='effect-only'?term.effectAlleleCandidates.length!==1:isPalindromic(term.effectAllele,term.otherAllele))return {status:'ambiguous'};
 return matchReferenceGenotypes(term,mapping,rows,sampleCount);
}
