// Pure deletion matching kernel. Model admission requires a separate certificate.
// A complete alternative haplotype is matched against an independently verified
// local reference window. No rsID lookup, missing-as-reference, or strand inference.
const dna=/^[ACGT]+$/;
function edit(window,position,ref,alt){
 const offset=position-window.start;
 if(!Number.isSafeInteger(position)||offset<32||offset+ref.length>window.sequence.length-32||window.sequence.slice(offset,offset+ref.length)!==ref)return null;
 return window.sequence.slice(0,offset)+alt+window.sequence.slice(offset+ref.length);
}
export function reviewedDeletionDefinition(window,representation){
 if(!window||!['GRCh37','GRCh38'].includes(window.build)||!/^(?:[1-9]|1\d|2[0-2])$/.test(window.chrom)||!Number.isSafeInteger(window.start)||window.start<1||typeof window.sequence!=='string'||!dna.test(window.sequence)||window.sequence.length<100||window.sequence.length>1000)throw Error('Invalid reviewed reference window');
 const {position,ref,alt}=representation;
 if(typeof ref!=='string'||typeof alt!=='string'||!dna.test(ref)||!dna.test(alt)||ref.length<2||ref.length>51||alt.length!==1||ref[0]!==alt)throw Error('Only explicit anchored short deletions are reviewed');
 const alternate=edit(window,position,ref,alt);if(alternate===null)throw Error('Reviewed deletion REF/window disagreement');
 const equivalents=[];
 for(let offset=32;offset+ref.length<=window.sequence.length-32;offset++){
  const candidateRef=window.sequence.slice(offset,offset+ref.length),candidateAlt=candidateRef[0],candidatePosition=window.start+offset;
  if(edit(window,candidatePosition,candidateRef,candidateAlt)===alternate)equivalents.push({position:candidatePosition,ref:candidateRef,alt:candidateAlt});
 }
 if(!equivalents.length)throw Error('No reviewed representation');
 if(equivalents[0].position===window.start+32||equivalents.at(-1).position+ref.length===window.start+window.sequence.length-32)throw Error('Equivalent deletion reaches reference-context boundary');
 return {window:structuredClone(window),representation:{position,ref,alt},alternate,equivalents,span:{start:Math.min(...equivalents.map(r=>r.position)),end:Math.max(...equivalents.map(r=>r.position+r.ref.length-1))}};
}
const qualityPass=r=>r.filter==='PASS'&&[['GQ',20],['DP',10]].every(([key,min])=>typeof r[key]==='string'&&/^\d+(?:\.\d+)?$/.test(r[key])&&Number.isFinite(Number(r[key]))&&Number(r[key])>=min);
export function countReviewedDeletion(window,representation,records,build){
 const definition=reviewedDeletionDefinition(window,representation),result={status:'Not observed',dosage:null,genotype:null,phase:null,representation:null,scope:'Exact reviewed haplotype matching only; not model admission or clinical validation'};
 if(build!==window.build)return {...result,status:'Unsupported build'};
 if(!Array.isArray(records)||records.length>100000)throw Error('Invalid bounded record inventory');
 const exact=[],competitors=[];
 for(const r of records){
  if(r.chrom!==window.chrom||!Number.isSafeInteger(r.position)||r.position<1||typeof r.ref!=='string'||typeof r.alt!=='string')continue;
  const symbolic=/[<>\[\]*]/.test(r.alt),end=symbolic&&Number.isSafeInteger(r.end)&&r.end>=r.position?r.end:r.position+r.ref.length-1;
  const overlap=r.position<=definition.span.end&&end>=definition.span.start;
  const alternatives=r.alt.split(','),related=dna.test(r.ref)&&r.ref.length===representation.ref.length&&alternatives.some(alt=>dna.test(alt)&&alt.length===1&&r.ref[0]===alt&&edit(window,r.position,r.ref,alt)===definition.alternate);
  if(related){exact.push({...r,unreviewedMultiallelic:alternatives.length!==1});continue;}
  const gt=typeof r.GT==='string'?r.GT.split(/[|/]/):[],validGT=typeof r.GT==='string'&&/^(?:0|[1-9]\d*)[|/](?:0|[1-9]\d*)$/.test(r.GT)&&gt.every(a=>Number.isSafeInteger(Number(a))&&Number(a)<=alternatives.length),nonReference=gt.some(a=>/^\d+$/.test(a)&&Number(a)>0);
  // A passing overlap with unresolved genotype is not a reference call. Low or
  // absent small-variant quality cannot establish that a competing ALT is absent.
  if(overlap&&r.filter==='PASS'&&(!validGT||nonReference))competitors.push(r);
 }
 if(exact.length>1)return {...result,status:'Duplicate records'};
 if(!exact.length)return {...result,status:competitors.length?'Overlapping records':'Not observed'};
 const r=exact[0],observed={genotype:r.GT??null,phase:typeof r.GT==='string'&&r.GT.includes('|')?'phased':'unphased',representation:{position:r.position,ref:r.ref,alt:r.alt}};
 if(r.unreviewedMultiallelic)return {...result,...observed,status:'Unsupported representation'};
 if(competitors.length)return {...result,...observed,status:'Overlapping records'};
 if(typeof r.GT!=='string'||r.GT.includes('.'))return {...result,...observed,status:'No call'};
 if(!/^[01][|/][01]$/.test(r.GT))return {...result,...observed,status:'Unsupported call'};
 if(!qualityPass(r))return {...result,...observed,status:'Quality limited'};
 return {...result,...observed,status:'Called',dosage:r.GT.split(/[|/]/).filter(a=>a==='1').length};
}
