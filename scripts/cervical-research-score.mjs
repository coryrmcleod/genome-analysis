// Frozen complete15-term definition shared with the exact reviewed importer.
// The research scanner below remains synthetic-only; production uses engine.js.
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {loadCervicalDeletionProof,CERVICAL_DELETION_FILES} from './cervical-deletion-proof.mjs';
import {harmonizeModelAlleles} from '../public/allele-harmonization.js';
import {parsePGSDecimal} from '../public/pgs-numeric.js';
import {createScanner} from '../public/engine.js';
import {calculatePGS} from '../public/pgs.js';
import {createCertifiedPGSDeletionScanner} from '../public/certified-pgs-deletion-scanner.js';
import {CERVICAL_PGS_DELETION,reviewedPGSDeletionMappings,validateReviewedPGSDeletionTerm} from '../public/reviewed-pgs-deletion.js';
const fixture=new URL('../test/fixtures/pgs/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const mappingHashes={GRCh37:'275ce394db6c855bcfef877bdff4e867146fc2d5bc8d5bdae3ae9f0994e380a7',GRCh38:'41ca28e6a2c2d143e378c8683dd4728cd9b64e7a67c36b9245f32d10a8912fc2'};
async function sourceRows(name){
 const bytes=await readFile(new URL('cervical-deletion/'+name,fixture));if(hash(bytes)!==CERVICAL_DELETION_FILES[name])throw Error('Cervical source changed');
 const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),header=lines.shift().split('\t');
 return lines.map(l=>{const values=l.split('\t');if(values.length!==header.length)throw Error('Malformed complete source');return Object.fromEntries(header.map((k,i)=>[k,values[i]]));});
}
export async function loadCervicalResearchDefinition(){
 const deletion=await loadCervicalDeletionProof(),original=await sourceRows('original.txt.gz'),raw={},hm={},windows={};
 for(const build of ['GRCh37','GRCh38']){
  const bytes=await readFile(new URL('cervical-snv/'+build+'-variation.json',fixture));if(hash(bytes)!==mappingHashes[build])throw Error('Cervical SNP mappings changed');raw[build]=JSON.parse(bytes);if(Object.keys(raw[build]).length!==14)throw Error('Incomplete SNP evidence');hm[build]=await sourceRows(build+'.txt.gz');
  const sequenceBytes=await readFile(new URL('cervical-deletion/'+build+'-sequence.json',fixture));if(hash(sequenceBytes)!==CERVICAL_DELETION_FILES[build+'-sequence.json'])throw Error('Cervical reference window changed');
  windows[build]={build,chrom:'6',start:deletion.proofs[build].windowStart,sequence:JSON.parse(sequenceBytes).seq};
 }
 const variants=[],targets=[];
 for(const row of original){
  const isDeletion=row.rsID===deletion.sourceId,mappings={},orientations={};let id;
  for(const build of ['GRCh37','GRCh38']){
   const h=hm[build].find(r=>r.rsID===row.rsID);if(!h||['effect_allele','other_allele','effect_weight'].some(k=>h[k]!==row[k]))throw Error('Harmonized term changed');
   if(id&&id!==h.hm_rsID)throw Error('Builds disagree on cervical identity');id=h.hm_rsID;
   if(isDeletion){mappings[build]={chrom:'6',position:windows[build].start+100,ref:'AGA',alleles:['AGA','A']};orientations[build]={effectAllele:'A',otherAllele:'AGA',reverseComplemented:false};continue;}
   if(h.hm_match_pos==='False'||h.hm_match_chr==='False'||build==='GRCh37'&&(h.hm_chr!==row.chr_name||h.hm_pos!==row.chr_position))throw Error('Unreviewed SNP coordinate change');
   const v=raw[build][id],hits=v?.mappings?.filter(m=>m.assembly_name===build&&m.strand===1&&m.seq_region_name===h.hm_chr&&m.start===Number(h.hm_pos)&&m.end===m.start);
   if(v?.name!==id||id!==row.rsID&&!v.synonyms?.includes(row.rsID)||hits?.length!==1)throw Error('Unverified cervical SNP mapping');
   const all=hits[0].allele_string.split('/'),alleles=all.filter(a=>/^[ACGT]$/.test(a));if(!/^[ACGT]$/.test(all[0]))throw Error('Invalid SNP reference');
   mappings[build]={chrom:h.hm_chr,position:Number(h.hm_pos),ref:all[0],alleles,unsupportedReferenceAlleles:all.filter(a=>!/^[ACGT]$/.test(a))};orientations[build]=harmonizeModelAlleles(row.effect_allele,row.other_allele,alleles);
  }
  if(JSON.stringify(orientations.GRCh37)!==JSON.stringify(orientations.GRCh38))throw Error('Cervical orientation differs between builds');
  variants.push({id,sourceId:row.rsID,sourceEffectAllele:row.effect_allele,sourceOtherAllele:row.other_allele,...orientations.GRCh37,weightText:row.effect_weight,weight:parsePGSDecimal(row.effect_weight),kind:isDeletion?'reviewed-deletion':'snv',mappings});
  if(!isDeletion)targets.push({id,gene:'Published component',label:'Synthetic cervical benchmark component',trait:'Cervical cancer',category:'Research only',priority:1,evidence:'Frozen original and independent both-build mappings',effectAllele:orientations.GRCh37.effectAllele,frequency:null,mappings,summary:'Synthetic-only benchmark',caution:'Not an installed model or clinical interpretation',sources:[{label:'PGS Catalog',url:'https://www.pgscatalog.org/score/PGS005165/'}]});
 }
 if(variants.length!==15||targets.length!==14||new Set(variants.map(v=>v.id)).size!==15)throw Error('Incomplete full15-term definition');
 const deletionTarget={id:deletion.canonicalId,variantKind:'reviewed-pgs-deletion',effectAllele:'A',mappings:reviewedPGSDeletionMappings(),reviewedDeletion:structuredClone(CERVICAL_PGS_DELETION)};
 validateReviewedPGSDeletionTerm({modelId:'PGS005165',variantCount:15,originalSha256:CERVICAL_DELETION_FILES['original.txt.gz'],term:variants.find(v=>v.kind==='reviewed-deletion'),target:deletionTarget});
 return {model:{id:'PGS005165',name:'PRS-CC',trait:'Cervical cancer',family:'Synthetic-only cervical benchmark',variantCount:15,weightType:'beta',effectType:'additive',researchOnly:true,variants},targets,deletionTarget,windows,deletion,sourceSha256:CERVICAL_DELETION_FILES['original.txt.gz']};
}
export async function createCervicalResearchScanner({build,sample,syntheticOnly}={}){
 if(syntheticOnly!==true||!['GRCh37','GRCh38'].includes(build)||typeof sample!=='string'||!/^SYNTHETIC[A-Za-z0-9_-]*$/.test(sample))throw Error('Explicit synthetic-only build/sample required');
 const definition=await loadCervicalResearchDefinition(),window=definition.windows[build],snp=createScanner({version:'research-only',retrievedAt:'2026-09-18T00:00:00Z',records:definition.targets},{build,sample});
 let deletionStream=null,headerSeen=false,finished=false,sampleCount=0;
 return {
  consume(line){
   if(finished)throw Error('Research scanner finalized');if(typeof line!=='string')throw Error('Expected synthetic VCF text line');if(!line.trim())return;
   if(line.startsWith('#CHROM')){
    if(headerSeen)throw Error('Duplicate VCF sample header');const fields=line.split('\t');
    if(fields.slice(0,9).join('\t')!=='#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT')throw Error('Malformed VCF column header');
    const samples=fields.slice(9),sampleIndex=samples.indexOf(sample);sampleCount=samples.length;
    if(sampleIndex<0||new Set(samples).size!==samples.length||samples.some(s=>!/^SYNTHETIC[A-Za-z0-9_-]*$/.test(s)))throw Error('Ambiguous or nonsynthetic sample inventory');
    deletionStream=createCertifiedPGSDeletionScanner([definition.deletionTarget],{build,sampleCount,sampleIndex});headerSeen=true;
   }else if(!line.startsWith('#')){
    if(!headerSeen)throw Error('VCF header required');const fields=line.split('\t');if(fields.length!==9+sampleCount)throw Error('Malformed synthetic VCF record');deletionStream.consume(fields);
   }
   snp.consume(line);
  },
  finish(){
   if(finished||!headerSeen)throw Error('Research scanner not ready');finished=true;
   const report=snp.finish();if(report.format!=='VCF'||report.build!==build||report.sample!==sample)throw Error('Wrong synthetic input context');
   const deletionReport=deletionStream.finish(),d=deletionReport.results[0].inputCall;
   report.results.push(...deletionReport.results);
   const result=calculatePGS({version:'research-only',retrievedAt:'2026-09-18T00:00:00Z',models:[definition.model]},report)[0];
   return {...result,researchOnly:true,installed:false,sourceSha256:definition.sourceSha256,deletionCall:d,scope:'Complete15-term synthetic benchmark only. Not admitted to GA; no reference rank, absolute risk or clinical interpretation.'};
  }
 };
}
