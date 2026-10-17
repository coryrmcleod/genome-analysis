import {PGS_ADJUSTED_AUC_REVIEWS} from './pgs-adjusted-auc-reviews.js';
export function adjustedAUCReview(model,evidence,record){
 const review=PGS_ADJUSTED_AUC_REVIEWS.find(row=>row.id===model.id&&row.record.id===record.id);
 if(!review)return null;
 const confirmed=model.variantCount===review.terms&&model.publication?.PMID===36152628&&model.sourceFiles?.original?.sha256===review.originalSha256&&evidence.originalSha256===review.originalSha256&&evidence.sources.some(source=>source.sha256===review.evaluationSourceSha256)&&JSON.stringify(record)===JSON.stringify(review.record);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function adjustedAUCHtml(model,evidence,record){
 const review=adjustedAUCReview(model,evidence,record);if(!review)return '';
 const link='<a href="https://csg.sph.umich.edu/larsf/exprsweb/manuscripts/Ma-et-al-2022-AJHG-ExPRSweb.pdf" target="_blank" rel="noreferrer">Primary study, pages 5–6</a>';
 if(review.status!=='confirmed')return '<p><strong>Study metric needs re-review: the evidence changed after its adjusted AUC definition was verified.</strong> '+link+'</p>';
 return '<p><strong>Metric definition: the study reports covariate-adjusted AUC (AAUC); the deposited record labels it AUROC.</strong> Its calculation accounts for age, sex, genotyping array and ancestry principal components, and depends on their distribution in the study cohort. Interpret the value as this adjusted study result. It does not establish an unadjusted score accuracy or your disease probability. The deposited value and wording are retained below. '+link+'</p>';
}
