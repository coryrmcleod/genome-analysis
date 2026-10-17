export const GENE_DRUG_SCOPE='These are published CPIC gene–drug references, not findings about your medication response. Applying a guideline requires an appropriately interpreted genotype or phenotype and clinical context. This app does not assign star alleles, metabolizer status, drug suitability or a dose.';
export function validateGeneDrugs(library){
 if(library?.schemaVersion!==1||!Array.isArray(library.records)||!Number.isFinite(Date.parse(library.retrievedAt))||!/^[a-f0-9]{64}$/.test(library.sourceSha256))throw Error('Invalid gene–drug library');
 const seen=new Set();for(const r of library.records){if(!Number.isSafeInteger(r.pairId)||r.pairId<1||seen.has(r.pairId)||!/^[A-Za-z0-9-]+$/.test(r.gene)||!r.drug||!r.drugId||!['A','B'].includes(r.level)||r.provisional!==false||!r.guideline||!/^https:\/\/www\.clinpgx\.org\/guideline\/PA\d+$/.test(r.url)||!Array.isArray(r.pmids)||r.pmids.some(p=>!/^\d+$/.test(p))||!['Yes','No'].includes(r.usedForRecommendation))throw Error('Invalid guideline-linked CPIC pair');seen.add(r.pairId);}return library;
}
export function geneDrugsFor(genes,library){return library?.records.filter(r=>genes.includes(r.gene))||[];}
