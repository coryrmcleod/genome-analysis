import {PGS_METRIC_REVIEWS} from './pgs-metric-reviews.js';
export function metricPrimaryReview(model,evidence,record,metric){
 const review=PGS_METRIC_REVIEWS[model.id];
 if(!review||record.id!==review.evaluation||metric.name!=='AUPRC')return null;
 const confirmed=model.name===review.name&&model.publication?.PMID===review.publicationPMID&&model.variantCount===review.terms&&model.sourceFiles?.original?.sha256===review.originalSha256&&evidence.originalSha256===review.originalSha256&&evidence.sources.some(s=>s.sha256===review.evaluationSourceSha256)&&JSON.stringify(record)===JSON.stringify(review.record)&&JSON.stringify(metric)===JSON.stringify(review.record.metrics.find(m=>m.name==='AUPRC'));
 return {...review,status:confirmed?'confirmed':'changed'};
}
