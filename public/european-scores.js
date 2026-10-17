import {estimatePGS} from './pgs-estimate.js';
import {referencePercentile} from './pgs-reference.js';
import {percentileSensitivity} from './pgs-sensitivity.js';
import {scoreUncertainty} from './score-insights.js';
import {referenceAncestryEligibility} from './pgs-ancestry-eligibility.js';
import {analysisMethodNotice} from './analysis-method.js';
export function europeanScore(model,populations,reference,sensitivity){
 model.hypotheticalEstimate=estimatePGS(model,populations,'EUR');
 model.referenceComparison=referencePercentile(model,model.hypotheticalEstimate,reference,'EUR');
 model.referenceSensitivity=percentileSensitivity(model,model.hypotheticalEstimate,sensitivity,'EUR');
 model.uncertainty=scoreUncertainty(model);
 model.percentile=model.referenceComparison.measured?model.referenceComparison.point:null;
 model.percentileReason=model.referenceComparison.reason;
 model.hypotheticalEstimate.percentile=model.referenceComparison.measured?null:model.referenceComparison.point;
 model.hypotheticalEstimate.percentileReason=model.referenceComparison.reason;
 return model;
}
export function migrateEuropeanSnapshot(report,populations,reference,sensitivity){
 let changed=0;
 for(const model of report.polygenicScores||[])if(model.hypotheticalEstimate?.population!=='EUR'){
  europeanScore(model,populations,reference,sensitivity);changed++;
 }
 const blocked=[];
 for(const model of report.polygenicScores||[])if(referenceAncestryEligibility(model).status==='mismatch'){
  const hadRank=Number.isFinite(model.referenceComparison?.point)||Number.isFinite(model.referenceSensitivity?.lower);
  model.referenceComparison=referencePercentile(model,model.hypotheticalEstimate,reference,'EUR');
  model.referenceSensitivity=percentileSensitivity(model,model.hypotheticalEstimate,sensitivity,'EUR');
  model.percentile=null;model.percentileReason=model.referenceComparison.reason;
  if(model.hypotheticalEstimate){model.hypotheticalEstimate.percentile=null;model.hypotheticalEstimate.percentileReason=model.referenceComparison.reason;}
  model.uncertainty=scoreUncertainty(model);if(hadRank)blocked.push(model.id);
 }
 if(blocked.length)(report.warnings||=[]).push('Current reference-ancestry safeguard withheld stored EUR ranks for '+blocked.join(', ')+'. Reported evaluation populations exclude EUR; raw sums and measured calls were preserved.');
 return changed;
}
export function europeanSnapshotNotice(report,library,migrated=0){
 const ids=new Set((report.polygenicScores||[]).map(m=>m.id));
 const missing=(library?.models||[]).filter(m=>!ids.has(m.id)).length;
 return (migrated?`Reopened snapshot: ${migrated} non-European score ${migrated===1?'scenario was':'scenarios were'} recalculated with European references. Measured calls were retained. `:'Saved European score snapshot: stored raw scores are preserved; current evaluation-population safeguards may withhold an incompatible reference rank. ')+`This analysis contains ${ids.size} score ${ids.size===1?'model':'models'}. `+(missing?`${missing} installed ${missing===1?'model is':'models are'} absent from this snapshot; analyze the VCF again or reopen an updated analysis to include ${missing===1?'it':'them'}. `:'')+'Current disease and gene context uses installed libraries. '+analysisMethodNotice(report);
}
