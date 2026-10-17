import {PGS_DEVELOPMENT_REVIEWS} from './pgs-development-reviews.js';
import {htmlEscape as escape} from './workspace-view.js';
export function developmentPrimaryReview(model,evidence){
 const review=PGS_DEVELOPMENT_REVIEWS.find(r=>r.id===model.id);
 if(!review)return null;
 const confirmed=model.sourceFiles?.original?.sha256===review.originalSha256&&model.sourceFiles?.metadata?.sha256===review.metadataSha256&&model.variantCount===review.fullTerms&&evidence.originalSha256===review.originalSha256&&JSON.stringify(evidence.development)===JSON.stringify(review.development);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function developmentReviewHtml(model,evidence){
 const review=developmentPrimaryReview(model,evidence);
 if(!review)return '';
 const link='<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12675292/" target="_blank" rel="noreferrer">Primary study</a>';
 if(review.status==='changed')return '<p><strong>Development counts need re-review: source evidence changed after the primary-table comparison.</strong> '+link+'</p>';
 const counts=c=>c.cases+' cases and '+c.controls+' controls';
 const matches=review.matchingOtherPrimaryRows.map(r=>escape(r.code+' (“'+r.endpoint+'”), row '+r.row)).join('; ');
 return '<p><strong>Primary and deposited development counts differ.</strong> Supplementary Table S1, row '+review.primaryRow+': discovery '+counts(review.primaryDiscovery)+'; training '+counts(review.primaryTraining)+'. Deposited metadata: discovery '+counts(review.depositedDiscovery)+'; training '+counts(review.depositedTraining)+'.'+(matches?' Both deposited count pairs match a different primary phenotype row: '+matches+'. Count agreement does not prove that this score used that phenotype.':'')+' Case definitions and phenotype codes require reconciliation before treating these descriptions as the same cohort. Deposited counts are retained for traceability. This discrepancy alone does not establish an error in the scoring weights. '+link+'</p>';
}
