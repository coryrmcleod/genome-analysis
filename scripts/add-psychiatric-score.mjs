// Admit a complete published psychiatric model without refreshing unrelated scores.
import {readFile,writeFile,rename,copyFile,mkdir} from 'node:fs/promises';
import {importLibrary} from './import-pgs-library.mjs';
import {validatePGSLibrary} from '../public/pgs.js';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root)));
const candidate={id:'PGS003442',family:'Major depressive disorder',count:8,allowEffectOnly:true,coverageContext:'Eight-variant research score using depression GWAS PMID 30718901, evaluated in a study of childhood cognition and brain correlates (PMID 36653486). This does not establish diagnostic prediction of depression. Evaluation ancestry is not reported. Kept separate from the other depression models; effect-only allele ambiguity is not silently resolved.'};
const before=await read('public/data/pgs-library.json');
if(before.models.some(m=>m.id===candidate.id))throw Error('Score already installed');
const addition=await importLibrary({selection:[candidate],publish:false});
const targets=new Map(before.targets.map(t=>[t.id,t]));
for(const t of addition.targets){const old=targets.get(t.id);if(old&&JSON.stringify(old.mappings)!==JSON.stringify(t.mappings))throw Error('Existing target mapping changed: '+t.id);if(!old)targets.set(t.id,t);}
const combined=validatePGSLibrary({...before,version:'1.8.0',retrievedAt:new Date().toISOString(),models:[...before.models,...addition.models],targets:[...targets.values()],referenceSources:Object.fromEntries(['GRCh37','GRCh38'].map(b=>[b,[...before.referenceSources[b],...addition.referenceSources[b]]]))});
await mkdir(new URL('work/psychiatric-expansion/',root),{recursive:true});
await writeFile(new URL('work/psychiatric-expansion/before-library.json',root),JSON.stringify(before));
const selection=await read('scripts/pgs-selection.json');selection.push(candidate);
await copyFile(new URL('work/pgs-source/'+candidate.id+'.txt.gz',root),new URL('test/fixtures/pgs/'+candidate.id+'.txt.gz',root));
await writeFile(new URL('scripts/pgs-selection.json',root),JSON.stringify(selection,null,2)+'\n');
await writeFile(new URL('public/data/pgs-library.next.json',root),JSON.stringify(combined,null,2)+'\n');
await rename(new URL('public/data/pgs-library.next.json',root),new URL('public/data/pgs-library.json',root));
console.log(JSON.stringify({models:combined.models.length,targets:combined.targets.length,added:candidate.id}));
