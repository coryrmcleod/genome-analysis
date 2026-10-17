import {PGS_OSA_DISCOVERY_REVIEWS} from './pgs-osa-discovery-reviews.js';
export function osaDiscoveryReview(model,evidence){
 const review=PGS_OSA_DISCOVERY_REVIEWS.find(r=>r.id===model.id);if(!review)return null;
 const expected=review.completeModel,terms=model.variants??model.terms;
 const definition=Object.fromEntries(Object.keys(expected).filter(k=>k!=='variants').map(k=>[k,model[k]]));
 definition.variants=Array.isArray(terms)&&terms.length===expected.variants.length?terms.map((term,i)=>Object.fromEntries(Object.keys(expected.variants[i]).map(k=>[k,term[k]]))):null;
 const expectedDefinition={...Object.fromEntries(Object.keys(expected).filter(k=>k!=='variants').map(k=>[k,expected[k]])),variants:expected.variants};
 const confirmed=JSON.stringify(definition)===JSON.stringify(expectedDefinition)&&evidence?.originalSha256===review.originalSha256&&JSON.stringify(evidence.development)===JSON.stringify(review.development);
 return {...review,status:confirmed?'confirmed':'changed'};
}
export function osaDiscoveryHtml(model,evidence){
 const review=osaDiscoveryReview(model,evidence);if(!review)return '';
 const link='<a href="https://doi.org/10.1016/j.ebiom.2023.104536" target="_blank" rel="noreferrer">Discovery study</a> · <a href="https://ars.els-cdn.com/content/image/1-s2.0-S2352396423001019-mmc2.xlsx" target="_blank" rel="noreferrer">Primary supplementary tables</a>';
 if(review.status==='changed')return '<p><strong>Sleep-apnea discovery context needs re-review: the definition or source evidence changed after its primary-table comparison.</strong> '+link+'</p>';
 return '<p><strong>Keep the discovery samples distinct.</strong> The deposited metadata describes the combined MVP, FinnGen and MGB study of 916,696 participants. The primary study separately reports 568,576 MVP participants, and its MVP-only association tables are distinct from the combined-study results.'+(review.allTermsCompatibleAtPublishedORPrecision?' All 17 weights in this score agree with the MVP-only table’s odds ratios at the table’s six-decimal reporting precision. This does not verify the exact unrounded coefficients.':' Coefficient verification for this six-term score remains unresolved: its weights do not reproduce Supplementary Table 11’s odds ratios at their reported precision, and two directions differ under that table’s allele labels. The study’s main table reports directions consistent with the deposited weights; these source descriptions require reconciliation. This discrepancy does not establish which description is wrong or justify reversing weights.')+' The original metadata and weights are preserved. Do not treat the two study samples as interchangeable or add their participants together. These source checks do not establish personal sleep-apnea risk. '+link+'</p>';
}
