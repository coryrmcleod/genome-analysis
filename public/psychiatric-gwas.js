// Provenance-only index for the OpenMed mirror of public PGC summary statistics.
// These aggregate GWAS results are not personal-genome annotations or PGS weights.
export function validatePsychiatricGWASLibrary(library){
 if(library?.version!=='1.0.0'||library?.source!=='OpenMed mirror of Psychiatric Genomics Consortium GWAS summary statistics'||!Array.isArray(library.datasets)||library.datasets.length!==12)throw Error('Invalid psychiatric GWAS source index');
 const ids=new Set();for(const d of library.datasets){
  if(!/^OpenMed\/pgc-[a-z-]+$/.test(d.id)||ids.has(d.id)||typeof d.condition!=='string'||!d.condition||!/^https:\/\/huggingface\.co\/datasets\/OpenMed\/pgc-[a-z-]+$/.test(d.url)||!Array.isArray(d.configs)||!d.configs.every(c=>typeof c==='string'&&c))throw Error('Invalid psychiatric GWAS dataset entry');
  for(const s of d.installedScores||[])if(!/^PGS\d{6}$/.test(s.id)||!d.configs.includes(s.config)||!/^\d+$/.test(s.sourcePMID))throw Error('Invalid psychiatric GWAS score lineage');
  ids.add(d.id);
 }
 return library;
}
