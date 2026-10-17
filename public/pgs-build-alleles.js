const complements={A:'T',C:'G',G:'C',T:'A'};
export const complementAllele=a=>complements[a];
export const reverseComplement=s=>[...s].reverse().map(a=>complements[a]||'?').join('');
export function termForBuild(term,build){
 if(!term.buildAlleles)return term;
 if(!['GRCh37','GRCh38'].includes(build)||!term.buildAlleles[build])throw Error('Missing build-specific score alleles');
 const a=term.buildAlleles[build];
 if(Object.keys(a).sort().join(',')!=='effectAllele,otherAllele,reverseComplemented'||typeof a.reverseComplemented!=='boolean')throw Error('Invalid build-specific allele fields');
 return {...term,effectAllele:a.effectAllele,otherAllele:a.otherAllele,reverseComplemented:a.reverseComplemented};
}
// These are evidence-bound reference transformations, not inference of an
// input genotype's strand. Every published source allele and weight is retained.
export function validateAssemblyReversal(e,mappings){
 if(e?.version!==1||e.method!=='reciprocal-unique-chain-and-exact-flanks'||e.flankSize!==100)throw Error('Unreviewed assembly reversal');
 for(const [build,other] of [['GRCh37','GRCh38'],['GRCh38','GRCh37']]){
  const m=mappings[build],n=mappings[other],r=e[build],h=r?.chainHits?.[0];
  if(!m||!n||r?.chainHits?.length!==1||!h||h.strand!==-1||h.sourceChrom!=='chr'+m.chrom||h.sourceStart!==m.position-101||h.sourceEnd!==m.position+100||h.targetChrom!=='chr'+n.chrom||h.targetStart!==n.position-101||h.targetEnd!==n.position+100)throw Error('Assembly reversal is not unique and reciprocal');
  const s=r.sequence;
  if(s?.id!==`chromosome:${build}:${m.chrom}:${m.position-100}:${m.position+100}:1`||typeof s.seq!=='string'||!/^[ACGT]{201}$/.test(s.seq)||s.seq[100]!==m.ref)throw Error('Assembly reversal sequence mismatch');
  if(!/^[a-f0-9]{64}$/.test(r.chainSource?.sha256||'')||!/^[a-f0-9]{64}$/.test(r.sequenceSource?.sha256||''))throw Error('Assembly reversal provenance missing');
  const hg=build==='GRCh37'?'hg19':'hg38',to=build==='GRCh37'?'hg38':'hg19';
  if(r.chainSource.url!==`https://hgdownload.soe.ucsc.edu/goldenPath/${hg}/liftOver/${hg}To${to[0].toUpperCase()+to.slice(1)}.over.chain.gz`)throw Error('Unexpected assembly chain source');
  const host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
  if(r.sequenceSource.url!==`https://${host}/sequence/region/human/${m.chrom}:${m.position-100}..${m.position+100}:1?content-type=application/json`)throw Error('Unexpected sequence source');
 }
 if(reverseComplement(e.GRCh37.sequence.seq)!==e.GRCh38.sequence.seq)throw Error('Assembly flanks are not exact reverse complements');
 return e;
}
