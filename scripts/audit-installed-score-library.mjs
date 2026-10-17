// Read-only cross-artifact audit of the complete installed score inventory.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePGSLibrary} from '../public/pgs.js';
import {validateExpansionReferences} from './validate-expansion-references.mjs';
import {validateExpansionPopulations} from './validate-expansion-populations.mjs';
import {verifyExpansionEvaluationEvidence} from './validate-expansion-evaluations.mjs';
const root=new URL('../',import.meta.url),fingerprints={};
async function read(name){const bytes=await readFile(new URL(name,root));fingerprints[name]=createHash('sha256').update(bytes).digest('hex');return JSON.parse(bytes);}
const library=validatePGSLibrary(await read('public/data/pgs-library.json'));
const populations=await read('public/data/pgs-populations.json');
validateExpansionPopulations(populations,library);
const reference=await read('public/data/pgs-score-reference.json'),sensitivity=await read('public/data/pgs-score-sensitivity.json');
validateExpansionReferences(reference,sensitivity,library);
const evaluations=await read('public/data/pgs-evaluation.json');
await verifyExpansionEvaluationEvidence(evaluations,library,root);
const selection=await read('scripts/pgs-selection.json');
if(JSON.stringify(selection.map(m=>[m.id,m.count]))!==JSON.stringify(library.models.map(m=>[m.id,m.variantCount])))throw Error('Active import selection differs from installed complete models');
const result={checkedAt:new Date().toISOString(),version:library.version,models:library.models.length,terms:library.models.reduce((s,m)=>s+m.variants.length,0),targets:library.targets.length,evaluations:evaluations.models.reduce((s,m)=>s+m.evaluations.length,0),exactReferences:reference.models.filter(m=>m.status==='Available').length,sensitivityReferences:sensitivity.models.filter(m=>m.status==='Available').length,fingerprints};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
