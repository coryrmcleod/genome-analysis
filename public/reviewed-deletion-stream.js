// Pure bounded adapter. Caller must supply a separately verified definition/build
// and explicit sample-column selection. Never reads files or infers a sample/build.
import {reviewedDeletionDefinition,countReviewedDeletion} from './reviewed-deletion-calls.js';
export function createReviewedDeletionStream(inputWindow,inputRepresentation,{build,sampleCount,sampleIndex,maxRecords=1000}={}){
 const window=structuredClone(inputWindow),representation=structuredClone(inputRepresentation);
 const definition=reviewedDeletionDefinition(window,representation);
 if(!['GRCh37','GRCh38'].includes(build)||!Number.isSafeInteger(sampleCount)||sampleCount<1||!Number.isSafeInteger(sampleIndex)||sampleIndex<0||sampleIndex>=sampleCount||!Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>10000)throw Error('Explicit bounded stream configuration required');
 const records=[];let failure=null,finished=false,consumed=0,retained=0;
 const fail=reason=>{failure??=reason;};
 return {
  consume(fields){
   if(finished)throw Error('Stream already finalized');
   consumed++;if(failure)return;
   if(!Array.isArray(fields)||fields.length!==9+sampleCount||fields.some(x=>typeof x!=='string')){fail('Malformed VCF field inventory');return;}
   const [chrom,pos,,ref,alt,,filter,info,format]=fields;
   if(chrom!==window.chrom&&chrom!=='chr'+window.chrom)return;
   if(!/^[1-9]\d*$/.test(pos)||!Number.isSafeInteger(Number(pos))||!ref.length){fail('Invalid chromosome record coordinate');return;}
   const position=Number(pos),ends=info.split(';').filter(x=>x.startsWith('END='));
   if(ends.length>1){fail('Duplicate END fields');return;}
   const endText=ends[0]?.slice(4),symbolic=/[<>\[\]*]/.test(alt);
   if(endText!==undefined&&(!/^[1-9]\d*$/.test(endText)||!Number.isSafeInteger(Number(endText))||Number(endText)<position)){fail('Invalid END coordinate');return;}
   // Unknown structural extents cannot safely be dismissed as non-overlapping.
   // Breakend partner coordinates/confidence intervals need a separate review.
   if(symbolic&&alt!=='<NON_REF>'&&(endText===undefined||/[\[\]]/.test(alt)||/(?:^|;)(?:CIPOS|CIEND)=/.test(info))){fail('Unreviewed structural extent');return;}
   const end=endText!==undefined?Number(endText):position+ref.length-1;
   if(position>definition.span.end||end<definition.span.start)return;
   const keys=format.split(':'),values=fields[9+sampleIndex].split(':');
   if(new Set(keys).size!==keys.length||keys.some(x=>!x)||keys[0]!=='GT'||values.length>keys.length){fail('Ambiguous FORMAT/sample fields');return;}
   if(retained>=maxRecords){fail('Relevant record limit exceeded');return;}
   const sample=Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
   records.push({chrom:window.chrom,position,ref,alt,filter,end,GT:sample.GT,GQ:sample.GQ,DP:sample.DP});retained++;
  },
  finish(){
   finished=true;
   const empty=countReviewedDeletion(window,representation,[],build);
   if(failure)return {...empty,status:'Stream withheld',reason:failure,consumed,retained};
   return {...countReviewedDeletion(window,representation,records,build),consumed,retained};
  }
 };
}
