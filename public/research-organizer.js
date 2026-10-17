import {htmlEscape as e} from './workspace-view.js';
import {scoreResult,scoreFamily} from './score-insights.js';
import {referenceAncestryEligibility} from './pgs-ancestry-eligibility.js';

export function normalizeOrganizer(value={},report){
 const valid=new Set([...(report?.polygenicScores||[]).map(m=>'score:'+m.id),...(report?.results||[]).map(r=>'variant:'+r.id)]),out={};
 if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const [key,item] of Object.entries(value).slice(0,100000))if(valid.has(key)&&item&&typeof item==='object')out[key]={pinned:item.pinned===true,reviewed:item.reviewed===true,note:typeof item.note==='string'?item.note.slice(0,5000):''};
 return out;
}
export function organizerControls(key,organizer={}){
 const item=organizer[key]||{};
 return `<section class="item-organizer" data-organizer="${e(key)}"><button class="secondary" data-pin="${e(key)}" aria-pressed="${!!item.pinned}">${item.pinned?'★ Pinned':'☆ Pin'}</button> <label><input type="checkbox" data-reviewed="${e(key)}"${item.reviewed?' checked':''}> Reviewed</label><label>Private note<textarea data-item-note="${e(key)}" rows="2" maxlength="5000">${e(item.note||'')}</textarea></label><small>Saved with “Save analysis locally”. Reviewed is your own research status.</small></section>`;
}
export function scoreKind(m){const r=scoreResult(m);return r.label==='Measured-score rank'?'measured':r.label.startsWith('Hypothetical')?'scenario':r.lower!==null?'sensitivity':'unavailable';}
export function filterResearchScores(models,filters={},organizer={}){return models.filter(m=>(!filters.family||scoreFamily(m)===scoreFamily({family:filters.family}))&&(!filters.kind||scoreKind(m)===filters.kind)&&(!filters.pinned||organizer['score:'+m.id]?.pinned)&&(!filters.coverage||(Number.isFinite(m.absoluteWeightCoverage)&&m.absoluteWeightCoverage>=Number(filters.coverage)))&&(!filters.eligibility||referenceAncestryEligibility(m,'EUR').status===filters.eligibility));}
export function researchFiltersHtml(models,filters={}){
 const select=(key,label,options)=>`<label>${label}<select data-research-filter="${key}"><option value="">All</option>${options.map(([value,text])=>`<option value="${e(value)}"${(key==='family'?scoreFamily({family:filters[key]}):filters[key])===value?' selected':''}>${e(text)}</option>`).join('')}</select></label>`;
 return '<div class="filters research-filters">'+select('family','Trait family',[...new Set(models.map(scoreFamily).filter(Boolean))].sort().map(f=>[f,f]))+select('kind','Result type',[['measured','Measured rank'],['scenario','Hypothetical scenario'],['sensitivity','Sensitivity / bounds'],['unavailable','Unavailable']])+select('coverage','Measured weight coverage',[['0.5','At least 50%'],['0.9','At least 90%'],['1','100%']])+select('eligibility','EUR evaluation eligibility',[['represented','Represented in evaluation'],['mismatch','Mismatch'],['unknown','Unknown']])+`<label><input type="checkbox" data-research-filter="pinned"${filters.pinned?' checked':''}> Pinned scores only</label><button class="secondary" data-reset-research>Reset score filters</button></div>`;
}
