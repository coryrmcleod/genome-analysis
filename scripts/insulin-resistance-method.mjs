// This review binds only the complete published 53-locus unweighted model.
export const INSULIN_RESISTANCE_METHOD=Object.freeze({
 id:'PGS000877',publicationPMID:'27841877',
 originalSha256:'b233d2a505526c2641e38986d8d4586fff366db1d681283e9e1dcab4ef44c65f',
 sourceURL:'https://ora.ox.ac.uk/objects/uuid%3Aff69ecd0-0cad-4898-841b-95fa5722dc04/files/m4cd1544fa21686fbdfb74b8b7f1f3f31',
 sourceSha256:'a170137e54bb6553744e8c556b4c37a8ad833f17391718cdc9e652cce16e9b81',
 sourceFile:'PGS000877-methods.pdf',
 method:'Lotta 2017 author manuscript page 32 defines the score as a sum of effect alleles and assigns unit weights for summary-data analysis. Page 27 Table 1 reports associations per study standard deviation (4.5 alleles). GA retains all 53 deposited unit coefficients and the Unweighted label; it does not divide the raw allele sum by 4.5, reproduce covariate adjustment, or turn disease associations into personal probabilities. The methods and Table 1 were visually reviewed; this approval is specific to the frozen 53-term deposit.'
});
export function verifyInsulinResistanceMethod(meta,originalSha256,documentSha256){
 const e=INSULIN_RESISTANCE_METHOD;
 if(meta.id!==e.id||meta.name!=='uwGRS53_IR'||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='Unweighted'||meta.method_name!=='Clumping and Thresholding (C+T)'||meta.variants_number!==53||meta.variants_interactions!==0||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed insulin-resistance method');
 return {...e};
}
export function verifyInsulinResistanceRows(metadata,rows){
 if(metadata.pgs_id!=='PGS000877'||metadata.pgs_name!=='uwGRS53_IR'||metadata.weight_type!=='Unweighted'||rows.length!==53||new Set(rows.map(r=>r.rsID)).size!==53||rows.some(r=>r.effect_weight!=='1'))throw Error('Insulin-resistance unit-weight definition changed');
 return true;
}
