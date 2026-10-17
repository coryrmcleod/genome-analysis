import {validateMolecularConsequences} from './molecular-effects.js';
import {validateCatalog} from './catalog.js';
export function validateClinicalLibrary(library){
 validateCatalog(library);
 for(const r of library.records){
  if(!Array.isArray(r.clinvar)||!r.clinvar.length)throw Error('Clinical record lacks allele assertions');
  for(const a of r.clinvar){
   validateMolecularConsequences(a.molecularConsequences);
   if(!/^\d+$/.test(a.variationId)||a.url!==`https://www.ncbi.nlm.nih.gov/clinvar/variation/${a.variationId}/`||!['Pathogenic','Likely_pathogenic','Pathogenic/Likely_pathogenic'].includes(a.classification)||!['reviewed_by_expert_panel','practice_guideline'].includes(a.reviewStatus)||a.stars!==(a.reviewStatus==='practice_guideline'?4:3)||!/^\d{4}-\d{2}-\d{2}$/.test(a.releaseDate))throw Error('Unreviewed or invalid ClinVar assertion');
   for(const m of Object.values(r.mappings))if(!m.alleles.includes(a.allele)||a.allele===m.ref)throw Error('ClinVar classified allele mismatches mapping');
  }
 }
 return library;
}
export function mergeClinicalLibrary(base,clinical){
 if(!clinical)return base;validateClinicalLibrary(clinical);
 const merged=new Map(base.records.map(r=>[r.id,{...r}]));
 for(const source of clinical.records){const r={...source,referenceRetrievedAt:clinical.retrievedAt,reviewStatus:"ClinVar expert-panel / guideline source; allele-specific evidence below"};const old=merged.get(r.id);if(!old){merged.set(r.id,r);continue;}
  const mappings={};for(const build of Object.keys(r.mappings)){const a=old.mappings[build],b=r.mappings[build];if(!a||a.chrom!==b.chrom||a.position!==b.position||a.ref!==b.ref)throw Error('Clinical/base mapping mismatch: '+r.id);mappings[build]={...a,alleles:[...new Set([...a.alleles,...b.alleles])]};}
  merged.set(r.id,{...old,mappings,clinvar:r.clinvar});
 }
 return validateCatalog({...base,clinicalVersion:clinical.version,clinicalReleaseDate:clinical.releaseDate,expertAssertionProvenance:clinical.expertAssertionProvenance||null,records:[...merged.values()]});
}
export function clinicalFindings(record,format){
 const usable=format==='VCF'&&record.status==='Called'&&Array.isArray(record.alleles);
 return (record.clinvar||[]).map(a=>({...a,copies:usable?record.alleles.filter(x=>x===a.allele).length:null,
  interpretation:!usable?'Genotype interpretation withheld: '+(format!=='VCF'?'unconfirmed consumer-array call':record.status):record.alleles.includes(a.allele)?record.variantKind==='short-indel'?'This normalized VCF record contains the classified allele representation. This is not clinical confirmation, a diagnosis or a determination of carrier status.':'The classified allele is present in this call. This is not a diagnosis or a determination of carrier status; inheritance, other variants, and clinical confirmation remain necessary.':'This particular classified allele is not present in this call. This limited panel cannot exclude a condition or other variants in the gene.'}));
}
