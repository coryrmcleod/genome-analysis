// Candidate discovery only: these IDs never replace independent both-build
// Ensembl verification. Coordinates are taken from frozen Catalog harmonization.
export function coordinateReferenceCandidates(original,harmonized,pvar){
 const bySource=new Map(harmonized.rows.map(r=>[r.rsID,r])),byPosition=new Map();
 for(const line of pvar.split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;const [chrom,pos,id,ref,alt]=line.split('\t');
  const key=chrom+':'+pos;if(!byPosition.has(key))byPosition.set(key,[]);
  byPosition.get(key).push({id,chrom,position:Number(pos),ref,alleles:[ref,...(alt||'').split(',')]});
 }
 const candidates={};let unresolved=0;
 for(const r of original.rows.filter(r=>r.coordinateSource)){
  const h=bySource.get(r.rsID);
  if(!h||h.effect_allele!==r.effect_allele||h.other_allele!==r.other_allele||h.effect_weight!==r.effect_weight)throw Error('Coordinate candidate source/harmonized term changed');
  if(!/^(?:[1-9]|1\d|2[0-2])$/.test(h.hm_chr)||! /^[1-9]\d*$/.test(h.hm_pos))throw Error('Invalid harmonized coordinate');
  const rows=byPosition.get(h.hm_chr+':'+h.hm_pos)||[];
  if(rows.length!==1||!/^rs\d+$/.test(rows[0].id)||rows[0].alleles.some(a=>!/^[ACGT]$/.test(a))||new Set(rows[0].alleles).size!==rows[0].alleles.length){unresolved++;continue;}
  candidates[r.rsID]={candidateID:rows[0].id,reference:rows[0],sourceCoordinate:{build:original.metadata.genome_build,chrom:r.chr_name,position:Number(r.chr_position)}};
 }
 return {candidates,unresolved};
}
export function validateCoordinateCandidate(row,candidate,sourceBuild){
 if(!candidate||!/^rs\d+$/.test(candidate.candidateID)||candidate.reference?.id!==candidate.candidateID||candidate.sourceCoordinate?.build!==sourceBuild||candidate.sourceCoordinate.chrom!==row.chr_name||candidate.sourceCoordinate.position!==Number(row.chr_position))throw Error('Coordinate reference candidate does not match original source');
 return candidate.candidateID;
}
