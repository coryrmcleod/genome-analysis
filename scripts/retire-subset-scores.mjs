import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {retiredScoreReplacements} from '../public/retired-scores.js';
import {validatePGSLibrary} from '../public/pgs.js';
const root=new URL('../',import.meta.url),ids=new Set(Object.keys(retiredScoreReplacements));
const files=['public/data/pgs-library.json','public/data/pgs-score-reference.json','public/data/pgs-score-sensitivity.json','public/data/pgs-evaluation.json','scripts/pgs-selection.json'];
const loaded=await Promise.all(files.map(async file=>({file,value:JSON.parse(await readFile(new URL(file,root)))})));
const library=loaded[0].value;
if(!library.models.some(m=>ids.has(m.id))){console.log('Reviewed older subset models already retired.');process.exit(0);}
const retirements=Object.entries(retiredScoreReplacements).map(([id,replacement])=>{
 const older=library.models.find(m=>m.id===id),newer=library.models.find(m=>m.id===replacement);
 if(!older||!newer||!(Date.parse(newer.publication.date_publication)>Date.parse(older.publication.date_publication))||newer.variantCount<=older.variantCount)throw Error('Retirement date/count check failed: '+id);
 const variants=new Set(newer.variants.map(v=>v.id));
 if(!older.variants.every(v=>variants.has(v.id)))throw Error('Replacement lacks original variant: '+id);
 return {id,replacement,oldTrait:older.trait,newTrait:newer.trait,oldDate:older.publication.date_publication,newDate:newer.publication.date_publication,oldCount:older.variantCount,newCount:newer.variantCount,replacementDefinitionSha256:createHash('sha256').update(JSON.stringify(newer)).digest('hex')};
});
const archive=new URL('docs/retired-score-definitions-2026-10-01.json',root);
if(await access(archive).then(()=>true,()=>false))throw Error('Retirement archive already exists; refusing overwrite');
await writeFile(archive,JSON.stringify({retiredAt:new Date().toISOString(),rule:'Same or equivalent condition, strictly later publication date, strictly more variants, and every older variant included. More variants do not establish improved predictive accuracy.',retirements,artifacts:loaded.map(({file,value})=>({file,version:value.version,models:(Array.isArray(value)?value:value.models).filter(m=>ids.has(m.id))}))},null,2)+'\n');
for(const entry of loaded){
 if(Array.isArray(entry.value))entry.value=entry.value.filter(m=>!ids.has(m.id));
 else entry.value.models=entry.value.models.filter(m=>!ids.has(m.id));
 if(entry.file.endsWith('/pgs-library.json')){entry.value.version='1.69.0';entry.value.retirements=retirements;validatePGSLibrary(entry.value);}
 await writeFile(new URL(entry.file,root),JSON.stringify(entry.value,null,2)+'\n');
}
console.log(JSON.stringify({retirements,activeModels:library.models.length}));
