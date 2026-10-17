import {validateCatalog} from './catalog.js';
export function validatePharmacogeneticLibrary(library){
 validateCatalog(library);
 for(const r of library.records){const p=r.pharmacogenetics,m=r.mappings.GRCh38;
  if(!p||!Number.isSafeInteger(p.locationId)||p.locationId<1||p.source!=='CPIC'||p.chromosomalHGVS!==`g.${m.position}${m.ref}>${r.effectAllele}`||!/^NC_\d+\.\d+$/.test(p.chromosomeSequence)||!p.gene||!/^https:\/\/api\.cpicpgx\.org\/v1\/sequence_location\?id=eq\.\d+$/.test(p.sourceURL))throw Error('Invalid CPIC component provenance');
 }
 return library;
}
export function mergePharmacogeneticLibrary(base,library){
 if(!library)return base;validatePharmacogeneticLibrary(library);const records=new Map(base.records.map(r=>[r.id,{...r}]));
 for(const source of library.records){const r={...source,referenceRetrievedAt:library.retrievedAt,reviewStatus:"CPIC definition component; no functional phenotype assigned"};const old=records.get(r.id);if(!old){records.set(r.id,r);continue;}const mappings={};
  for(const build of ['GRCh37','GRCh38']){const a=old.mappings[build],b=r.mappings[build];if(!a||a.chrom!==b.chrom||a.position!==b.position||a.ref!==b.ref)throw Error('CPIC/base coordinate conflict: '+r.id);mappings[build]={...a,alleles:[...new Set([...a.alleles,...b.alleles])]};}
  records.set(r.id,{...old,mappings,pharmacogenetics:r.pharmacogenetics});
 }
 return validateCatalog({...base,pharmacogeneticVersion:library.version,records:[...records.values()]});
}
