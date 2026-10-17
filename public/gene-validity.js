export const GENE_VALIDITY_SCOPE='ClinGen evaluates the evidence connecting a gene, a disease, and an inheritance pattern. These classifications do not classify your variants, establish a diagnosis, or measure your personal risk. A missing entry means no matching curation is installed.';
export const VALIDITY_CLASSES=['Definitive','Strong','Moderate','Limited','Disputed','Refuted','No Known Disease Relationship'];
export function validateGeneValidity(library){
 if(library?.schemaVersion!==1||!Array.isArray(library.records)||!/^\d{4}-\d{2}-\d{2}$/.test(library.releaseDate)||!/^[a-f0-9]{64}$/.test(library.sourceSha256))throw Error('Invalid ClinGen library metadata');
 const seen=new Set();
 for(const r of library.records){
  if(!/^[A-Za-z0-9-]+$/.test(r.gene)||!/^HGNC:\d+$/.test(r.hgnc)||!/^MONDO:\d+$/.test(r.mondo)||!r.disease||!VALIDITY_CLASSES.includes(r.classification)||!['AD','AR','MT','SD','UD','XL'].includes(r.inheritance)||!/^SOP\d+$/.test(r.sop)||!r.panel||!Number.isFinite(Date.parse(r.classificationDate))||!/^https:\/\/search\.clinicalgenome\.org\/kb\/gene-validity\/(?:CGGV|CGGCIEX):assertion_[A-Za-z0-9_.:-]+$/.test(r.url)||seen.has(r.url))throw Error('Invalid or duplicated ClinGen assertion');
  seen.add(r.url);
 }
 return library;
}
export function geneValidityFor(genes,library){return library?.records.filter(r=>genes.includes(r.gene))||[];}
export function inheritanceLabel(code){return {AD:'Autosomal dominant',AR:'Autosomal recessive',MT:'Mitochondrial',XL:'X-linked'}[code]||'Source inheritance code: '+code;}
