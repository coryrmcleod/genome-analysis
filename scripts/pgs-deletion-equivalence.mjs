import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
// Research-only representation proof. This does not normalize a VCF, call a
// genotype, authorize a Catalog override, or admit an indel-containing score.
export function proveEquivalentDeletion(window,first,second){
 if(!['GRCh37','GRCh38'].includes(window?.build)||!/^(?:[1-9]|1\d|2[0-2])$/.test(window.chrom)||!Number.isSafeInteger(window.start)||window.start<1||typeof window.sequence!=='string'||!/^\b[ACGT]{100,1000}\b$/.test(window.sequence))throw Error('Invalid primary reference window');
 const edit=variant=>{
  if(variant?.build!==window.build||variant.chrom!==window.chrom||variant.strand!==1||!Number.isSafeInteger(variant.position)||!/^([ACGT])$/.test(variant.alt)||!/^([ACGT]){2,51}$/.test(variant.ref)||variant.ref[0]!==variant.alt)throw Error('Only explicit forward anchored short deletions are supported');
  const index=variant.position-window.start;
  if(index<32||index+variant.ref.length>window.sequence.length-32)throw Error('Insufficient reference flanks');
  if(window.sequence.slice(index,index+variant.ref.length)!==variant.ref)throw Error('Deletion REF does not match primary sequence');
  return window.sequence.slice(0,index)+variant.alt+window.sequence.slice(index+variant.ref.length);
 };
 const a=edit(first),b=edit(second);if(a!==b)throw Error('Deletion representations produce different haplotypes');
 return {build:window.build,chrom:window.chrom,windowStart:window.start,windowLength:window.sequence.length,referenceSha256:hash(window.sequence),alternateSha256:hash(a),deletedBases:window.sequence.length-a.length,scope:'Representation equivalence only; no scoring admission or genotype inference'};
}
