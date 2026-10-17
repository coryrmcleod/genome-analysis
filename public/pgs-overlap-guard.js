// Conservative overlap protection for every SNP, independent of optional libraries.
// It never identifies an indel, reconstructs phase, or assigns a genotype.
const lowerBound=(rows,value)=>{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].position<value)lo=mid+1;else hi=mid;}return lo;};
export function createPGSOverlapGuard(targets,{build,sampleCount,sampleIndex}={}){
 if(!Array.isArray(targets)||!['GRCh37','GRCh38'].includes(build)||!Number.isSafeInteger(sampleCount)||sampleCount<1||!Number.isSafeInteger(sampleIndex)||sampleIndex<0||sampleIndex>=sampleCount)throw Error('Explicit overlap guard context required');
 const index=new Map(),all=new Set(),blocked=new Set();let finished=false;
 for(const target of targets){const m=target.mappings?.[build];if(!m||m.ref.length!==1||!Number.isSafeInteger(m.position)||m.position<1||all.has(target.id))throw Error('Invalid SNP overlap target');all.add(target.id);if(!index.has(m.chrom))index.set(m.chrom,[]);index.get(m.chrom).push({id:target.id,position:m.position});}
 for(const rows of index.values())rows.sort((a,b)=>a.position-b.position);
 const blockChrom=chrom=>{for(const t of index.get(chrom)||[])blocked.add(t.id);};
 return {
  consume(fields){
   if(finished)throw Error('Overlap guard finalized');if(!Array.isArray(fields)||fields.length!==9+sampleCount||fields.some(x=>typeof x!=='string'))throw Error('Malformed overlap record');
   const chrom=fields[0].replace(/^chr/i,''),position=Number(fields[1]),ref=fields[3],alts=fields[4].split(',');
   if(fields[6]!=='PASS'||!Number.isSafeInteger(position)||position<1||!ref||alts.every(a=>a==='<NON_REF>'||a==='.'||/^[ACGT]$/.test(a)&&ref.length===1))return;
   const keys=fields[8].split(':'),values=fields[9+sampleIndex].split(':'),ambiguous=new Set(keys).size!==keys.length||keys.some(k=>!k)||values.length>keys.length,gt=values[keys.indexOf('GT')];
   const validGT=!ambiguous&&typeof gt==='string'&&/^(?:0|[1-9]\d*)[|/](?:0|[1-9]\d*)$/.test(gt)&&gt.split(/[|/]/).every(x=>Number.isSafeInteger(Number(x))&&Number(x)<=alts.length);
   const called=validGT?gt.split(/[|/]/).map(Number).filter(x=>x>0).map(x=>alts[x-1]):alts;
   if(!called.length||called.every(a=>a==='<NON_REF>'||a==='.'||/^[ACGT]$/.test(a)&&ref.length===1))return;
   const structural=called.some(a=>/[<>\[\]*]/.test(a)),breakend=called.some(a=>/[\[\]]/.test(a)),info=fields[7].split(';'),ends=info.filter(x=>x.startsWith('END=')),endText=ends[0]?.slice(4);
   if(breakend){for(const id of all)blocked.add(id);return;}
   let end=position+ref.length-1;
   if(structural){
    if(called.every(a=>a==='*'))end=position;
    else if(ends.length!==1||!/^\d+$/.test(endText||'')||!Number.isSafeInteger(Number(endText))||Number(endText)<position||info.some(x=>/^(?:CIPOS|CIEND)=/.test(x))){blockChrom(chrom);return;}
    else end=Number(endText);
   }
   const rows=index.get(chrom)||[];for(let i=lowerBound(rows,position);i<rows.length&&rows[i].position<=end;i++)blocked.add(rows[i].id);
  },
  finish(){if(finished)throw Error('Overlap guard finalized');finished=true;return new Set(blocked);}
 };
}
