// Admit explicitly selected, source-reviewed models; failed candidates stay out.
import {readFile,writeFile} from 'node:fs/promises';
import {importLibrary,SELECTED_SCORES} from './import-pgs-library.mjs';
const [reviewPath,auditPath,...ids]=process.argv.slice(2);
if(!reviewPath||!auditPath||!ids.length||ids.some(id=>!/^PGS\d{6}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Supply review.json audit.json and explicit PGS IDs.');
const review=JSON.parse(await readFile(reviewPath)),selection=[...SELECTED_SCORES],audit=[];
for(const id of ids){
 if(selection.some(s=>s.id===id))throw Error('Score already installed: '+id);
 const row=review.find(r=>r.id===id);if(row?.status!=='source passes')throw Error('Candidate not source-checked: '+id);
 const candidate={id,family:row.trait,count:row.count,...(row.allowEffectOnly?{allowEffectOnly:true}:{})};
 try{await importLibrary({selection:[...selection,candidate],publish:false});selection.push(candidate);audit.push({id,status:'admitted'});}catch(e){audit.push({id,status:'excluded',reason:e.message});}
 await writeFile(auditPath,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit.at(-1)));
}
if(selection.length>SELECTED_SCORES.length){await importLibrary({selection});await writeFile(new URL('./pgs-selection.json',import.meta.url),JSON.stringify(selection,null,2)+'\n');}
