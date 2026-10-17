import {PGS_EPRS_OSA_REVIEWS} from './pgs-eprs-osa-reviews.js';
import {htmlEscape as escape} from './workspace-view.js';
export function eprsOSAReview(model,evidence,record){
 const review=PGS_EPRS_OSA_REVIEWS.find(r=>r.id===model.id&&r.record.id===record.id);
 if(!review)return null;
 const confirmed=model.publication?.PMID===42062286&&model.variantCount===review.terms&&model.sourceFiles?.original?.sha256===review.originalSha256&&model.sourceFiles?.metadata?.sha256===review.metadataSha256&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(evidence.sources)===JSON.stringify(review.sources)&&JSON.stringify(record)===JSON.stringify(review.record);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function eprsOSAHtml(model,evidence,record){
 const review=eprsOSAReview(model,evidence,record);if(!review)return '';
 const link='<a href="https://doi.org/10.1038/s41467-026-72457-x" target="_blank" rel="noreferrer">Primary study, Supplementary Data 1</a>';
 if(review.status==='changed')return '<p><strong>Sleep-apnea evaluation needs re-review: source evidence changed after the primary-table comparison.</strong> '+link+'</p>';
 const residual=review.sheet==='ePRS results';
 return '<p><strong>Published evaluation scope and source discrepancies.</strong> This association describes '+(residual?'a residual score adjusted for an ancestry-based expected score':'a conventional score adjusted for the reported covariates')+'. These are study regression results, not the raw genetic sum or a personal diagnosis. GA does not calculate the study’s expected or residual scores from its ancestry estimates. The supplement reports '+escape(review.primaryCount.toLocaleString('en-US'))+' participants; the four deposited subgroup counts total '+escape(review.depositedCount.toLocaleString('en-US'))+'. Their composition is not reconciled, and these overlapping evaluations must not be added together.'+(review.seMatches?'':' The supplement’s standard error is '+escape(review.primarySE)+'; rounding it to three decimals does not match the deposited standard error. Do not use the deposited standard error as independently verified uncertainty.')+' The deposited records and full-precision primary values are preserved separately. '+link+'</p>';
}
