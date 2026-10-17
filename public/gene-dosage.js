export const DOSAGE_SOURCE='https://ftp.clinicalgenome.org/ClinGen_gene_curation_list_GRCh38.tsv';
export const DOSAGE_SCOPE='This is gene-level reference evidence about losing or gaining functional gene copies. It does not classify every small variant in the gene. This app has not measured your gene copy number and does not interpret copy-number variants.';
export const DOSAGE_LABELS={'0':'No evidence available','1':'Little evidence for dosage pathogenicity','2':'Some evidence for dosage pathogenicity','3':'Sufficient evidence for dosage pathogenicity','30':'Gene associated with autosomal recessive phenotype','40':'Dosage sensitivity unlikely','Not yet evaluated':'Not yet evaluated'};
export function validateGeneDosage(library){
 if(!library||library.sourceURL!==DOSAGE_SOURCE||!/^\d{4}-\d{2}-\d{2}$/.test(library.releaseDate)||!Number.isFinite(Date.parse(library.retrievedAt))||!/^[a-f0-9]{64}$/.test(library.sourceSha256)||library.build!=='GRCh38'||!Array.isArray(library.records))throw Error('Invalid dosage reference library');
 const seen=new Set();
 for(const r of library.records){
  if(!/^[A-Z0-9][A-Z0-9-]*$/.test(r.gene)||!/^\d+$/.test(r.ncbiGeneId)||!/^chr(?:[1-9]|1\d|2[0-2]|X|Y):\d+-\d+$/.test(r.location)||!/^\d{4}-\d{2}-\d{2}$/.test(r.evaluatedAt)||!Number.isFinite(Date.parse(r.evaluatedAt))||r.url!==`https://search.clinicalgenome.org/kb/gene-dosage/${r.gene}`)throw Error('Invalid dosage gene identity');
  const bounds=r.location.split(':')[1].split('-').map(Number);if(bounds[0]<1||bounds[1]<bounds[0])throw Error('Invalid dosage gene interval');
  const key=r.gene+'|'+r.location;if(seen.has(key))throw Error('Duplicate dosage gene interval');seen.add(key);
  for(const kind of ['haploinsufficiency','triplosensitivity']){const d=r[kind];if(!d||!Object.hasOwn(DOSAGE_LABELS,d.score)||d.description!==DOSAGE_LABELS[d.score]||!Array.isArray(d.pmids)||d.pmids.some(p=>!/^\d+$/.test(p))||d.diseaseId!==null&&!/^(?:MONDO:\d+|OMIM:\d+|\d+)$/.test(d.diseaseId))throw Error('Invalid dosage evidence category');}
 }
 return library;
}
export function geneDosageFor(genes,library){const set=new Set(genes);return library?.records.filter(r=>set.has(r.gene))||[];}
export function dosageMeaning(score){
 if(score==='0')return 'No evidence in this curation is not evidence that a change is harmless.';
 if(score==='30')return 'This category records an autosomal recessive phenotype; it is not a score of 30 on an increasing risk scale or an inheritance assignment for every variant in this gene.';
 if(score==='40')return 'This concerns a dosage mechanism. It does not establish that every sequence variant in the gene is benign.';
 if(score==='Not yet evaluated')return 'This mechanism has not been evaluated in the source curation.';
 return 'Evidence strength for this dosage mechanism; not a probability or a personal result.';
}
