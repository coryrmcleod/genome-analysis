// Independent of score-library versions: scanner/sensitivity changes can affect
// results even when every published model and coefficient remains unchanged.
export const ANALYSIS_METHOD_VERSION='2026-09-18.3';
export function analysisMethodCardNotice(report){return report.analysisMethodVersion===ANALYSIS_METHOD_VERSION?'':'Historical saved result — not verified by the current analysis method. Displayed calls and ranks are preserved snapshots, not a new analysis. Reanalyze the original VCF locally.';}
export function analysisMethodNotice(report){
 if(report.analysisMethodVersion===ANALYSIS_METHOD_VERSION)return '';
 return 'Historical analysis method: '+(report.analysisMethodVersion||'not recorded')+'. This saved report has not been rescanned with the current SNP-overlap safeguards and numerical sensitivity handling. Reanalyze the original VCF locally to apply them; reopening cannot reconstruct omitted off-panel records or certify older calls. Stored raw results remain historical, not newly verified.';
}
