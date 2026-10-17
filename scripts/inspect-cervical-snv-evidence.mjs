// Complete-model evidence continuation. Never installs a 14-term truncated score.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {loadCervicalDeletionProof,CERVICAL_DELETION_FILES} from './cervical-deletion-proof.mjs';
import {harmonizeModelAlleles} from '../public/allele-harmonization.js';
const root=new URL('../',import.meta.url),out=new URL('work/cervical-snv-evidence/',root),fixture=new URL('test/fixtures/pgs/cervical-deletion/',root),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const deletion=await loadCervicalDeletionProof();
async function rows(name){const bytes=await readFile(new URL(name,fixture));if(hash(bytes)!==CERVICAL_DELETION_FILES[name])throw Error('Frozen file changed');const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),keys=lines.shift().split('\t');return lines.map(l=>{const f=l.split('\t');if(f.length!==keys.length)throw Error('Malformed row');return Object.fromEntries(keys.map((k,i)=>[k,f[i]]));});}
const original=await rows('original.txt.gz'),snvs=original.filter(r=>r.rsID!==deletion.sourceId),audit={id:'PGS005165',originalSha256:CERVICAL_DELETION_FILES['original.txt.gz'],fullCount:15,snvCount:14,deletionCount:1,scope:'Independent SNV mapping evidence plus separate deletion proof, not a scoring model or admission',sources:[],verified:[]};
try{
 if(original.length!==15||snvs.length!==14||snvs.some(r=>!/^rs\d+$/.test(r.rsID)||!/^[ACGT]$/.test(r.effect_allele)||!/^[ACGT]$/.test(r.other_allele)||!Number.isFinite(Number(r.effect_weight))))throw Error('Unexpected full model inventory');
 const definitions={};
 for(const build of ['GRCh37','GRCh38']){
  const hm=await rows(build+'.txt.gz'),matched=snvs.map(r=>({r,h:hm.find(h=>h.rsID===r.rsID)}));
  for(const {r,h} of matched)if(!h||h.hm_match_pos==='False'||h.hm_match_chr==='False'||!/^rs\d+$/.test(h.hm_rsID)||!/^\d+$/.test(h.hm_pos)||['effect_allele','other_allele','effect_weight'].some(k=>h[k]!==r[k])||build==='GRCh37'&&(h.hm_chr!==r.chr_name||h.hm_pos!==r.chr_position))throw Error('SNV harmonization conflict: '+r.rsID+' '+build);
  const ids=matched.map(({h})=>h.hm_rsID),url=`https://${build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org'}/variation/human`,name=build+'-variation.json',file=new URL(name,out);let bytes;
  try{bytes=await readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({ids}),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(url+': HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>2000000)throw Error('Oversize response');JSON.parse(bytes);await writeFile(file,bytes,{flag:'wx'});}
  const data=JSON.parse(bytes);if(JSON.stringify(Object.keys(data).sort())!==JSON.stringify([...ids].sort()))throw Error('Independent mapping inventory mismatch');
  audit.sources.push({url,name,sha256:hash(bytes),requestSha256:hash(JSON.stringify({ids}))});definitions[build]=[];
  for(const {r,h} of matched){const v=data[h.hm_rsID],hits=v?.mappings?.filter(m=>m.assembly_name===build&&m.seq_region_name===h.hm_chr&&m.start===Number(h.hm_pos)&&m.start===m.end&&m.strand===1);if(v?.name!==h.hm_rsID||hits?.length!==1||h.hm_rsID!==r.rsID&&!v.synonyms?.includes(r.rsID))throw Error('Unverified independent SNV: '+r.rsID+' '+build);const rawAlleles=hits[0].allele_string.split('/');if(!/^[ACGT]$/.test(rawAlleles[0]))throw Error('Invalid reference base');const alleles=rawAlleles.filter(a=>/^[ACGT]$/.test(a)),harmonized=harmonizeModelAlleles(r.effect_allele,r.other_allele,alleles);definitions[build].push({sourceId:r.rsID,id:h.hm_rsID,chrom:h.hm_chr,position:Number(h.hm_pos),ref:rawAlleles[0],alleles,weightText:r.effect_weight,harmonized});}
 }
 for(let i=0;i<14;i++){const a=definitions.GRCh37[i],b=definitions.GRCh38[i];if(a.id!==b.id||JSON.stringify(a.harmonized)!==JSON.stringify(b.harmonized))throw Error('SNV build identity/orientation differs: '+a.sourceId);audit.verified.push({sourceId:a.sourceId,id:a.id,weightText:a.weightText,GRCh37:a,GRCh38:b});}
 audit.status='all14SNVs verified; separate deletion proof complete; scoring remains unsupported';
}catch(e){audit.status='blocked';audit.reason=e.message;}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({...audit,verified:audit.verified.length}));
