// Exact deposits with independently reviewed linear methods; never a general NR exemption.
export const REVIEWED_LINEAR_METHODS=Object.freeze({
 PGS000043:Object.freeze({id:'PGS000043',publicationPMID:'31676865',name:'PRS_VTE',methodName:'Pruning + Clumping',count:297,
  originalSha256:'9b751066341a231ee0a375a3547a3033830f4996bc69d4d4269aad2aca775bee',
  sourceURL:'https://research.fredhutch.org/content/dam/research/kooperberg/publications/2019klarin.pdf',sourceFile:'PGS000043-methods.pdf',sourceSha256:'20a57fa5c82869ac5560fcece07cd895aaa2bb23e7f6711945321d7c23ef5ce3',
  method:'Klarin 2019, VTE PRS generation, explicitly defines additive allele counts weighted by disease-association beta coefficients. The final 297-term definition intentionally excludes two clumps from the 299-term precursor. Catalog weight type remains NR; coefficients are unchanged. This is primary-method evidence, not independent coefficient-by-coefficient OR verification. Study covariates, strata and personal probability calibration are not reproduced.'}),
 PGS000137:Object.freeze({id:'PGS000137',publicationPMID:'31959993',name:'MTAG_glaucoma',methodName:'Clumping and Thresholding (C+T)',count:2673,
  originalSha256:'dcb8102d458d739a10c456c0dc35ccc45fc4bac8a2a6569239ba3eee3d7e663f',
  sourceURL:'https://genepi.qimr.edu.au/contents/p/staff/Craig%20et%20al.%2C%20Multitrait%20analysis%20of%20glaucoma.pdf',sourceFile:'PGS000137-methods.pdf',sourceSha256:'3a7bcafb706346ef30fa5215a7d7907ca2a72d5bc770def8968be8176f9fcc7d',
  method:'Craig 2020, Polygenic risk score calculation, defines the additive PLINK score using MTAG effect sizes. The 2673-term threshold was selected in ANZRAG. All deposited alleles and coefficients also match the author-linked BETA archive within nine-decimal rounding. Catalog weight type remains NR; deposited precision is unchanged. Study normalization, covariate adjustment and rederived cohort-specific scores are not reproduced.'}),
 PGS000040:Object.freeze({id:'PGS000040',publicationPMID:'24550740',name:'GRS_CeD',methodName:'SparSNP',count:228,
  originalSha256:'a7f81c4e9a1623e90fc78214771a1e934f0a57ad611692c1ce3ae10cdd0dc412',
  sourceURL:'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3923679/fullTextXML',sourceFile:'PGS000040-methods.xml',sourceSha256:'8790b359c196600458a3f3a9fde27ba448f77b51febb5b13bbb99c32306c9737',
  method:'Abraham 2014 describes a lasso-penalized linear support vector machine fitted with SparSNP. All 228 deposited alleles and coefficients match supplemental Table S1. Catalog weight type remains NR; these are linear predictor coefficients, not log odds. The raw sum omits the published intercept -0.757226 and does not apply thresholds, prevalence calibration or study-specific performance to an individual.'})
});
export function verifyReviewedLinearMethod(meta,originalSha256,documentSha256){
 const e=REVIEWED_LINEAR_METHODS[meta?.id];
 if(!e||String(meta.publication?.PMID)!==e.publicationPMID||meta.name!==e.name||meta.method_name!==e.methodName||meta.variants_number!==e.count||meta.variants_interactions!==0||meta.weight_type!=='NR'||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed linear-method evidence');
 return {...e};
}
