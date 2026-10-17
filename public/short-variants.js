import {validateMolecularConsequences} from './molecular-effects.js';
const bases=/^[ACGT]{1,51}$/;
export const NORMALIZATION_MARKER='normalized_unsplit_GRCh38_v1';
export function simpleIndel(ref,alt){return bases.test(ref)&&bases.test(alt)&&ref.length!==alt.length&&Math.min(ref.length,alt.length)===1&&ref[0]===alt[0];}
export function validateShortVariantLibrary(library){
 if(!library||library.build!=='GRCh38'||typeof library.version!=='string'||!Number.isFinite(Date.parse(library.retrievedAt))||!/^\d{4}-\d{2}-\d{2}$/.test(library.releaseDate)||!/^[a-f0-9]{64}$/.test(library.referenceSha256)||!Array.isArray(library.records)||!library.records.length||library.records.length>20000)throw Error('Invalid short-variant library');
 const ids=new Set(),keys=new Set();
 for(const r of library.records){const m=r.mappings?.GRCh38,a=r.clinvar?.[0];
  if(!/^clinvar:\d+$/.test(r.id)||ids.has(r.id)||r.variantKind!=='short-indel'||!m||!/^(?:[1-9]|1\d|2[0-2])$/.test(m.chrom)||!Number.isSafeInteger(m.position)||m.position<1||!simpleIndel(m.ref,r.effectAllele)||JSON.stringify(m.alleles)!==JSON.stringify([m.ref,r.effectAllele])||!a||r.clinvar.length!==1||r.id!=='clinvar:'+a.variationId||a.allele!==r.effectAllele||a.url!==`https://www.ncbi.nlm.nih.gov/clinvar/variation/${a.variationId}/`||!['Pathogenic','Likely_pathogenic','Pathogenic/Likely_pathogenic'].includes(a.classification)||!['reviewed_by_expert_panel','practice_guideline'].includes(a.reviewStatus)||a.stars!==(a.reviewStatus==='practice_guideline'?4:3)||a.releaseDate!==library.releaseDate)throw Error('Invalid short-variant record');
  validateMolecularConsequences(a.molecularConsequences);
  for(const k of ['gene','label','trait','summary','caution'])if(typeof r[k]!=='string'||!r[k]||r[k].length>10000)throw Error('Incomplete short-variant description');
  const key=[m.chrom,m.position,m.ref,r.effectAllele].join(':');if(keys.has(key))throw Error('Duplicate normalized short-variant representation');keys.add(key);ids.add(r.id);
 }
 return library;
}
function lowerBound(rows,value){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].start<value)lo=mid+1;else hi=mid;}return lo;}
function overlaps(index,chrom,start,end,maxSpan){const rows=index.get(chrom)||[],out=[];for(let i=lowerBound(rows,start-maxSpan+1);i<rows.length&&rows[i].start<=end;i++)if(rows[i].end>=start)out.push(rows[i]);return out;}
function addIndex(index,chrom,entry){if(!index.has(chrom))index.set(chrom,[]);index.get(chrom).push(entry);}
function parseCall(fields,sampleIndex){
 const names=fields[8]?.split(':')||[],values=fields[sampleIndex]?.split(':')||[],format=Object.fromEntries(names.map((k,i)=>[k,values[i]]));
 const gt=format.GT,notes=[],ambiguousFields=new Set(names).size!==names.length||names.some(k=>!k)||values.length>names.length;let status='Called',alleles=null;
 if(ambiguousFields)status='Unsupported call';
 else if(!gt||gt.includes('.'))status='No call';
 else if(!/^[01][|/][01]$/.test(gt))status='Unsupported call';
 else alleles=gt.split(/[|/]/).map(i=>[fields[3],fields[4]][Number(i)]);
 if(status==='Called'){
  if(fields[6]!=='PASS'){status='Quality limited';notes.push('Site FILTER did not pass.');}
  for(const [key,min] of [['GQ',20],['DP',10]])if(!/^\d+(?:\.\d+)?$/.test(format[key]||'')||!Number.isFinite(Number(format[key]))||Number(format[key])<min){status='Quality limited';notes.push(key+' missing, invalid, or below '+min+'.');}
 }
 return {status,alleles,genotype:alleles?.join('/')||'—',notes,ambiguousFields,quality:{GQ:format.GQ??null,DP:format.DP??null,FILTER:fields[6],GT:gt??null}};
}
export function createShortVariantScanner(input,overlapTargets=[]){
 const library=validateShortVariantLibrary(input),index=new Map(),snvs=new Map(),states=new Map(),blockedSNVIds=new Set();let marker=null,referenceHash=null,splitHistory=false;
 for(const r of library.records){const m=r.mappings.GRCh38;addIndex(index,m.chrom,{start:m.position,end:m.position+m.ref.length-1,record:r});}
 for(const r of overlapTargets){const m=r.mappings?.GRCh38;if(m&&m.ref.length===1)addIndex(snvs,m.chrom,{start:m.position,end:m.position,id:r.id});}
 for(const rows of [...index.values(),...snvs.values()])rows.sort((a,b)=>a.start-b.start);
 const ready=()=>marker===NORMALIZATION_MARKER&&referenceHash===library.referenceSha256&&!splitHistory;
 return {
  header(line){if(line.startsWith('##GenomeAnalysisIndelMatching='))marker=line.slice(line.indexOf('=')+1);if(line.startsWith('##GenomeAnalysisReferenceSHA256='))referenceHash=line.slice(line.indexOf('=')+1);if(line.startsWith('##bcftools_normCommand=')&&/(?:^|\s)(?:-m(?:\s|[+-])|--multiallelics(?:\s|=)|-a(?:\s|$)|--atomize(?:\s|=|$))/.test(line))splitHistory=true;},
  consume(fields,{format,build,sampleIndex,chrom,pos}){
   if(format!=='VCF'||build!=='GRCh38'||!ready())return;
   const ref=fields[3],alt=fields[4],key=[chrom,pos,ref,alt].join(':');
   let end=pos+ref.length-1;
      const symbolic=/[<>\[\]*]/.test(alt),explicitEnd=fields[7]?.match(/(?:^|;)END=(\d+)(?:;|$)/);
   if(symbolic&&explicitEnd&&Number(explicitEnd[1])>=pos)end=Number(explicitEnd[1]);
   const hits=overlaps(index,chrom,pos,end,51),snvHits=(ref.length>1||alt.split(',').some(a=>a.length!==ref.length)||symbolic)?overlaps(snvs,chrom,pos,end,1):[];
   if(!hits.length&&!snvHits.length)return false;
   const call=parseCall(fields,sampleIndex),gt=call.quality.GT,nonReference=typeof gt==='string'&&gt.split(/[|/]/).some(x=>/^\d+$/.test(x)&&Number(x)>0);
   // Passing non-reference or FORMAT-ambiguous overlaps withhold other calls.
   // Malformed genotype fields cannot establish a harmless reference state.
   const qualityPass=['GQ','DP'].every((k,i)=>/^\d+(?:\.\d+)?$/.test(call.quality[k]||'')&&Number.isFinite(Number(call.quality[k]))&&Number(call.quality[k])>=[20,10][i]);
   const competing=fields[6]==='PASS'&&(call.ambiguousFields||nonReference&&(symbolic||qualityPass&&/^\d+[|/]\d+$/.test(gt||'')));
   if(competing)for(const hit of snvHits)blockedSNVIds.add(hit.id);
   for(const hit of hits){
    const r=hit.record,m=r.mappings.GRCh38;let state=states.get(r.id);if(!state){state={exact:[],competitors:new Set()};states.set(r.id,state);}
    const exact=pos===m.position&&ref===m.ref&&alt===r.effectAllele&&simpleIndel(ref,alt);
    if(exact)state.exact.push({...call,key});else if(competing)state.competitors.add(key);
   }
   return hits.length>0||snvHits.length>0;
  },
  finish({format,build}){
   let required=null;if(format!=='VCF')required='Unsupported input';else if(build!=='GRCh38')required='Unsupported build';else if(!ready())required='Normalization required';
   const results=library.records.map(r=>{
    const s=states.get(r.id);let call={status:required||'Not observed',alleles:null,genotype:'—',notes:[]};
    if(!required&&s?.exact.length){call={...s.exact[0],notes:[...s.exact[0].notes]};if(s.exact.length>1){call.status='Duplicate records';call.notes.push('Multiple records represent this indel; interpretation withheld.');}else if(s.competitors.size){call.status='Overlapping records';call.notes.push('Another passing non-reference or FORMAT-ambiguous record overlaps this representation. No phase or complex-allele inference is attempted.');}}
    if(required==='Normalization required')call.notes.push('Use a VCF normalized with this app’s reference-checked, unsplit GRCh38 workflow. No indel citation is inferred from an unverified representation.');
    if(call.status==='Not observed')call.notes.push('No exact biallelic REF/ALT record for this representation. Absence, reference-only SNP calls and gVCF blocks do not exclude this indel.');
    if(required==='Unsupported input'||required==='Unsupported build')call.notes.push('Short-indel citations currently require normalized GRCh38 sequencing VCF.');
    const copies=call.status==='Called'?call.alleles.filter(a=>a===r.effectAllele).length:null;
    return {...r,...call,recordObserved:required?null:Boolean(s?.exact.length),copies,rarity:'Unknown',priorityLabel:'Context-dependent',referenceRetrievedAt:library.retrievedAt,interpretation:copies===null?'Interpretation withheld: '+call.status+'.':'The VCF contains this exact normalized allele representation. This is a research citation, not confirmation of a biological or clinical finding.'};
   });
   return {results,blockedSNVIds:required?new Set():blockedSNVIds,normalizationAccepted:!required,libraryVersion:library.version};
  }
 };
}
