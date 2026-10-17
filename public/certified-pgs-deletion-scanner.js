// Browser/offline adapter for the exact certificate; no general indel admission.
import {validateReviewedPGSDeletionTarget,CERVICAL_PGS_DELETION} from './reviewed-pgs-deletion.js';
import {createReviewedDeletionStream} from './reviewed-deletion-stream.js';
export function createCertifiedPGSDeletionScanner(targets,{build,sampleCount,sampleIndex}={}){
 if(!Array.isArray(targets)||targets.length!==1||!['GRCh37','GRCh38'].includes(build))throw Error('Only one exact reviewed deletion target is supported');
 const target=structuredClone(validateReviewedPGSDeletionTarget(targets[0])),e=CERVICAL_PGS_DELETION,b=e.builds[build];
 const stream=createReviewedDeletionStream({build,chrom:'6',start:b.windowStart,sequence:e.sequence},{position:b.position,ref:'AGA',alt:'A'},{build,sampleCount,sampleIndex});
 let finished=false;
 return {
  consume(fields){if(finished)throw Error('Certified deletion scanner finalized');stream.consume(Array.isArray(fields)&&typeof fields[0]==='string'?[fields[0].replace(/^chr/i,''),...fields.slice(1)]:fields);},
  finish(){
   if(finished)throw Error('Certified deletion scanner finalized');finished=true;
   const call=stream.finish(),alleles=call.status==='Called'?call.genotype.split(/[|/]/).map(index=>index==='0'?'AGA':'A'):null;
   return {build,results:[{...target,status:call.status,alleles,genotype:alleles?.join(call.phase==='phased'?'|':'/')||'—',copies:call.dosage,phase:call.phase,inputCall:call,notes:[call.status==='Called'?'Exact full local alternate-haplotype match against the frozen reference window; original genotype phase retained. No missing-as-reference inference.':'Deletion call withheld: '+(call.reason||call.status)+'. No missing-as-reference or strand inference.']}]};
  }
 };
}
