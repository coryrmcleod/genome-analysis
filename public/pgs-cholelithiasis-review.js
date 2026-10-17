import {PGS_CHOLELITHIASIS_REVIEWS} from './pgs-cholelithiasis-reviews.js';
export function cholelithiasisReview(model,evidence,record){
 const review=PGS_CHOLELITHIASIS_REVIEWS.find(r=>r.id===model.id&&r.record.id===record.id);
 if(!review)return null;
 const confirmed=model.publication?.PMID===38548025&&model.publication?.doi==='10.1016/j.ypmed.2024.107942'&&model.variantCount===review.terms&&model.sourceFiles?.original?.sha256===review.originalSha256&&model.sourceFiles?.metadata?.sha256===review.metadataSha256&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(evidence.sources)===JSON.stringify(review.sources)&&JSON.stringify(record)===JSON.stringify(review.record);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function cholelithiasisHtml(model,evidence,record){
 const review=cholelithiasisReview(model,evidence,record);if(!review)return '';
 const link='<a href="https://pubmed.ncbi.nlm.nih.gov/38548025/" target="_blank" rel="noreferrer">Primary study abstract</a>';
 if(review.status==='changed')return '<p><strong>Gallstone evaluation needs re-review: source evidence changed after its comparison groups were checked.</strong> '+link+'</p>';
 return '<p><strong>'+(review.comparisonLabelConflicts?'Comparison groups differ between sources.':'Combined genetic and lifestyle comparison.')+'</strong> '+(review.comparisonLabelConflicts?'The deposited metric says high versus low tertile. The primary abstract instead defines genetic risk using the highest and lowest quintiles (fifths) of the study score distribution. Its reported effect and interval agree with the deposited numbers, but the tertile label must not be used as a verified comparison.':'The reported hazard ratio compares high genetic risk with an unfavorable lifestyle against low genetic risk with a favorable lifestyle. It is a combined comparison and cannot be assigned to the genetic score alone.')+' The study defines low genetic risk as quintile 1, intermediate as quintiles 2–4, and high as quintile 5. GA does not apply these study cutpoints to its reference ranks or calculate the lifestyle model or personal gallstone probability. These two records describe overlapping analyses of the same cohort. The original deposited evidence is retained below. This abstract review does not verify every scoring coefficient or the full model covariates. '+link+'</p>';
}
