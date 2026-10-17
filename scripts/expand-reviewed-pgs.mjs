// Stage explicitly reviewed additions while preserving every installed model.
// This does not publish: review the audit and rebuild reference artifacts first.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {importLibrary} from './import-pgs-library.mjs';
import {mergePGSLibraries} from './merge-pgs-libraries.mjs';
export {mergePGSLibraries} from './merge-pgs-libraries.mjs';
async function main(){
 const [selectionPath,outputDirectory,version]=process.argv.slice(2);
 if(!selectionPath||!outputDirectory||!/^\d+\.\d+\.\d+$/.test(version||''))throw Error('Supply reviewed-selection.json staging-directory version');
 const root=new URL('../',import.meta.url),beforeBytes=await readFile(new URL('public/data/pgs-library.json',root));
 let library=JSON.parse(beforeBytes);const originalSelection=JSON.parse(await readFile(new URL('scripts/pgs-selection.json',root))),candidates=JSON.parse(await readFile(selectionPath)),selection=[...originalSelection],audit=[];
 if(!Array.isArray(candidates)||!candidates.length||new Set(candidates.map(c=>c.id)).size!==candidates.length)throw Error('Invalid candidate selection');
 await mkdir(outputDirectory,{recursive:true});
 for(const candidate of candidates){
  if(selection.some(s=>s.id===candidate.id))throw Error('Already selected: '+candidate.id);
  try{const addition=await importLibrary({selection:[candidate],publish:false});library=mergePGSLibraries(library,addition,version);selection.push(candidate);audit.push({id:candidate.id,status:'admitted',count:candidate.count});}
  catch(e){audit.push({id:candidate.id,status:'excluded',reason:e.message});}
  console.log(JSON.stringify(audit.at(-1)));await writeFile(outputDirectory+'/audit.json',JSON.stringify(audit,null,2)+'\n');
 }
 await writeFile(outputDirectory+'/pgs-library.json',JSON.stringify(library,null,2)+'\n');
 await writeFile(outputDirectory+'/selection.json',JSON.stringify(selection,null,2)+'\n');
 await writeFile(outputDirectory+'/base.json',JSON.stringify({librarySha256:createHash('sha256').update(beforeBytes).digest('hex'),previousModelCount:originalSelection.length,models:library.models.length,targets:library.targets.length},null,2)+'\n');
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
