// Publish an already assembled expansion only with matching rebuilt references.
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePGSLibrary} from '../public/pgs.js';
import {validateScoreReference} from '../public/pgs-reference.js';
import {validateSensitivityReference} from '../public/pgs-sensitivity.js';
import {validateExpansionPopulations} from './validate-expansion-populations.mjs';
import {freezePGSEvidence} from './freeze-pgs-evidence.mjs';
import {freezePGSMappings} from './freeze-pgs-mappings.mjs';
import {validateExpansionReferences} from './validate-expansion-references.mjs';
import {validateExpansionEvaluations,verifyExpansionEvaluationEvidence} from './validate-expansion-evaluations.mjs';
import {verifyLibrarySourceDefinitions} from './pgs-source-definition-exclusions.mjs';
const stage=process.argv[2];if(!stage)throw Error('Supply completed staging directory');
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const base=await read(stage+'/base.json'),oldBytes=await readFile(new URL('public/data/pgs-library.json',root));
if(hash(oldBytes)!==base.librarySha256)throw Error('Installed library changed since staging');
const library=validatePGSLibrary(await read(stage+'/pgs-library.json')),selection=await read(stage+'/selection.json');
verifyLibrarySourceDefinitions(library);
validateExpansionPopulations(await read(stage+'/pgs-populations.json'),library);
const reference=validateScoreReference(await read(stage+'/pgs-score-reference.json')),sensitivity=validateSensitivityReference(await read(stage+'/pgs-score-sensitivity.json'));
if(JSON.stringify(selection.map(m=>[m.id,m.count]))!==JSON.stringify(library.models.map(m=>[m.id,m.variantCount])))throw Error('Selection/model mismatch');
validateExpansionReferences(reference,sensitivity,library);
const evaluations=validateExpansionEvaluations(await read(stage+'/pgs-evaluation.json'),library);
const previous=JSON.parse(oldBytes),added=library.models.filter(m=>!previous.models.some(p=>p.id===m.id));
for(const m of previous.models)if(JSON.stringify(m)!==JSON.stringify(library.models.find(p=>p.id===m.id)))throw Error('Expansion altered an installed model');
for(const m of added){const bytes=await readFile(new URL('work/pgs-source/'+m.id+'.txt.gz',root));if(hash(bytes)!==m.sourceFiles.original.sha256)throw Error('Original fixture hash mismatch');}
const assemblyFixtures=new Map();
for(const m of added)for(const v of m.variants.filter(v=>v.buildAlleles))for(const b of ['GRCh37','GRCh38']){
 const e=v.assemblyReversalEvidence[b];
 for(const [name,source] of [[b==='GRCh37'?'hg19ToHg38.over.chain.gz':'hg38ToHg19.over.chain.gz',e.chainSource],[`${v.id}-${b}-reversal-sequence.json`,e.sequenceSource]]){
  const bytes=await readFile(new URL('work/pgs-source/'+name,root));if(hash(bytes)!==source.sha256)throw Error('Assembly evidence fixture hash mismatch');
  assemblyFixtures.set(name,source.sha256);
 }
}
await freezePGSEvidence({models:added},new URL('work/pgs-source/',root),new URL('test/fixtures/pgs/evidence/',root));
await freezePGSMappings(library,new URL('work/pgs-source/',root),new URL('test/fixtures/pgs/mappings/',root));
await verifyExpansionEvaluationEvidence(evaluations,library,root);
await mkdir(stage+'/before-publish',{recursive:true});
const files=[['pgs-score-reference.json','public/data/pgs-score-reference.json'],['pgs-score-sensitivity.json','public/data/pgs-score-sensitivity.json'],['pgs-populations.json','public/data/pgs-populations.json'],['pgs-evaluation.json','public/data/pgs-evaluation.json'],['selection.json','scripts/pgs-selection.json'],['pgs-library.json','public/data/pgs-library.json']];
for(const [name,dest] of files){await copyFile(new URL(dest,root),stage+'/before-publish/'+name);await copyFile(stage+'/'+name,new URL(dest+'.next',root));}
for(const m of added)await copyFile(new URL('work/pgs-source/'+m.id+'.txt.gz',root),new URL('test/fixtures/pgs/'+m.id+'.txt.gz',root));
if(assemblyFixtures.size)await mkdir(new URL('test/fixtures/pgs/assembly/',root),{recursive:true});
for(const name of assemblyFixtures.keys())await copyFile(new URL('work/pgs-source/'+name,root),new URL('test/fixtures/pgs/assembly/'+name,root));
const completed=[];
try{for(const [name,dest] of files){await rename(new URL(dest+'.next',root),new URL(dest,root));completed.push([name,dest]);}}
catch(e){for(const [name,dest] of completed.reverse())await copyFile(stage+'/before-publish/'+name,new URL(dest,root));throw e;}
console.log(JSON.stringify({added:added.map(m=>m.id),models:library.models.length,targets:library.targets.length,exact:reference.models.filter(m=>m.status==='Available').length,sensitivity:sensitivity.models.filter(m=>m.status==='Available').length,backup:stage+'/before-publish'}));
