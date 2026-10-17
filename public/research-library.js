import {validateCatalog} from './catalog.js';
export function validateResearchLibrary(library){
 validateCatalog(library);
 for(const r of library.records){const a=r.association;if(r.priority!==1||r.reviewStatus!=='API-linked; scientific review pending'||!a||a.source!=='NHGRI-EBI GWAS catalog'||a.reportedAllele!==r.effectAllele||a.trait!==r.trait||!/^\d+$/.test(a.pmid)||!(Number(a.pvalue)>0&&Number(a.pvalue)<=5e-8)||!r.literature?.some(p=>String(p.pmid)===a.pmid)||!Object.values(r.mappings).every(m=>m.alleles.includes(a.reportedAllele)))throw Error('Research linkage is incomplete or mismatched');}
 return library;
}
export function mergeResearchLibrary(base,library){
 if(!library)return base;validateResearchLibrary(library);const records=new Map(base.records.map(r=>[r.id,r]));
 for(const r of library.records)if(!records.has(r.id))records.set(r.id,r);
 return validateCatalog({...base,researchLibraryVersion:library.version,researchLibraryRetrievedAt:library.retrievedAt,records:[...records.values()]});
}
