// Three frozen source identities only; no general alias or strand preference.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=new URL('../test/fixtures/pgs/hdl-alias/',import.meta.url);
export const HDL_ALIAS_MANIFEST_SHA='a5423c7053236ca5ae7214c526cd7cbe23a641ce84e1323f9d00ed67353168bf';
export const HDL_ORIGINAL_SHA='2d8d0beea6f30b55ca362471024b09539a5ea8e4260673b9ba20ff91bd3b10a6';
const terms=[
 {sourceId:'rs115151282',canonicalId:'rs9272117',chrom:'6',GRCh37:32600411,GRCh38:32632634,ref:'C',alleles:['A','C','T'],effect:'C',other:'T',weight:'0.02916'},
 {sourceId:'rs114260144',canonicalId:'rs3134994',chrom:'6',GRCh37:32637680,GRCh38:32669903,ref:'T',alleles:['C','G','T'],effect:'C',other:'T',weight:'0.03105'},
 {sourceId:'rs75287427',canonicalId:'rs3888868',chrom:'16',GRCh37:56699927,GRCh38:56666015,ref:'A',alleles:['A','G'],effect:'G',other:'A',weight:'0.02513'}
];
export const isReviewedHDLAlias=id=>terms.some(t=>t.sourceId===id);
function rows(bytes){const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),columns=lines.shift().split('\t');return lines.map(line=>{const values=line.split('\t');if(values.length!==columns.length)throw Error('HDL alias proof: malformed source row');return Object.fromEntries(columns.map((c,i)=>[c,values[i]]));});}
export function verifyHDLAliasData(data){
 const require=(ok,message)=>{if(!ok)throw Error('HDL alias proof: '+message);};
 const original=rows(data['original.txt.gz']);require(original.length===549&&new Set(original.map(r=>r.rsID)).size===549,'complete original definition');
 for(const term of terms){
  const source=original.filter(r=>r.rsID===term.sourceId);require(source.length===1&&source[0].chr_name===term.chrom&&source[0].chr_position===String(term.GRCh37)&&source[0].effect_allele===term.effect&&source[0].other_allele===term.other&&source[0].effect_weight===term.weight,'original term');
  const old=data['refsnp-'+term.sourceId.slice(2)+'.json'],canonical=data['refsnp-'+term.canonicalId.slice(2)+'.json'];
  require(old?.refsnp_id===term.sourceId.slice(2)&&!old.primary_snapshot_data&&!old.withdrawn_snapshot_data&&!old.unsupported_snapshot_data&&JSON.stringify(old.merged_snapshot_data?.merged_into)===JSON.stringify([term.canonicalId.slice(2)]),'single explicit merge');
  require(canonical?.refsnp_id===term.canonicalId.slice(2)&&canonical.primary_snapshot_data&&!canonical.merged_snapshot_data&&!canonical.withdrawn_snapshot_data&&!canonical.unsupported_snapshot_data,'canonical identity');
  for(const build of ['GRCh37','GRCh38']){
   const seq='NC_'+term.chrom.padStart(6,'0')+'.'+(term.chrom==='6'?(build==='GRCh37'?'11':'12'):(build==='GRCh37'?'9':'10'));
   const placements=canonical.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
   require(placements.length===1&&placements[0].seq_id===seq&&placements[0].placement_annot.is_aln_opposite_orientation===false&&placements[0].placement_annot.is_mismatch===false,'primary placement');
   const alleles=placements[0].alleles.map(a=>a.allele.spdi);require(alleles.length===term.alleles.length&&alleles.every(a=>a.seq_id===seq&&a.position===term[build]-1&&a.deleted_sequence===term.ref)&&JSON.stringify(alleles.map(a=>a.inserted_sequence).sort())===JSON.stringify(term.alleles),'complete primary allele inventory');
   const independent=data['canonical-'+build+'.json']?.[term.canonicalId],hits=independent?.mappings?.filter(m=>m.assembly_name===build&&m.strand===1&&m.seq_region_name===term.chrom&&m.start===term[build]&&m.end===m.start);
   require(independent?.name===term.canonicalId&&independent.synonyms?.includes(term.sourceId)&&hits?.length===1&&hits[0].allele_string.split('/')[0]===term.ref&&JSON.stringify(hits[0].allele_string.split('/').sort())===JSON.stringify(term.alleles),'independent canonical mapping');
   const harmonized=rows(data[build+'.txt.gz']);require(harmonized.length===549&&new Set(harmonized.map(r=>r.rsID)).size===549,'complete harmonized definition');
   const h=harmonized.filter(r=>r.rsID===term.sourceId);require(h.length===1&&h[0].hm_chr===term.chrom&&h[0].hm_pos===String(term[build])&&h[0].effect_allele===term.effect&&h[0].other_allele===term.other&&h[0].effect_weight===term.weight&&(!h[0].hm_rsID||[term.sourceId,term.canonicalId].includes(h[0].hm_rsID)),'harmonized source term');
  }
 }
 return true;
}
export async function loadHDLAliasProof(load=name=>readFile(new URL(name,root))){
 const bytes=await load('manifest.json');if(hash(bytes)!==HDL_ALIAS_MANIFEST_SHA)throw Error('HDL alias manifest changed');
 const manifest=JSON.parse(bytes),data={};for(const file of manifest.files){const b=await load(file.name);if(hash(b)!==file.sha256)throw Error('HDL alias source changed: '+file.name);data[file.name]=file.name.endsWith('.gz')?b:JSON.parse(b);}
 if(hash(data['original.txt.gz'])!==HDL_ORIGINAL_SHA)throw Error('HDL original changed');verifyHDLAliasData(data);
 return {modelId:'PGS000660',originalSha256:HDL_ORIGINAL_SHA,manifestSha256:HDL_ALIAS_MANIFEST_SHA,files:manifest.files,scope:manifest.scope};
}
export async function reviewedHDLIdentity({modelId,originalSha256,harmonizedSha256,row,harmonized,build}){
 const t=terms.find(t=>t.sourceId===row?.rsID);
 if(modelId!=='PGS000660'||originalSha256!==HDL_ORIGINAL_SHA||!t||!['GRCh37','GRCh38'].includes(build)||row.coordinateSource===true||row.chr_name!==t.chrom||row.chr_position!==String(t.GRCh37)||row.effect_allele!==t.effect||row.other_allele!==t.other||row.effect_weight!==t.weight||harmonized?.rsID!==t.sourceId||harmonized.hm_chr!==t.chrom||harmonized.hm_pos!==String(t[build])||harmonized.effect_allele!==t.effect||harmonized.other_allele!==t.other||harmonized.effect_weight!==t.weight||(harmonized.hm_rsID&&![t.sourceId,t.canonicalId].includes(harmonized.hm_rsID)))throw Error('Outside exact reviewed HDL alias scope');
 const proof=await loadHDLAliasProof();if(proof.files.find(f=>f.name===build+'.txt.gz').sha256!==harmonizedSha256)throw Error('Outside exact reviewed HDL harmonized source scope');
 return {...proof,sourceId:t.sourceId,canonicalId:t.canonicalId,build};
}
export async function verifyInstalledHDLAliases(model){
 const proof=await loadHDLAliasProof();
 if(model?.id!=='PGS000660'||model.sourceFiles?.original?.sha256!==HDL_ORIGINAL_SHA||model.variantCount!==549||!Array.isArray(model.variants)||model.variants.length!==549)throw Error('Invalid reviewed HDL model definition');
 const original=rows(await readFile(new URL('original.txt.gz',root))),bySource=new Map(model.variants.map(v=>[v.sourceId,v]));
 if(bySource.size!==549||new Set(model.variants.map(v=>v.id)).size!==549)throw Error('Invalid reviewed HDL term inventory');
 for(const r of original){const v=bySource.get(r.rsID);if(!v||v.sourceEffectAllele!==r.effect_allele||v.sourceOtherAllele!==r.other_allele||v.weightText!==r.effect_weight||v.weight!==Number(r.effect_weight)||v.alleleMode!=='explicit-pair')throw Error('HDL original coefficient or allele changed');}
 const expected=[];
 for(const build of ['GRCh37','GRCh38']){
  const sha256=proof.files.find(f=>f.name===build+'.txt.gz').sha256;
  if(model.sourceFiles[build]?.sha256!==sha256)throw Error('HDL harmonized source changed');
  const harmonized=new Map(rows(await readFile(new URL(build+'.txt.gz',root))).map(r=>[r.rsID,r]));
  for(const r of original){
   const h=harmonized.get(r.rsID),v=bySource.get(r.rsID);
   let id=h.hm_rsID||r.rsID;
   if(isReviewedHDLAlias(r.rsID)){const certificate=await reviewedHDLIdentity({modelId:model.id,originalSha256:HDL_ORIGINAL_SHA,harmonizedSha256:sha256,row:r,harmonized:h,build});id=certificate.canonicalId;expected.push(certificate);}
   if(v.id!==id)throw Error('HDL source identity changed');
  }
 }
 if(JSON.stringify(model.sourceFiles.reviewedIdentifierAliases)!==JSON.stringify(expected))throw Error('Invalid reviewed HDL alias certificate inventory');
 return true;
}
