import {PGS_DISCOVERY_CITATION_REVIEWS} from './pgs-discovery-citation-reviews.js';
export function discoveryCitationReview(model,evidence){
 const review=PGS_DISCOVERY_CITATION_REVIEWS.find(row=>row.id===model.id);if(!review)return null;
 const confirmed=model.name===review.name&&model.variantCount===review.terms&&model.publication?.PMID===review.publicationPMID&&model.sourceFiles?.original?.sha256===review.originalSha256&&model.sourceFiles?.metadata?.sha256===review.metadataSha256&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(model.studySamples)===JSON.stringify(review.studySamples)&&JSON.stringify(evidence.development)===JSON.stringify(review.development);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function discoveryCitationHtml(model,evidence){
 const review=discoveryCitationReview(model,evidence);if(!review)return '';
 const link='<a href="https://ckdgen.imbi.uni-freiburg.de/datasets/li-et-al-2017/" target="_blank" rel="noreferrer">Discovery dataset documentation</a>';
 if(review.status!=='confirmed')return '<p><strong>Discovery citation needs re-review: the score or source evidence changed after verification.</strong> '+link+'</p>';
 return '<p><strong>Discovery citation mismatch.</strong> The deposited discovery PMID 28932557 identifies an unrelated lung-cancer paper. The linked kidney-function dataset cites Li et al., PMID 27920155. The deposited citation is retained for traceability. All six original coefficients match that dataset; this citation error does not establish a coefficient error or personal applicability. '+link+'</p>';
}
