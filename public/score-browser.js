import {scoreConditionHtml} from './score-condition-descriptions.js';
import {scoreResult,scoreDisplayTrait} from './score-insights.js';
import {htmlEscape as e} from './workspace-view.js';
export const SCORE_TERM_LIMIT=200;
const equivalentParkinsonPairs=[['PGS000902','PGS004924'],['PGS003763','PGS012584']];
function formulaKey(model){
 const terms=model.terms||model.variants;
 if(!terms?.length||terms.length!==(model.total??model.variantCount))return null;
 if(terms.some(t=>!t.id||!t.effectAllele||!Number.isFinite(t.weight)))return null;
 return JSON.stringify(terms.map(t=>[t.id,t.effectAllele,t.weight]).sort((a,b)=>a[0].localeCompare(b[0])));
}
export function consolidateScoreEntries(models){
 const groups=[],seen=new Set();
 for(const model of models){
  if(seen.has(model.id))continue;
  const pair=equivalentParkinsonPairs.find(p=>p.includes(model.id)),key=formulaKey(model);
  const equivalents=pair&&key?models.filter(m=>m.id!==model.id&&pair.includes(m.id)&&formulaKey(m)===key):[];
  seen.add(model.id);for(const m of equivalents)seen.add(m.id);
  groups.push({model,equivalents});
 }
 return groups;
}
export function visibleScoreTerms(model,query='',limit=SCORE_TERM_LIMIT){
 const q=query.toLowerCase(),broad=`${model.id} ${model.name} ${model.trait} ${model.family}`.toLowerCase().includes(q);
 const matches=broad?model.terms:model.terms.filter(t=>`${t.id} ${t.sourceId} ${t.locus}`.toLowerCase().includes(q));
 return {terms:matches.slice(0,limit),matching:matches.length,total:model.terms.length};
}
export function publicationDate(model){
 const value=model.publication?.date_publication;
 if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value))return null;
 const date=value.length===7?value+'-01':value,stamp=Date.parse(date+'T00:00:00Z');
 return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===date?stamp:null;
}
export function scoreBrowseOptions(value={}){return {sortBy:['percentile','weight','date'].includes(value?.sortBy)?value.sortBy:'trait',direction:value?.direction==='desc'?'desc':'asc',hideUnavailable:value?.hideUnavailable===true};}
export function browseScores(models,options={}){
 const {sortBy,direction,hideUnavailable}=scoreBrowseOptions(options),sign=direction==='desc'?-1:1;
 return models.map(model=>({model,point:scoreResult(model).point})).filter(r=>!hideUnavailable||Number.isFinite(r.point)).sort((a,b)=>{
  const tie=()=>scoreDisplayTrait(a.model).localeCompare(scoreDisplayTrait(b.model),undefined,{sensitivity:'base'})||a.model.id.localeCompare(b.model.id);
  if(sortBy==='trait')return sign*tie();
  const x=sortBy==='date'?publicationDate(a.model):sortBy==='weight'?a.model.absoluteWeightCoverage:a.point,y=sortBy==='date'?publicationDate(b.model):sortBy==='weight'?b.model.absoluteWeightCoverage:b.point;
  const av=Number.isFinite(x),bv=Number.isFinite(y);
  if(av!==bv)return av?-1:1;
  return av&&x!==y?sign*(x-y):tie();
 }).map(r=>r.model);
}
export function scoreSummaryHtml(models,options={},organizer={}){
 const settings=scoreBrowseOptions(options),header=(key,label)=>'<th aria-sort="'+(settings.sortBy===key?(settings.direction==='asc'?'ascending':'descending'):'none')+'"><button type="button" class="score-sort" data-score-sort="'+key+'">'+label+' '+(settings.sortBy===key?(settings.direction==='asc'?'↑':'↓'):'↕')+'</button></th>';
 const rows=consolidateScoreEntries(browseScores(models,settings)).map(({model:m,equivalents})=>{const r=scoreResult(m),point=Number.isFinite(r.point)?r.point.toFixed(1):'—',range=Number.isFinite(r.lower)&&Number.isFinite(r.upper)?r.lower.toFixed(1)+'–'+r.upper.toFixed(1):'Unavailable';
 const related=equivalents.length?'<details><summary>Same scoring formula · '+(equivalents.length+1)+' study records</summary><p>Identical published effect alleles and weights; allele documentation can differ. Results shown in this row use '+e(m.id)+'. Each study retains its own allele checks, evaluation, limitations and saved pins.</p>'+equivalents.map(other=>'<p><button class="quiet" data-pin="score:'+e(other.id)+'" aria-label="Pin '+e(other.id)+'" aria-pressed="'+!!organizer['score:'+other.id]?.pinned+'">'+(organizer['score:'+other.id]?.pinned?'★':'☆')+'</button> <a href="#score-'+e(other.id)+'">'+e(other.id)+' · '+e(other.publication?.firstauthor||other.name||'Study details')+'</a></p>').join('')+'</details>':'';
  return '<tr><td><button class="quiet" data-pin="score:'+e(m.id)+'" aria-label="Pin '+e(scoreDisplayTrait(m))+'" aria-pressed="'+!!organizer['score:'+m.id]?.pinned+'">'+(organizer['score:'+m.id]?.pinned?'★':'☆')+'</button> <a href="#score-'+e(m.id)+'">'+e(scoreDisplayTrait(m))+'</a><small>'+e(m.id)+' · '+m.total+' variants</small>'+scoreConditionHtml(m,true)+related+'</td><td>'+(publicationDate(m)!==null?e(m.publication.date_publication):'Unknown')+'</td><td>'+point+'<small>'+e(r.label)+'</small></td><td>'+range+'</td><td>'+m.matched+'/'+m.total+'<small>'+(Number.isFinite(m.absoluteWeightCoverage)?(100*m.absoluteWeightCoverage).toFixed(1)+'% of absolute weight':'Weight coverage unavailable')+'</small></td></tr>';
 });
return '<div class="score-summary"><h3>Scores at a glance</h3><p>Percentiles below rank genetic scores within the European reference sample. Scenario medians and ranges depend on the assumptions in each score’s details; they are not disease probabilities. Select a trait to open its explanation and variants. Publication dates sort oldest or newest first; unknown dates remain last. Use the star to pin a score.</p><label class="score-availability"><input type="checkbox" id="hide-unavailable-scores"'+(settings.hideUnavailable?' checked':'')+'> Hide scores with unavailable percentile estimates</label><p class="small">Scores with only a range and no numeric estimate are treated as unavailable for sorting and filtering.</p><div class="table-wrap"><table><thead><tr>'+header('trait','Trait / disease')+header('date','Publication date')+header('percentile','Percentile or scenario estimate')+'<th>Full percentile range</th>'+header('weight','Usable measured terms · % absolute weight')+'</tr></thead><tbody>'+(rows.join('')||'<tr><td colspan="5">No scores match these filters. Clear the search or uncheck the availability filter.</td></tr>')+'</tbody></table></div></div>';
}
