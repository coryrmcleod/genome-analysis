// Public-source refresh only. Installed models and reference artifacts are untouched.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {importLibrary,SELECTED_SCORES} from './import-pgs-library.mjs';
const root=new URL('../',import.meta.url),beforeBytes=await readFile(new URL('public/data/pgs-library.json',root));
const before=JSON.parse(beforeBytes),stamp=new Date().toISOString().replace(/[:.]/g,'-');
const destination=new URL('work/pgs-refresh/'+stamp+'/',root);
await mkdir(destination,{recursive:true});
console.log('Checking public scoring sources. Installed scores will not be replaced. No personal genome is read.');
try{
 const staged=await importLibrary({selection:SELECTED_SCORES,publish:false});
 const changed=staged.models.filter(m=>JSON.stringify(m)!==JSON.stringify(before.models.find(old=>old.id===m.id))).map(m=>m.id);
 await writeFile(new URL('pgs-library.json',destination),JSON.stringify(staged,null,2)+'\n');
 await writeFile(new URL('review.json',destination),JSON.stringify({status:'Review required; not installed',baseSha256:createHash('sha256').update(beforeBytes).digest('hex'),changedModels:changed,requirements:'Review source changes; preserve installed model definitions unless an explicit replacement is approved. Rebuild exact, sensitivity and genotype-frequency artifacts before coherent publication.'},null,2)+'\n');
 console.log('Public refresh staged at '+decodeURIComponent(destination.pathname)+'. '+changed.length+' model definitions or metadata differ. No installed model or reference was changed.');
}catch(e){
 await writeFile(new URL('review.json',destination),JSON.stringify({status:'Failed; not installed',reason:e.message},null,2)+'\n');
 console.error(e.message+' Installed scores are unchanged.');process.exitCode=1;
}
