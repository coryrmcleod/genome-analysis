import {validatePGSLibrary} from '../public/pgs.js';
export function mergePGSLibraries(before,addition,version){
 const ids=new Set(before.models.map(m=>m.id));
 if(addition.models.some(m=>ids.has(m.id)))throw Error('Cannot replace an installed model during expansion');
 const targets=new Map(before.targets.map(t=>[t.id,t]));
 for(const t of addition.targets){const old=targets.get(t.id);if(old&&JSON.stringify(old.mappings)!==JSON.stringify(t.mappings))throw Error('Existing target mapping changed: '+t.id);if(!old)targets.set(t.id,t);}
 const referenceSources=Object.fromEntries(['GRCh37','GRCh38'].map(b=>[b,[...new Map([...before.referenceSources[b],...addition.referenceSources[b]].map(s=>[s.url+'|'+s.sha256,s])).values()]]));
 const selection='Complete published additive models with independently verified both-build mappings; any supported non-SNV term requires its exact frozen certificate. Population comparisons require compatible references and evaluation-population review. Not a ranking of predictive accuracy.';
 return validatePGSLibrary({...before,selection,version,retrievedAt:new Date().toISOString(),models:[...before.models,...addition.models],targets:[...targets.values()],referenceSources});
}
