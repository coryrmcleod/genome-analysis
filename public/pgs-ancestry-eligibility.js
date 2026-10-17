// This compares the reported evaluation population with a reference panel.
// It never infers a person's ancestry or establishes clinical applicability.
export function referenceAncestryEligibility(model,population='EUR'){
 const entries=Object.entries(model.ancestry?.eval?.dist||{});
 const unknown='Reported evaluation ancestry is incomplete or unspecified; applicability of this reference comparison is unknown.';
 if(!entries.length||entries.some(([,v])=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100))return {status:'unknown',reason:unknown};
 const positive=entries.filter(([,v])=>v>0),sum=entries.reduce((n,[,v])=>n+v,0);
 if(sum<99||sum>101)return {status:'unknown',reason:unknown};
 if(positive.some(([k])=>k===population||population==='EUR'&&k==='MAE'))return {status:'represented',reason:'The reference population is represented in reported evaluation ancestry. This does not establish applicability to an individual or clinical risk calibration.'};
 // This publication identifies its Catalog OTH cohorts as Indigenous Southwestern US.
 // Keep the deposited ancestry labels intact; do not generalize OTH to other studies.
 if(population==='EUR'&&String(model.publication?.PMID)==='36862161'&&['PGS003729','PGS003730','PGS003731','PGS003732','PGS003733','PGS003734','PGS003735'].includes(model.id)&&positive.some(([k])=>k==='OTH')&&positive.every(([k])=>['OTH','GME'].includes(k)))return {status:'mismatch',reason:'EUR reference comparison withheld: the primary study identifies the Catalog OTH evaluation cohorts as Indigenous Southwestern US populations; the additional reported GME evaluations also do not represent EUR. GWAS training ancestry does not establish evaluation applicability. The complete raw sum is unchanged. No personal ancestry is inferred.'};
 const known=new Set(['EUR','AFR','EAS','SAS','AMR','GME','OCE']);
 if(positive.some(([k])=>!known.has(k)))return {status:'unknown',reason:unknown};
 return {status:'mismatch',reason:population+' reference comparison withheld: reported evaluation populations ('+positive.map(([k])=>k).join(', ')+') do not include this reference population. The complete raw sum, if available, is unchanged. No personal ancestry is inferred; dosage-sensitivity bounds cannot correct population transferability.'};
}
