import {htmlEscape as e} from './workspace-view.js';
export function methodEvidenceHtml(model){
 const p=model?.additiveMethodEvidence;
 if(!p||p.id!==model.id||p.originalSha256!==model.sourceFiles?.original?.sha256||! /^[a-f0-9]{64}$/.test(p.sourceSha256)||typeof p.method!=='string')return '';
 let url;try{url=new URL(p.sourceURL);}catch{return '';}
 const reviewedInsulinSource=model.id==='PGS000877'&&url.href==='https://ora.ox.ac.uk/objects/uuid%3Aff69ecd0-0cad-4898-841b-95fa5722dc04/files/m4cd1544fa21686fbdfb74b8b7f1f3f31';
 const reviewedLinearSource=model.id==='PGS000043'&&url.href==='https://research.fredhutch.org/content/dam/research/kooperberg/publications/2019klarin.pdf'||model.id==='PGS000137'&&url.href==='https://genepi.qimr.edu.au/contents/p/staff/Craig%20et%20al.%2C%20Multitrait%20analysis%20of%20glaucoma.pdf';
 if(url.protocol!=='https:'||!reviewedInsulinSource&&!reviewedLinearSource&&!['www.ebi.ac.uk','eprints.gla.ac.uk'].includes(url.hostname)&&url.href!=='https://cdn.amegroups.cn/journals/amepc/files/journals/16/articles/34291/public/34291-PB10-7819-R3.pdf')return '';
 return '<details class="score-note"><summary>Reviewed additive-method evidence</summary><p>'+e(p.method)+'</p><p>Deposited weight-type label: '+e(model.sourceWeightType||model.weightType)+'. Original numeric coefficients remain unchanged.</p><p><a href="'+e(url.href)+'" target="_blank" rel="noreferrer">Primary methods source ↗</a></p><p>Frozen document SHA-256: '+e(p.sourceSha256)+'. Bound to original scoring-file SHA-256: '+e(p.originalSha256)+'.</p></details>';
}
