import {validateAssemblyReversal,complementAllele} from './pgs-build-alleles.js';
import {validateReviewedPGSDeletionTarget} from './reviewed-pgs-deletion.js';
export function validateCatalog(c){
  if(!c||typeof c.version!=='string'||typeof c.retrievedAt!=='string'||!Number.isFinite(Date.parse(c.retrievedAt))||!Array.isArray(c.records)||!c.records.length||c.records.length>100000)throw Error('Catalog needs a version, reference date, and 1–100,000 records.');
  const ids=new Set();
  for(const r of c.records){
    const reviewedDeletion=r.variantKind==='reviewed-pgs-deletion';if(reviewedDeletion)validateReviewedPGSDeletionTarget(r);
    if(!/^rs\d+$/.test(r.id)||ids.has(r.id))throw Error('Catalog rsIDs must be unique and valid.');ids.add(r.id);
    for(const field of ['gene','label','category','trait','evidence','summary','caution'])if(typeof r[field]!=='string'||!r[field].trim()||r[field].length>10000)throw Error(`Invalid ${field} for ${r.id}.`);
    if(![1,2,3].includes(r.priority)||!/^[ACGT]$/.test(r.effectAllele))throw Error(`Invalid priority or tracked allele for ${r.id}.`);
    if(!r.mappings||!Object.keys(r.mappings).length)throw Error(`Missing coordinates for ${r.id}.`);
    if(r.buildEffectAlleles){validateAssemblyReversal(r.assemblyReversalEvidence,r.mappings);if(r.frequency!==null||r.association||r.buildEffectAlleles.GRCh37!==r.effectAllele||r.buildEffectAlleles.GRCh38!==complementAllele(r.effectAllele))throw Error('Invalid build-specific tracked allele');}
    for(const [b,m] of Object.entries(r.mappings)){
      if(reviewedDeletion)continue; // Exact certificate above checks both complete mappings.
      if(!['GRCh37','GRCh38'].includes(b)||!/^(?:[1-9]|1\d|2[0-2]|X|Y|MT)$/.test(m.chrom)||!Number.isSafeInteger(m.position)||m.position<1||!Array.isArray(m.alleles)||!m.alleles.every(a=>/^[ACGT]$/.test(a))||!m.alleles.includes(m.ref)||!m.alleles.includes(r.buildEffectAlleles?.[b]||r.effectAllele))throw Error(`Invalid mapping for ${r.id}.`);
    }
    if(r.frequency!==null){const f=r.frequency;if(!f||!Number.isFinite(f.value)||f.value<0||f.value>1||f.allele!==r.effectAllele||typeof f.population!=='string'||!f.population.trim())throw Error(`Invalid allele frequency for ${r.id}.`);}
    if(!Array.isArray(r.sources)||!r.sources.length||r.sources.some(s=>typeof s.label!=='string'||!/^https:\/\//.test(s.url)))throw Error(`Missing HTTPS evidence sources for ${r.id}.`);
    if(r.literature!==undefined&&(!Array.isArray(r.literature)||r.literature.some(p=>!/^\d+$/.test(p.pmid)||typeof p.title!=='string'||!p.title.trim()||p.url!==`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`)))throw Error(`Invalid PubMed record for ${r.id}.`);
    if(r.association){const a=r.association;if(a.reportedAllele!==r.effectAllele||!r.literature?.some(p=>p.pmid===a.pmid)||!(Number(a.pvalue)>0&&Number(a.pvalue)<=5e-8)||a.trait!==r.trait)throw Error(`Invalid association linkage for ${r.id}.`);}
  }
  return c;
}
