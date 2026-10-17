import {PGS_EVALUATION_SCOPE_REVIEWS} from './pgs-evaluation-scope-reviews.js';
export function evaluationScopeReview(model,evidence,record){
 const review=PGS_EVALUATION_SCOPE_REVIEWS.find(r=>r.id===model.id&&r.evaluation===record.id);
 if(!review)return null;
 const confirmed=model.sourceFiles?.original?.sha256===review.originalSha256&&evidence.originalSha256===review.originalSha256&&model.variantCount===review.fullTerms&&evidence.sources.some(s=>s.sha256===review.evaluationSourceSha256)&&JSON.stringify(record)===JSON.stringify(review.record);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function evaluationScopeHtml(model,evidence,record){
 const review=evaluationScopeReview(model,evidence,record);
 if(!review)return '';
 const link='<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12232356/" target="_blank" rel="noreferrer">Primary study</a>';
 if(review.status==='changed')return '<p><strong>Evaluation scope needs re-review: source evidence changed after a verified partial-definition review.</strong> '+link+'</p>';
 return '<p><strong>Partial scoring definition: this study used '+review.evaluatedTerms+' of '+review.fullTerms+' deposited variants.</strong> These results do not validate the complete genetic sum. Primary Supplementary Table 1, row '+review.primaryCountRow+'. Reported AUC and variance include age, sex, BMI and ancestry covariates.'+(record.sampleSet==='PSS012081'?' The deposited endpoint says “in prediabetics”; the primary follow-up cohort included both baseline prediabetes and normoglycaemia.':' The evaluation uses an age-matched prediabetes case-control subset.')+' Deposited wording and values are retained below for traceability. '+link+'</p>';
}
