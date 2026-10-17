import {parseGenomicIndel} from './hgvs-indels.js';
export const EXPERT_ASSERTION_SCOPE='These are dated, disease-specific ClinGen expert-panel assertions for this exact allele. They may precede the ClinVar snapshot. Different source classifications remain visible for review; the app does not overwrite either source or infer a diagnosis from an allele match.';
const classes=['Pathogenic','Likely Pathogenic','Uncertain Significance','Likely Benign','Benign'];
export function validateExpertAssertions(library){
 if(library?.schemaVersion!==1||!Array.isArray(library.records)||!/^[a-f0-9]{64}$/.test(library.sourceSha256)||!Number.isFinite(Date.parse(library.retrievedAt)))throw Error('Invalid expert-assertion library');
 if(Object.keys(library.assemblyReport?.accessions||{}).length!==22||!/^[a-f0-9]{64}$/.test(library.assemblyReport?.sha256))throw Error('Missing chromosome accession provenance');
 const seen=new Set();for(const r of library.records){
  if(!/^[a-f0-9-]{36}$/.test(r.uuid)||seen.has(r.uuid)||!/^\d+$/.test(r.variationId)||!classes.includes(r.classification)||!r.gene||!r.disease||!/^MONDO:\d+$/.test(r.mondo)||!/^\d{4}-\d{2}-\d{2}$/.test(r.publishedDate)||!/^\d{4}-\d{2}-\d{2}$/.test(r.approvalDate)||!r.panel||r.retracted!==false||r.url!==`https://erepo.genome.network/evrepo/ui/classification/${r.uuid}`||!/^https:\/\/cspec\.clinicalgenome\.org\/cspec\/ui\/svi\/affiliation\/\d+$/.test(r.guidelineURL)||!Array.isArray(r.pmids)||r.pmids.some(id=>!/^\d+$/.test(id)))throw Error('Invalid disease-specific expert assertion');
  if(!Number.isSafeInteger(r.position)||r.position<1||r.ref===r.alt)throw Error('Invalid expert allele coordinates');
  if(r.variantKind==='short-indel'){
   const h=parseGenomicIndel(r.genomicHGVS);if(h.accession!==library.assemblyReport.accessions[r.chrom]||!/^[ACGT]{1,51}$/.test(r.ref)||!/^[ACGT]{1,51}$/.test(r.alt)||Math.min(r.ref.length,r.alt.length)!==1||r.ref[0]!==r.alt[0]||!/^[a-f0-9]{64}$/.test(library.indelNormalization?.referenceSha256)||!/^[a-f0-9]{64}$/.test(library.indelNormalization?.normalizedVCFSha256))throw Error('Missing exact normalized indel evidence');
  }else if(r.variantKind&&r.variantKind!=='snv'||!/^[ACGT]$/.test(r.ref)||!/^[ACGT]$/.test(r.alt)||r.genomicHGVS!==`${library.assemblyReport.accessions[r.chrom]}:g.${r.position}${r.ref}>${r.alt}`)throw Error('Unverified genomic HGVS identity');
  if(!['evidenceMet','evidenceNotMet'].every(k=>Array.isArray(r[k])&&r[k].every(c=>/^[A-Za-z0-9_ -]{1,60}$/.test(c))))throw Error('Invalid source evidence codes');seen.add(r.uuid);
 }
 return library;
}
export function attachExpertAssertions(clinical,evidence){
 if(!evidence)return clinical;validateExpertAssertions(evidence);const byID=new Map();for(const a of evidence.records){if(!byID.has(a.variationId))byID.set(a.variationId,[]);byID.get(a.variationId).push(a);}
 const records=clinical.records.map(r=>({...r,clinvar:r.clinvar.map(a=>{const matches=byID.get(a.variationId)||[],m=r.mappings.GRCh38;
  for(const e of matches)if(e.chrom!==m.chrom||e.position!==m.position||e.ref!==m.ref||e.alt!==a.allele||!r.gene.split(/\s*\/\s*/).includes(e.gene)||(e.variantKind==='short-indel')!==(r.variantKind==='short-indel')||e.variantKind==='short-indel'&&evidence.indelNormalization.referenceSha256!==clinical.referenceSha256)throw Error('Expert assertion does not match the installed allele: '+a.variationId);
  return {...a,expertAssertions:matches};})}));
 return {...clinical,records,expertAssertionProvenance:{version:evidence.version,retrievedAt:evidence.retrievedAt,sourceURL:evidence.sourceURL,sourceSha256:evidence.sourceSha256,assemblyReport:evidence.assemblyReport,indelNormalization:evidence.indelNormalization||null}};
}
export function expertClassificationDifference(clinvar,expert){
 const allowed=String(clinvar).replaceAll('_',' ').split('/');return !allowed.includes(expert);
}
