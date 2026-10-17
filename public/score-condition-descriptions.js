import {scoreConditionDescriptions} from './score-condition-data.js';
import {htmlEscape as e} from './workspace-view.js';
export function scoreConditionDescription(model){return scoreConditionDescriptions[model?.id]?.paragraph||'';}
export function scoreConditionHtml(model,compact=false){
 const paragraph=scoreConditionDescription(model);
 if(!paragraph)return '';
 const healthURL=scoreConditionDescriptions[model.id].healthURL;
 const body='<p class="score-condition-description">'+e(paragraph)+'</p>'+(healthURL?'<p class="small"><a href="'+e(healthURL)+'" target="_blank" rel="noreferrer">Related health information ↗</a></p>':'');
 return compact?'<details class="score-condition"><summary>About this condition or trait</summary>'+body+'</details>':body;
}
