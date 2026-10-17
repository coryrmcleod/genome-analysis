import {PGS_SAMPLE_COUNT_REVIEWS} from './pgs-sample-count-reviews.js';
import {htmlEscape as escape} from './workspace-view.js';
export function sampleCountReview(model,evidence,record){
 const review=PGS_SAMPLE_COUNT_REVIEWS.find(r=>r.id===model.id&&r.record.id===record.id);
 if(!review)return null;
 const confirmed=model.publication?.PMID===38908374&&model.variantCount===review.fullTerms&&model.sourceFiles?.original?.sha256===review.originalSha256&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(evidence.sources)===JSON.stringify(review.sources)&&JSON.stringify(record)===JSON.stringify(review.record);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function sampleCountHtml(model,evidence,record){
 const review=sampleCountReview(model,evidence,record);if(!review)return '';
 const link='<a href="https://github.com/intervene-EU-H2020/pgsCompaR/blob/'+escape(review.primaryCommit)+'/data/metrics.rda" target="_blank" rel="noreferrer">Author results data</a>';
 if(review.status==='changed')return '<p><strong>Participant counts need re-review: score or evaluation evidence changed after a confirmed primary-data discrepancy.</strong> '+link+'</p>';
 const c=review.primaryCounts,n=value=>escape(value.toLocaleString('en-US'));
 return '<p><strong>Participant counts conflict with the author results data.</strong> The author table reports '+n(c.count)+' participants: '+n(c.cases)+' cases and '+n(c.controls)+' controls. The deposited counts below are retained for traceability and must not be used as verified sample composition. This discrepancy does not change the genetic scoring weights or establish personal risk. '+link+'</p>';
}
