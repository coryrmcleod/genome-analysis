// UCSC chain coordinates are zero-based, half-open. Return every containing
// ungapped block, never the first or highest scoring hit.
export function chainIntervalMappings(text,chrom,start,end){
 if(!/^chr(?:[1-9]|1\d|2[0-2])$/.test(chrom)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start)throw Error('Invalid chain query');
 const hits=[];let h=null,t=0,q=0;
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();if(!line||line.startsWith('#'))continue;
  if(line.startsWith('chain ')){
   if(h)throw Error('Interrupted chain');
   h=line.split(/\s+/);
   if(h.length!==13||h[4]!=='+'||!['+','-'].includes(h[9])||[3,5,6,8,10,11].some(i=>!/^\d+$/.test(h[i])))throw Error('Unsupported chain header');
   if([3,5,6,8,10,11].some(i=>!Number.isSafeInteger(Number(h[i])))||Number(h[3])<=0||Number(h[8])<=0||Number(h[5])>=Number(h[6])||Number(h[6])>Number(h[3])||Number(h[10])>=Number(h[11])||Number(h[11])>Number(h[8]))throw Error('Invalid chain coordinate bounds');
   t=Number(h[5]);q=Number(h[10]);continue;
  }
  const a=line.split(/\s+/);
  if(!h||![1,3].includes(a.length)||a.some(x=>!/^\d+$/.test(x))||Number(a[0])<=0)throw Error('Malformed chain block');
  if(a.some(x=>!Number.isSafeInteger(Number(x))))throw Error('Invalid chain block integer');
  const [size,dt=0,dq=0]=a.map(Number);
  if(t+size>Number(h[6])||q+size>Number(h[11]))throw Error('Chain block exceeds declared interval');
  if(h[2]===chrom&&start>=t&&end<=t+size){
   // Subtract within the source block before adding to the target coordinate.
   // All final coordinates are bounded by the validated safe-integer header.
   const qs=q+(start-t),qe=q+(end-t);
   hits.push({chainId:h[12],sourceChrom:chrom,sourceStart:start,sourceEnd:end,targetChrom:h[7],targetStart:h[9]==='-'?Number(h[8])-qe:qs,targetEnd:h[9]==='-'?Number(h[8])-qs:qe,strand:h[9]==='-'?-1:1});
  }
  t+=size+dt;q+=size+dq;
  if(a.length===1){if(t!==Number(h[6])||q!==Number(h[11]))throw Error('Incomplete chain');h=null;}
 }
 if(h)throw Error('Unterminated chain');
 return hits;
}
