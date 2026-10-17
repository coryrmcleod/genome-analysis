import {scoreResult} from './score-insights.js';
import {validatePGSWorkload} from './pgs-limits.js';
import {validateSavedAncestry} from './ancestry.js';
function validateSavedPercentiles(p){
 for(const key of ['point','lower','upper'])if(p[key]!==undefined&&p[key]!==null&&(!Number.isFinite(p[key])||p[key]<0||p[key]>100))throw Error('Invalid saved score percentile.');
 if(Number.isFinite(p.lower)&&Number.isFinite(p.upper)&&p.lower>p.upper||Number.isFinite(p.point)&&(Number.isFinite(p.lower)&&p.point<p.lower||Number.isFinite(p.upper)&&p.point>p.upper))throw Error('Inconsistent saved score percentile bounds.');
}
function validateSavedMeasuredGenotype(term){
 const dna=value=>typeof value==='string'&&/^[ACGT]+$/.test(value);
 if(typeof term.genotype!=='string'||!dna(term.effectAllele))return;
 const alleles=term.genotype.split(/[|/]/);
 // Older snapshots may omit forward genotype text or retain numeric GT.
 // Do not infer its meaning from today's mapping or source allele labels.
 if(!alleles.every(dna))return;
 if(alleles.length!==2||alleles.filter(allele=>allele===term.effectAllele).length!==term.dosage)throw Error('Saved measured genotype does not match allele dosage.');
 if(term.alleleMode==='effect-only'){
  if(Array.isArray(term.mapping?.alleles)&&alleles.some(allele=>!term.mapping.alleles.includes(allele)))throw Error('Saved measured genotype is outside its reference allele set.');
  if(term.effectAlleleCandidates!==undefined){const candidates=term.effectAlleleCandidates;if(!Array.isArray(candidates)||!candidates.length||Array.from(candidates).some(allele=>!dna(allele)||alleles.filter(value=>value===allele).length!==term.dosage))throw Error('Saved measured genotype retains unresolved effect-allele directions.');}
 }else if(dna(term.otherAllele)&&alleles.some(allele=>allele!==term.effectAllele&&allele!==term.otherAllele))throw Error('Saved measured genotype is outside its two-allele model.');
}
function validateSavedRank(model){
 const p=model.referenceComparison;validateSavedPercentiles(p);
 if(model.referenceSensitivity){const s=model.referenceSensitivity;validateSavedPercentiles({point:s.point});validateSavedPercentiles({lower:s.lower,upper:s.upper,point:s.scenarioSummary?.median});
  if(s.scenarios!=null){if(!Array.isArray(s.scenarios)||Array.from(s.scenarios).some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Invalid saved score scenarios.');for(const row of s.scenarios){validateSavedPercentiles({point:row.centralRank,lower:row.lower,upper:row.upper});if(Number.isFinite(row.lower)&&Number.isFinite(s.lower)&&row.lower<s.lower||Number.isFinite(row.upper)&&Number.isFinite(s.upper)&&row.upper>s.upper)throw Error('Saved individual scenario is outside its sensitivity bounds.');}}
  if(s.scenarioSummary){const summary=s.scenarioSummary;validateSavedPercentiles({point:summary.median,lower:summary.lower,upper:summary.upper});if(Number.isFinite(summary.lower)&&Number.isFinite(s.lower)&&summary.lower<s.lower||Number.isFinite(summary.upper)&&Number.isFinite(s.upper)&&summary.upper>s.upper)throw Error('Saved scenario range is outside its sensitivity bounds.');}
 }
 if(p.measured!==undefined&&typeof p.measured!=='boolean')throw Error('Invalid saved measured-score flag.');
 if(p.measured!==true)return;
 if(!model.total||model.matched!==model.total||!Number.isFinite(model.rawSum)||!Number.isFinite(p.point)||model.terms.some(t=>!Number.isFinite(t.contribution)))throw Error('Saved measured-score rank requires a complete measured score.');
 let sum=0,correction=0,scale=Math.abs(model.rawSum);
 for(const t of model.terms){
  if(t.status!=='Called')throw Error('Saved measured score contains an excluded term.');
  if(t.recordObserved===false)throw Error('Saved measured score contains an explicitly unobserved term.');
  if(t.dosage!==undefined){
   if(!Number.isInteger(t.dosage)||t.dosage<0||t.dosage>2)throw Error('Invalid saved measured allele dosage.');
   const expected=t.dosage*t.weight,termScale=Math.max(Math.abs(expected),Math.abs(t.contribution));
   if(!Number.isFinite(expected)||(termScale===0?expected!==t.contribution:Math.abs(expected/termScale-t.contribution/termScale)>1e-12))throw Error('Saved measured contribution does not match dosage and weight.');
   validateSavedMeasuredGenotype(t);
  }
  const adjusted=t.contribution-correction,next=sum+adjusted;correction=(next-sum)-adjusted;sum=next;scale=Math.max(scale,Math.abs(t.contribution));
 }
 if(!Number.isFinite(sum)||(scale===0?sum!==model.rawSum:Math.abs(sum/scale-model.rawSum/scale)>1e-12*model.total))throw Error('Saved measured score does not match its contributions.');
}
export function validateSaved(value){
 const report=value?.kind==='genome-workspace'?value.report:value;
 if(value?.kind==='genome-workspace'&&value.version!==1)throw Error('Unsupported saved workspace version.');
 if(!report||!Array.isArray(report.results)||report.results.length>100000||!Array.isArray(report.polygenicScores)||!['GRCh37','GRCh38'].includes(report.build)||!report.stats||!Number.isFinite(report.stats.records)||!Array.isArray(report.warnings))throw Error('This is not a supported genome analysis report.');
 validatePGSWorkload(report.polygenicScores,'terms');
 if(report.ancestry){validateSavedAncestry(report.ancestry);if(report.ancestry.status==='Estimated'&&(report.ancestry.build!==report.build||report.format&&report.ancestry.inputFormat!==report.format))throw Error('Saved ancestry input does not match the report build or format');}
 for(const r of [...report.results,...report.polygenicScores.flatMap(m=>m.terms)])if(r.recordObserved!==undefined&&r.recordObserved!==null&&typeof r.recordObserved!=='boolean')throw Error('Invalid record presence flag.');
 if(report.analysisMethodVersion!==undefined&&(typeof report.analysisMethodVersion!=='string'||!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(report.analysisMethodVersion)))throw Error('Invalid analysis method version.');
 const inspect=x=>{if(typeof x==='string'&&(/^(javascript|data|vbscript):/i.test(x.replace(/[\u0000-\u0020]/g,''))||/<[a-z!/]/i.test(x)))throw Error('Unsafe URL or embedded markup in saved report.');if(x&&typeof x==='object')for(const v of Object.values(x))inspect(v);};inspect(report);
 for(const r of report.results)if(typeof r.id!=='string'||typeof r.gene!=='string'||typeof r.status!=='string'||!r.mappings||!Number.isInteger(r.priority)||r.priority<0||r.priority>10)throw Error('Invalid saved variant.');
 const ids=new Set();for(const m of report.polygenicScores){if(!/^PGS\d{6}$/.test(m.id)||ids.has(m.id)||!Array.isArray(m.terms)||m.terms.length>60000||!m.hypotheticalEstimate||!m.referenceComparison||!Number.isInteger(m.matched)||!Number.isInteger(m.total)||m.total!==m.terms.length||m.matched<0||m.matched>m.total)throw Error('Invalid or incomplete saved score.');ids.add(m.id);
  const termIds=new Set();for(const t of m.terms){if(typeof t.id!=='string'||!t.id.trim()||termIds.has(t.id)||!Number.isFinite(t.weight)||typeof t.status!=='string')throw Error('Invalid or duplicate saved score term.');termIds.add(t.id);}
 }
 for(const model of report.polygenicScores)validateSavedRank(model);
 return {report,ui:value?.kind==='genome-workspace'?value.ui||{}:{},notes:value?.kind==='genome-workspace'&&typeof value.notes==='string'?value.notes:'',savedAt:value.savedAt||null};
}
export function saveWorkspace(report,ui,notes){return {kind:'genome-workspace',version:1,savedAt:new Date().toISOString(),report,ui,notes};}
export function unresolvedPriorities(report){
 const rows=[];for(const m of report.polygenicScores||[]){const denominator=m.terms.reduce((n,t)=>n+2*Math.abs(t.weight),0);
  for(const t of m.terms)if(t.contribution===null){const ds=t.possibleDosages?.length?t.possibleDosages:[0,2],span=(Math.max(...ds)-Math.min(...ds))*Math.abs(t.weight);rows.push({model:m.id,trait:m.trait,term:t.id,status:t.status,span,fraction:denominator?span/denominator:0});}}
 return rows.sort((a,b)=>b.fraction-a.fraction||a.model.localeCompare(b.model)||a.term.localeCompare(b.term));
}
export function compareReports(oldReport,newReport){
 if(oldReport.build!==newReport.build||oldReport.sample!==newReport.sample||!!oldReport.syntheticDemo!==!!newReport.syntheticDemo)throw Error('Compare reports from the same sample, build and demo/personal mode.');
 const old=new Map(oldReport.polygenicScores.map(m=>[m.id,m])),rows=[];
 for(const m of newReport.polygenicScores){const a=old.get(m.id);old.delete(m.id);if(!a){rows.push({id:m.id,trait:m.trait,reason:'Model added',after:scoreResult(m)});continue;}
  const reasons=[],terms=new Map(a.terms.map(t=>[t.id,t]));let calls=0,weights=0;
  for(const t of m.terms){const b=terms.get(t.id);if(!b||b.genotype!==t.genotype||b.status!==t.status)calls++;if(!b||b.weight!==t.weight||b.effectAllele!==t.effectAllele||b.otherAllele!==t.otherAllele)weights++;}
  if(calls)reasons.push(calls+' genotype/status changes');if(weights||a.terms.length!==m.terms.length)reasons.push('Model terms or weights changed');
  if(a.libraryVersion!==m.libraryVersion)reasons.push('Score-library version changed');
  if(oldReport.analysisMethodVersion!==newReport.analysisMethodVersion)reasons.push('Analysis method version changed; a new scan is distinct from reopening a saved result');
  if(a.referenceSensitivity?.referenceVersion!==m.referenceSensitivity?.referenceVersion||a.referenceComparison?.retrievedAt!==m.referenceComparison?.retrievedAt)reasons.push('Reference snapshot changed');
  if(a.hypotheticalEstimate?.population!==m.hypotheticalEstimate?.population)reasons.push('Comparison population changed');
  if(JSON.stringify(scoreResult(a))!==JSON.stringify(scoreResult(m))||a.rawSum!==m.rawSum){if(!reasons.length)reasons.push('Result/method changed; stored metadata does not establish the cause');}
  if(reasons.length)rows.push({id:m.id,trait:m.trait,reason:reasons.join('; '),before:scoreResult(a),after:scoreResult(m)});
 }
 for(const m of old.values())rows.push({id:m.id,trait:m.trait,reason:'Model removed',before:scoreResult(m)});
 return rows;
}
export function parseEvidence(text,sample){
 let samples=null;const rows=[];
 for(const line of text.split(/\r?\n/)){if(line.startsWith('#CHROM')){samples=line.split('\t').slice(9);continue;}if(!line||line.startsWith('#'))continue;
  const f=line.split('\t');if(f.length<10||!/^\d+$/.test(f[1]))throw Error('Paste tab-separated VCF records including FORMAT and sample calls.');
  let index=0;if(f.length>10){index=samples?.indexOf(sample)??-1;if(index<0)throw Error('Multi-sample evidence needs a #CHROM header matching the report sample.');}
  const fields=Object.fromEntries(f[8].split(':').map((k,i)=>[k,f[9+index].split(':')[i]??'.']));rows.push({chrom:f[0],position:Number(f[1]),ref:f[3],alt:f[4],quality:f[5],filter:f[6],fields});
 }return rows;
}
