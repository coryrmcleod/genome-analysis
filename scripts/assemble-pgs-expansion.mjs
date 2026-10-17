import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {mergePGSLibraries} from './expand-reviewed-pgs.mjs';
const [output,...stages]=process.argv.slice(2);if(!output||!stages.length)throw Error('Supply output directory and completed staging directories');
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(p));
const beforeBytes=await readFile(new URL('public/data/pgs-library.json',root)),baseHash=createHash('sha256').update(beforeBytes).digest('hex');
let library=JSON.parse(beforeBytes);const selection=await read(new URL('scripts/pgs-selection.json',root)),audit=[];
for(const stage of stages){
 const base=await read(stage+'/base.json');if(base.librarySha256!==baseHash)throw Error('Staging base differs from installed library');
 const addition=await read(stage+'/pgs-library.json'),selected=await read(stage+'/selection.json'),ids=new Set(library.models.map(m=>m.id));
 for(const m of addition.models.filter(m=>ids.has(m.id)))if(JSON.stringify(m)!==JSON.stringify(library.models.find(x=>x.id===m.id)))throw Error('Stage changed an existing model: '+m.id);
 const newModels=addition.models.filter(m=>!ids.has(m.id));
 if(newModels.length){library=mergePGSLibraries(library,{...addition,models:newModels},addition.version);for(const m of newModels){const s=selected.find(s=>s.id===m.id);if(!s)throw Error('Missing selection');selection.push(s);}}
 audit.push(...await read(stage+'/audit.json'));
}
await mkdir(output,{recursive:true});
for(const [name,value] of Object.entries({'pgs-library':library,selection,audit,base:{librarySha256:baseHash,models:library.models.length,targets:library.targets.length}}))await writeFile(output+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({models:library.models.length,targets:library.targets.length}));
