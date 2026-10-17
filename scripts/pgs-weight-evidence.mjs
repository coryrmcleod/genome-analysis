// Some older PGS metadata says NR although every row supplies both OR and log(OR).
import {parsePGSDecimal} from '../public/pgs-numeric.js';
export function verifyWeightTypeAgreement(catalogType,fileType){
 if(typeof catalogType!=='string'||typeof fileType!=='string'||!catalogType.trim()||catalogType.trim().toLowerCase()!==fileType.trim().toLowerCase())throw Error('Catalog and scoring-file weight-type labels disagree; review required.');
 // Agreement does not establish correctness; independent methods review still applies.
 return true;
}
export function verifyLogOddsWeights(rows){
  if(!Array.isArray(rows)||!rows.length)throw Error('No weights to verify');
 let roundedRows=0;
 for(const row of rows){
  let odds,weight;try{odds=parsePGSDecimal(row.OR);weight=parsePGSDecimal(row.effect_weight);}catch{throw Error('Original effect weight does not match its stated log(OR)');}
  const exact=Math.log(odds),baseTolerance=1e-10*Math.max(1,Math.abs(weight));
  // Accept explicit decimal rounding only at six or more places. Never infer
  // a scale, round a stored coefficient, or infer precision for coarse numbers.
  const decimal=typeof row.effect_weight==='string'&&row.effect_weight.match(/^[+-]?\d+\.(\d{6,15})$/),roundingTolerance=decimal?0.5*10**-decimal[1].length+4*Number.EPSILON*Math.max(1,Math.abs(exact)):0;
  if(typeof row.OR!=='string'||!row.OR.trim()||!Number.isFinite(odds)||odds<=0||!Number.isFinite(weight)||Math.abs(weight-exact)>Math.max(baseTolerance,roundingTolerance))throw Error('Original effect weight does not match its stated log(OR)');
  if(Math.abs(weight-exact)>baseTolerance)roundedRows++;
 }
 return {type:'log(OR)',method:'Every original effect_weight independently agrees with the natural logarithm of its original OR column.'+(roundedRows?' Explicit decimal rounding (at least six decimal places) is checked within half a final printed decimal unit; stored weights remain unchanged.':''),verifiedRows:rows.length,...(roundedRows?{decimalRoundingRows:roundedRows}:{})};
}
// Reviewed methods establish additive use, not an invented Catalog weight unit.
export const ASD_ADDITIVE_METHOD={
 id:'PGS000327',publicationPMID:'30804558',
 originalSha256:'a342369195d6077e107c7d2b0673277489034b1d489250d36c155902dd43e112',
 sourceURL:'https://eprints.gla.ac.uk/227851/1/227851.pdf',
 sourceSha256:'78d9ce976e6a377f60af975fd7745e1cb71e4682388c9f7c707d2faad783435d',
 method:'Grove 2019 methods, manuscript pages 52–53, describe summing allele dosages weighted by additive-scale effects (log odds ratios or regression coefficients). Catalog weight type remains NR. Deposited numbers are used unchanged; no unit-specific risk interpretation, study normalization, or cross-validation performance is transferred to this raw sum.'
};
export function verifyASDAdditiveMethod(meta,originalSha256,documentSha256){
 const e=ASD_ADDITIVE_METHOD;
 if(meta.id!==e.id||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='NR'||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed additive-method evidence');
 return {...e};
}
// Exact reviewed deposit only; this is not a blanket acceptance of NR weights.
export const SICCA_ADDITIVE_METHOD={
 id:'PGS001308',publicationPMID:'35324888',
 originalSha256:'fb205af295f7a2086e8290f50218045b31cfd66946e4c10586888bf69654d802',
 sourceURL:'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8946745/fullTextXML',
 sourceSha256:'4c9e5d3ae5a70653d4fbcdef3807461798d5430bbcc07d36136b3ff526da3141',
 sourceFile:'PGS001308-methods.xml',
 method:'Tanigawa 2022, Construction of sparse PRS models, documents BASIL/snpnet penalized regression coefficients with a binomial family for binary traits. The deposited complete seven-term Sjogren/sicca model contains only additive SNV terms. Catalog weight type remains NR; coefficients are used unchanged as a genetic linear predictor, not converted to odds ratios or probabilities. Covariate/intercept effects, study normalization and full-model performance are not reproduced by GA.'
};
export function verifySiccaAdditiveMethod(meta,originalSha256,documentSha256){
 const e=SICCA_ADDITIVE_METHOD;
 if(meta.id!==e.id||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='NR'||meta.method_name!=='snpnet'||meta.name!=='GBE_HC321'||meta.variants_number!==7||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed sicca additive-method evidence');
 return {...e};
}
export const JIA_ADDITIVE_METHOD={
 id:'PGS000114',publicationPMID:'32887683',
 originalSha256:'67efb29189e59e865b240436365abe20598c481399b497cdf8e0be87cf6a6738',
 sourceURL:'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7677485/fullTextXML',
 sourceSha256:'960051ee8d581b3447bf84fc5baee013ecb47e4b4b66c34b54e5514c156b8722',
 sourceFile:'PGS000114-methods.xml',
 method:'Canovas 2020, Development and validation of the genomic risk score, explicitly defines a sum of genotypes multiplied by fixed SparSNP lasso-linear coefficients. Training used a covariate-residualized phenotype. Catalog weight type remains NR; the complete deposited26coefficients are unchanged and are not treated as log odds or converted to probabilities. GA does not reproduce covariate adjustment or study-specific standardization.'
};
export function verifyJIAAdditiveMethod(meta,originalSha256,documentSha256){
 const e=JIA_ADDITIVE_METHOD;
 if(meta.id!==e.id||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='NR'||meta.method_name!=='SparSNP'||meta.name!=='GRS-JIA-20'||meta.variants_number!==26||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed JIA additive-method evidence');
 return {...e};
}
export const HODGKIN_ADDITIVE_METHOD=Object.freeze({
 id:'PGS000638',publicationPMID:'32991828',
 originalSha256:'4286b062c9d28904dd4c6eb097ab9f7c0709e884429de1c052a4bce82468c5b8',
 sourceURL:'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7675001/fullTextXML',
 sourceSha256:'644a3e4de553b68a95182dbd568ff915659d2556aa0dcc736ab31f8b49a6f9e2',
 sourceFile:'PGS000638-methods.xml',
 method:'Fritsche 2020, PRS Structure and GWAS Catalog sections, define an additive sum of allele dosages weighted by external GWAS log odds ratios. This review binds only the complete16-term GWAS-Catalog Hodgkin deposit. Catalog weight type remains NR; every deposited coefficient is retained without transformation. GA does not reproduce study-specific standardization, covariate adjustment, dosage imputation or a probability model. This is methods evidence, not an independent coefficient-by-coefficient OR verification.'
});
export function verifyHodgkinAdditiveMethod(meta,originalSha256,documentSha256){
 const e=HODGKIN_ADDITIVE_METHOD;
 if(meta.id!==e.id||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='NR'||meta.method_name!=='GWAS Hits'||meta.name!=='PRSWEB_PHECODE201_GWAS-Catalog-r2019-05-03-X201_P_5e-08_MGI_20200608'||meta.variants_number!==16||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed Hodgkin additive-method evidence');
 return {...e};
}
export const MYELOMA_ADDITIVE_METHOD=Object.freeze({
 id:'PGS000653',publicationPMID:'32991828',
 originalSha256:'3ca3d4a0e48dca846f79c20cec8ec899ed8e8f2550f33fe883a6152506c3cd07',
 sourceURL:'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7675001/fullTextXML',
 sourceSha256:'644a3e4de553b68a95182dbd568ff915659d2556aa0dcc736ab31f8b49a6f9e2',
 sourceFile:'PGS000653-methods.xml',
 method:'Fritsche 2020, PRS Structure and GWAS Catalog sections, define an additive sum of allele dosages weighted by external GWAS log odds ratios. This review binds only the complete22-term GWAS-Catalog myeloma deposit. Catalog weight type remains NR; every deposited coefficient is retained without transformation. GA does not reproduce study-specific standardization, covariate adjustment, dosage imputation or a probability model. This is methods evidence, not an independent coefficient-by-coefficient OR verification.'
});
export function verifyMyelomaAdditiveMethod(meta,originalSha256,documentSha256){
 const e=MYELOMA_ADDITIVE_METHOD;
 if(meta.id!==e.id||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='NR'||meta.method_name!=='GWAS Hits'||meta.name!=='PRSWEB_PHECODE204.4_GWAS-Catalog-r2019-05-03-X204.4_P_5e-08_UKB_20200608'||meta.variants_number!==22||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed myeloma additive-method evidence');
 return {...e};
}
