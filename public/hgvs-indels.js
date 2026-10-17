// Only fully specified genomic single deletions, insertions and tandem duplications.
export function parseGenomicIndel(hgvs){
 let m=/^(NC_\d+\.\d+):g\.([1-9]\d*)_([1-9]\d*)ins([ACGT]{1,50})$/.exec(hgvs);
 if(m){const start=Number(m[2]),end=Number(m[3]);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end!==start+1)throw Error('Insertion must have adjacent, exact flanks');return {accession:m[1],kind:'ins',start,end,sequence:m[4],readStart:start,readEnd:end};}
 m=/^(NC_\d+\.\d+):g\.([1-9]\d*)(?:_([1-9]\d*))?(del|dup)([ACGT]*)$/.exec(hgvs);
 if(!m)throw Error('Unsupported or uncertain genomic indel HGVS');const start=Number(m[2]),end=Number(m[3]||m[2]),kind=m[4];
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||m[3]&&end===start||end-start+1>50||kind==='del'&&start===1)throw Error('Indel coordinates outside the supported exact range');
 if(m[5]&&m[5].length!==end-start+1)throw Error('Explicit sequence length disagrees with HGVS range');
 return {accession:m[1],kind,start,end,sequence:m[5]||null,readStart:kind==='del'?start-1:start,readEnd:end};
}
export function genomicIndelToVCF(parsed,reference){
 const sequence=reference.toUpperCase();if(!/^[ACGT]+$/.test(sequence)||sequence.length!==parsed.readEnd-parsed.readStart+1)throw Error('Reference span does not match HGVS');
 if(parsed.kind==='ins')return {position:parsed.start,ref:sequence[0],alt:sequence[0]+parsed.sequence};
 const changed=parsed.kind==='del'?sequence.slice(1):sequence;
 if(parsed.sequence&&parsed.sequence!==changed)throw Error('Explicit HGVS sequence disagrees with reference');
 return parsed.kind==='del'?{position:parsed.start-1,ref:sequence,alt:sequence[0]}:{position:parsed.end,ref:sequence.at(-1),alt:sequence.at(-1)+sequence};
}
