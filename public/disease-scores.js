import {scoreResult} from './score-insights.js';
import {htmlEscape as e,resultBadge} from './workspace-view.js';

// Explicit model endpoints: biomarkers such as glucose, LDL and BMI are not disease scores.
export const DISEASE_MODELS = {
 PGS003861:'Pulmonary embolism',
 PGS005165:'Cervical cancer',
 PGS000638:'Hodgkin lymphoma',
 PGS000653:'Myeloma / plasma-cell malignancy',
 PGS018695:'Thyroid / immune',
 PGS003760:'Early-onset colorectal cancer',PGS004165:'Lung cancer / never-smoking women',
 PGS018881:'Hemolytic-anemia code group',
 PGS001826:'Clotting-factor deficiency',PGS019687:'Recurrent joint / arthropathy',
 PGS002266:'Craniofacial development',PGS001835:'Eye',PGS001823:'Iron metabolism',PGS001824:'Bilirubin metabolism',PGS019395:'Gallbladder',PGS019270:'Sinus / upper airway',
 PGS003414:'Sleep / neurological',PGS000114:'Childhood joint / immune',
 PGS000011:'Cardiovascular',PGS005111:'Metabolic',PGS003461:'Cardiovascular',
 PGS003858:'Sleep',PGS012520:'Sleep',PGS004224:'Kidney',PGS004904:'Cancer',
 PGS004863:'Neurological',PGS003746:'Cancer',PGS000029:'Cancer',PGS004601:'Cancer',
 PGS004245:'Cancer',PGS004899:'Cardiovascular',PGS001834:'Eye',PGS000037:'Respiratory',
 PGS000764:'Eye',PGS001883:'Bone',PGS004118:'Immune / inflammatory',
 PGS004903:'Immune / inflammatory',PGS005308:'Immune / inflammatory',
 PGS004105:'Immune / inflammatory',PGS001885:'Drug allergy',
 PGS003763:'Neurological',PGS000809:'Immune / inflammatory',PGS000086:'Cancer',
 PGS004591:'Mental health',PGS002729:'Joint health',PGS003960:'Immune / inflammatory',
 PGS004953:'Cancer',PGS000655:'Liver',PGS003447:'Reproductive health',
 PGS004244:'Cancer',PGS004913:'Liver',PGS004246:'Cancer',PGS004250:'Cancer',
 PGS004322:'Cardiovascular',PGS002307:'Joint health',PGS012519:'Cardiovascular',PGS005319:'Cardiovascular',
 PGS000193:'Mental health',PGS003442:'Mental health',PGS002264:'Cancer',PGS004924:'Neurological',
 PGS000328:'Immune / inflammatory',PGS004222:'Joint health',PGS002794:'Cardiovascular',
 PGS003437:'Cancer',PGS003420:'Immune / inflammatory',PGS018991:'Neurological',PGS003456:'Cardiovascular',
 PGS000068:'Cancer',PGS000341:'Immune / inflammatory',PGS000869:'Metabolic',
 PGS000870:'Metabolic',PGS002256:'Reproductive health',PGS000753:'Cardiovascular',
 PGS000760:'Immune / inflammatory',PGS005158:'Cardiovascular',PGS005282:'Kidney',PGS001829:'Mental health',
 PGS003453:'Cancer',PGS000737:'Cardiovascular',PGS000739:'Cardiovascular',PGS002292:'Eye',
 PGS004117:'Metabolic',PGS001872:'Immune / inflammatory',PGS012550:'Respiratory',
 PGS012562:'Gastrointestinal',PGS012582:'Gastrointestinal',PGS018956:'Mental health',
 PGS002261:'Cancer',PGS003454:'Cancer',PGS005160:'Cancer',PGS001827:'Neurological',PGS000071:'Cancer',PGS018671:'Endocrine / immune',
 PGS019954:'Cancer',PGS001894:'Gastrointestinal',PGS001855:'Gastrointestinal',
 PGS018505:'Cancer',PGS002291:'Cancer',PGS001819:'Eye / metabolic',PGS002739:'Mental health',PGS001308:'Immune / inflammatory',PGS003417:'Cancer',PGS019061:'Eye / inflammatory'
};
export function diseaseRows(report,query=''){
 return (report.polygenicScores||[]).filter(m=>DISEASE_MODELS[m.id]&&
  (m.id+' '+m.trait+' '+DISEASE_MODELS[m.id]).toLowerCase().includes(query.toLowerCase()))
  .sort((a,b)=>a.trait.localeCompare(b.trait)).map(m=>({model:m,result:scoreResult(m),category:DISEASE_MODELS[m.id]}));
}
const percentile=n=>Number.isFinite(n)?n.toFixed(1)+' percentile':'Unavailable';
export function diseaseContext(id){
 if(id==='PGS003763')return '<div class="score-note"><h4>Published disease-risk evidence</h4><p>In the reported UK Biobank analysis, the high versus low polygenic-score tertile had a hazard ratio of 1.72 (95% CI 1.54–1.93) for incident Parkinson disease. This is a study-group comparison, not your hazard ratio. The study tertiles cannot be assigned from the 1000 Genomes ranks. <a href="https://www.pgscatalog.org/score/PGS003763/" target="_blank" rel="noreferrer">Source and evaluation population ↗</a></p></div>';
 if(id!=='PGS000086')return '';
 return '<div class="score-note"><h5>What this disease score means</h5><p>Most testicular cancers arise in germ cells, the cells that produce sperm. The main groups are seminomas and nonseminomas. Testicular cancer occurs particularly in young adults and is usually curable. A history of an undescended testicle or a personal or family history of testicular cancer can affect risk independently of this score. <a href="https://www.cancer.gov/types/testicular" target="_blank" rel="noreferrer">NCI disease overview ↗</a> · <a href="https://www.cancer.gov/types/testicular/causes-risk-factors" target="_blank" rel="noreferrer">Risk factors ↗</a></p><p>This 52-variant model measures common inherited susceptibility to testicular cancer, including testicular germ cell tumors. Higher scores indicate greater genetic susceptibility in the published model; a lower score does not rule out cancer. The reported European evaluation used male participants. The percentile here compares scores with the 503-person European reference sample, not with an age-matched clinical cohort. The scenario estimate is a best-guess illustration under stated allele assumptions, and its range shows sensitivity to unresolved terms; neither is a probability of cancer, a diagnosis, or an estimate of tumor subtype. No personal age, anatomy or medical history is inferred. <a href="https://www.pgscatalog.org/score/PGS000086/" target="_blank" rel="noreferrer">Model and evaluation evidence ↗</a></p></div>';
}
export function diseasesHtml(report,query=''){
 const rows=diseaseRows(report,query);
 return '<h3>Disease predisposition</h3><p>These published models summarize inherited susceptibility to their specific disease endpoint. The reference rank describes the genetic score, not the chance of developing that disease. Different models and endpoints are kept separate.</p><div class="score-note"><strong>Personal absolute disease risk: not calculated</strong><p>A percentage risk requires a validated model with a defined time horizon, baseline incidence and applicable clinical inputs. The installed score distributions alone do not supply that calibration. Age, family history, exposures and other clinical factors can materially change risk. An 85th-percentile score does not mean an 85% disease probability.</p></div><p>'+rows.length+' disease models in this analysis. Biomarker scores remain in Polygenic scores. Selected rare-variant findings remain in Key genes; they are not added to these scores.</p>'+rows.map(({model:m,result:r,category})=>{
 const usable=m.terms.filter(t=>Number.isFinite(t.contribution)).length;
 const reference=m.hypotheticalEstimate?.population||'Unspecified';
 const unavailableReason=r.lower===null?'<p>'+e(m.referenceSensitivity?.reason||m.referenceComparison?.reason||'No compatible reference comparison is available for this result.')+'</p>':'';
 const evidence=(m.coverageContext?'<p class="score-note">'+e(m.coverageContext)+'</p>':'')+(m.id==='PGS003763'?'<p>Published study context: the high versus low score tertile had a hazard ratio of 1.72 (95% CI 1.54–1.93) for incident Parkinson disease in the reported UK Biobank analysis. This is a group comparison, not your hazard ratio; these study tertiles cannot be assigned from the 1000 Genomes ranks.</p>':'');
 return '<article class="pgs-card"><h4>'+e(m.trait)+'</h4><p>'+e(category+' · '+m.id)+'</p>'+resultBadge(m)+'<div class="pgs-metrics"><div><small>'+(r.label==='Measured-score rank'?'Measured rank':'Scenario estimate')+'</small><strong>'+percentile(r.point)+'</strong></div><div><small>Full sensitivity / completion range</small><strong>'+(Number.isFinite(r.lower)&&Number.isFinite(r.upper)?r.lower.toFixed(1)+'–'+r.upper.toFixed(1)+' percentile':'Unavailable')+'</strong></div><div><small>Usable measured terms</small><strong>'+usable+'/'+m.total+'</strong></div></div><p>Comparison setting: '+e(reference)+'. Scenario estimates and ranges retain the assumptions of the full score card; they are not confidence intervals or a clinical risk category.</p>'+unavailableReason+diseaseContext(m.id)+evidence+'<button class="secondary" data-disease-score="'+e(m.id)+'">Open score, assumptions and variants</button> <a href="https://www.pgscatalog.org/score/'+e(m.id)+'/" target="_blank" rel="noreferrer">Published model and disease-risk evidence ↗</a></article>';
 }).join('')+(!rows.length?'<p>No disease models match this search in the loaded analysis. Older saved analyses retain their original model set; analyze the VCF again to include newly installed models.</p>':'');
}
