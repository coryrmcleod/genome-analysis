import {htmlEscape as escape} from './workspace-view.js';
import {PGS_LIMITS} from './pgs-limits.js';
import {metricPrimaryReview} from './pgs-metric-review.js';
import {evaluationScopeHtml} from './pgs-evaluation-scope-review.js';
import {developmentReviewHtml} from './pgs-development-review.js';
import {trainingSampleReviewHtml} from './pgs-training-sample-review.js';
import {adjustedAUCHtml} from './pgs-adjusted-auc-review.js';
import {sampleCountHtml} from './pgs-sample-count-review.js';
import {discoveryCitationHtml} from './pgs-discovery-citation-review.js';
import {eprsOSAHtml} from './pgs-eprs-osa-review.js';
import {cholelithiasisHtml} from './pgs-cholelithiasis-review.js';
import {osaDiscoveryHtml} from './pgs-osa-discovery-review.js';
const hash=/^[a-f0-9]{64}$/;
const text=(s,max=20000)=>typeof s==='string'&&s.length<=max;
function validDuration(d){
 if(d==null)return true;
 if(typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['estimate_type','estimate','variability_type','variability','unit','interval'].includes(k)))return false;
 if(['estimate_type','variability_type','unit'].some(k=>d[k]!==undefined&&!text(d[k],200))||['estimate','variability'].some(k=>d[k]!==undefined&&(!Number.isFinite(d[k])||d[k]<0)))return false;
 const i=d.interval;
 return i===undefined||(i&&typeof i==='object'&&!Array.isArray(i)&&Object.keys(i).every(k=>['type','lower','upper'].includes(k))&&text(i.type,200)&&Number.isFinite(i.lower)&&Number.isFinite(i.upper)&&i.lower>=0&&i.lower<=i.upper);
}
function durationText(d){
 if(!d)return 'Not reported';
 return [d.estimate===undefined?'':[d.estimate_type||'estimate',d.estimate].join(' '),d.variability===undefined?'':[d.variability_type||'variability',d.variability].join(' '),d.interval?[d.interval.type,d.interval.lower+'–'+d.interval.upper].join(' '):'',d.unit||''].filter(Boolean).join('; ')||'Not reported';
}
export function validatePGSEvaluationLibrary(library){
 if(!library||library.version!==1||!Number.isFinite(Date.parse(library.retrievedAt))||!Array.isArray(library.models)||library.models.length>PGS_LIMITS.models)throw Error('Invalid PGS evaluation evidence library');
 const ids=new Set();let total=0;
 for(const m of library.models){
  if(!/^PGS\d{6}$/.test(m.id)||ids.has(m.id)||!hash.test(m.originalSha256)||!Array.isArray(m.sources)||!m.sources.length||!Array.isArray(m.evaluations)||m.evaluations.length>1000)throw Error('Invalid score evaluation inventory');ids.add(m.id);
  if((total+=m.evaluations.length)>10000)throw Error('Evaluation inventory too large');
  if(m.development!==undefined){
   const d=m.development,u=new URL(d?.metadataSource?.url);
   if(u.href!=='https://www.pgscatalog.org/rest/score/'+m.id||!hash.test(d.metadataSource.sha256)||!Array.isArray(d.phenotypes)||d.phenotypes.length>1000||d.phenotypes.some(p=>!['Variant-association discovery','Score development/training'].includes(p.stage)||!text(p.definition)||!p.definition.trim()))throw Error('Invalid development phenotype evidence');
  }
  for(const s of m.sources){const u=new URL(s.url);if(u.protocol!=='https:'||u.hostname!=='www.pgscatalog.org'||u.pathname!=='/rest/performance/search'||u.searchParams.get('pgs_id')!==m.id||!hash.test(s.sha256))throw Error('Invalid evaluation source');}
  const metrics=new Set();
  for(const r of m.evaluations){
   if(!/^PPM\d+$/.test(r.id)||metrics.has(r.id)||!/^PSS\d+$/.test(r.sampleSet)||!text(r.endpoint)||!text(r.covariates)||!text(r.comments)||!text(r.publication)||!Array.isArray(r.samples)||r.samples.length>100||!Array.isArray(r.metrics)||r.metrics.length>100)throw Error('Invalid evaluation row');metrics.add(r.id);
   for(const s of r.samples){if(!text(s.ancestry)||!text(s.cohort)||!text(s.phenotyping)||['country','populationDetails'].some(k=>s[k]!==undefined&&!text(s[k]))||['count','cases','controls'].some(k=>s[k]!==null&&(!Number.isSafeInteger(s[k])||s[k]<0))||s.malePercent!=null&&(!Number.isFinite(s.malePercent)||s.malePercent<0||s.malePercent>100)||!validDuration(s.age)||!validDuration(s.followup))throw Error('Invalid evaluation sample');}
   for(const v of r.metrics){if(!text(v.name)||['estimate','lower','upper','standardError'].some(k=>v[k]!==null&&!Number.isFinite(v[k]))||v.standardError!==null&&v.standardError<0)throw Error('Invalid study metric');if(v.lower!==null&&v.upper!==null&&v.lower>v.upper)throw Error('Reversed study metric interval');}
  }
 }
 return library;
}
export function evaluationForModel(model,library){
 const row=library?.models.find(m=>m.id===model.id);
 if(!row||row.originalSha256!==model.sourceFiles?.original?.sha256)return null;
 if(row.development&&(row.development.metadataSource.sha256!==model.sourceFiles?.metadata?.sha256||row.development.metadataSource.url!==model.sourceFiles?.metadata?.url))return null;
 return row;
}
export function evaluationHtml(model,library){
 const evidence=evaluationForModel(model,library);if(!evidence)return '';
 const e=escape;
 const renderMetric=(r,v)=>{
  const review=metricPrimaryReview(model,evidence,r,v);
  if(review)return e(v.name)+': '+e(v.estimate??'not reported')+' <strong>Do not use this metric: '+(review.status==='confirmed'?'the deposited value conflicts with the primary study':'evidence changed after a confirmed primary discrepancy; re-review required')+'.</strong>'+(review.status==='confirmed'?' Primary study AUPRC: '+e(review.primaryAUPRC)+' ('+e(review.primaryAUPRCCell)+'); the deposited value is retained above for traceability.':'')+' <a href="'+e(review.primaryURL)+'" target="_blank" rel="noreferrer">Primary study</a>';
  return e(v.name)+': '+e(v.estimate??'not reported')+(v.lower!==null&&v.upper!==null?' [reported interval '+e(v.lower)+' to '+e(v.upper)+']':'')+(v.standardError!==null?' (reported SE '+e(v.standardError)+')':'');
 };
 const development=evidence.development;
 const definitions=development?'<section><h4>Compare development and evaluation definitions</h4><p>These are separate source descriptions. Similar names do not establish identical case definitions, and different wording alone does not prove different endpoints. GA does not recode diagnoses or assume that an evaluation endpoint matches the development endpoint.</p>'+(development.phenotypes.length?development.phenotypes.map(p=>'<p>'+e(p.stage)+': '+e(p.definition)+'</p>').join(''):'<p>No development phenotype definitions were deposited in this metadata snapshot; agreement with evaluation definitions is unknown.</p>')+'<p>Frozen development metadata SHA-256: '+e(development.metadataSource.sha256)+'.</p></section>':'';
 return '<details class="score-note"><summary>Offline published evaluation evidence ('+evidence.evaluations.length+' record'+(evidence.evaluations.length===1?'':'s')+')</summary><p>Study results below are not your predicted risk or GA performance. Endpoints, covariates, populations and scoring versions can differ; comments may describe a partial or unweighted model. Do not transfer those results to the complete raw genetic sum. Sample sets can overlap and must not be added together. Effect-size units and score scaling follow the source study, not GA raw-score units.</p>'+
 definitions+developmentReviewHtml(model,evidence)+osaDiscoveryHtml(model,evidence)+trainingSampleReviewHtml(model,evidence)+discoveryCitationHtml(model,evidence)+evidence.evaluations.map(r=>'<section><h4>'+e(r.endpoint||'Endpoint not reported')+'</h4><p>'+e(r.id+' · '+r.sampleSet+' · '+r.publication)+'</p>'+evaluationScopeHtml(model,evidence,r)+adjustedAUCHtml(model,evidence,r)+sampleCountHtml(model,evidence,r)+eprsOSAHtml(model,evidence,r)+cholelithiasisHtml(model,evidence,r)+r.samples.map(s=>
  '<p>'+e([s.ancestry,s.country,s.populationDetails,s.cohort].filter(Boolean).join(' · ')+' · '+(s.count??'Unreported')+' participants'+(s.cases===null?'':' · '+s.cases+' cases')+(s.controls===null?'':' · '+s.controls+' controls'))+'</p><p>Reported participant age: '+e(durationText(s.age))+'. Study follow-up: '+e(durationText(s.followup))+'. Reported male participants: '+e(s.malePercent==null?'Not reported':s.malePercent+'%')+'. These study descriptors do not establish an individual age-specific risk or follow-up horizon.</p>'+(s.phenotyping?'<p>Study phenotype definition: '+e(s.phenotyping)+'</p>':'')
 ).join('')+'<p>Reported study metrics: '+(r.metrics.length?r.metrics.map(v=>renderMetric(r,v)).join('; '):'none deposited')+'</p><p>Included covariates: '+e(r.covariates||'Not reported')+'</p><p>Evaluation comments: '+e(r.comments||'None deposited; this does not establish an independent validation or exact scoring-version match.')+'</p></section>').join('')+
 '<p>Public evidence index assembled: '+e(library.retrievedAt)+'. Existing frozen source snapshots are retained until explicitly refreshed. Linked to original scoring-file SHA-256 '+e(evidence.originalSha256)+'. This link identifies the Catalog score; it does not establish that every evaluation used all deposited terms.</p><a href="https://www.pgscatalog.org/score/'+e(model.id)+'/" target="_blank" rel="noreferrer">Catalog evaluation records ↗</a></details>';
}
