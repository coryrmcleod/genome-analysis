import {PGS_TRAINING_SAMPLE_REVIEWS} from './pgs-training-sample-reviews.js';
import {htmlEscape as escape} from './workspace-view.js';
export function trainingSampleReview(model,evidence){
 const review=PGS_TRAINING_SAMPLE_REVIEWS.find(row=>row.id===model.id);
 if(!review)return null;
 const confirmed=model.name===review.name&&model.publication?.PMID===34995502&&model.variantCount===review.fullTerms&&model.sourceFiles?.original?.sha256===review.originalSha256&&model.sourceFiles?.metadata?.sha256===review.metadataSha256&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(evidence.development)===JSON.stringify(review.development);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function trainingSampleReviewHtml(model,evidence){
 const review=trainingSampleReview(model,evidence);if(!review)return '';
 const link='<a href="https://github.com/privefl/UKBB-PGS/blob/main/phenotype-info.csv" target="_blank" rel="noreferrer">Author phenotype table</a>';
 if(review.status==='changed')return '<p><strong>Training sample context needs re-review: the score or source evidence changed after the author-table comparison.</strong> '+link+'</p>';
 const number=value=>escape(value.toLocaleString('en-US'));
 const counts=review.phenotypeTraining;
 const specific=counts.quantitative!==null?number(counts.total)+' participants with this measurement':number(counts.cases)+' cases and '+number(counts.controls)+' controls ('+number(counts.total)+' total)';
 return '<p><strong>Training sample context.</strong> Deposited metadata reports an overall training cohort of '+number(review.depositedTraining.total)+' participants. The author’s phenotype-specific table reports '+specific+'. The phenotype-specific count describes participants with available data for this trait, not an additional cohort. The deposited cohort figure is retained for traceability. Neither count measures predictive accuracy or personal applicability. '+link+'</p>';
}
