// Retained synthetic mixtures only; no personal genotypes or network requests.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateAncestry,validateAncestryReference} from '../public/ancestry.js';
const [output,...extra]=process.argv.slice(2);
if(!output||extra.length)throw Error('Supply output.json');
const referencePath=new URL('../public/data/ancestry-reference.json',import.meta.url),fixturePath=new URL('../test/fixtures/ancestry/synthetic-mixtures.json',import.meta.url);
if([referencePath,fixturePath].some(path=>resolve(fileURLToPath(path)).toLowerCase()===resolve(output).toLowerCase()))throw Error('Challenge must not replace its sources');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await readFile(referencePath),fixtureBytes=await readFile(fixturePath),panel=validateAncestryReference(JSON.parse(bytes)),fixture=JSON.parse(fixtureBytes);
if(fixture.referenceSha256!==hash(bytes)||fixture.cases.length!==36||JSON.stringify(fixture.codes)!==JSON.stringify(panel.groups.map(group=>group.code)))throw Error('Retained mixture evidence does not match reference');
const results=[];
for(const sample of fixture.cases){
 const calls={build:'GRCh38',format:'VCF',results:panel.markers.map((marker,index)=>({id:marker.id,status:sample.dosages[index]===null?'No call':'Called',alleles:sample.dosages[index]===null?null:Array.from({length:2},(_,copy)=>copy<sample.dosages[index]?marker.alt:marker.mappings.GRCh38.ref)}))};
 const fit=estimateAncestry(calls,panel);
 if(fit.status!=='Estimated')throw Error('Previously verified mixture no longer fits: '+sample.label);
 const groups=fixture.codes.map(code=>fit.groups.find(group=>group.code===code));
 if(groups.some((group,index)=>Math.abs(group.fraction-sample.expectedFractions[index])>2e-7))throw Error('Point estimate changed: '+sample.label);
 const sensitivity=fit.referenceSensitivity;
 results.push({label:sample.label,replicate:sample.replicate,truth:sample.truth,pointFractions:groups.map(group=>group.fraction),maximumAbsoluteError:Math.max(...groups.map((group,index)=>Math.abs(group.fraction-sample.truth[index]))),chromosomeRangesContainTruth:groups.every((group,index)=>group.sensitivityLow<=sample.truth[index]+1e-12&&group.sensitivityHigh>=sample.truth[index]-1e-12),templateRangesContainTruth:sensitivity.status==='Unavailable'?null:sensitivity.groups.every(group=>{const index=fixture.codes.indexOf(group.code);return group.low<=sample.truth[index]+1e-12&&group.high>=sample.truth[index]-1e-12}),referenceSensitivity:sensitivity});
}
const summary={cases:results.length,attempted:results.reduce((sum,row)=>sum+row.referenceSensitivity.attempted,0),evaluated:results.reduce((sum,row)=>sum+row.referenceSensitivity.evaluated,0),complete:results.filter(row=>row.referenceSensitivity.status==='Complete').length,chromosomeContainment:results.filter(row=>row.chromosomeRangesContainTruth).length,templateContainment:results.filter(row=>row.templateRangesContainTruth).length,maximumTemplateChange:Math.max(...results.map(row=>row.referenceSensitivity.maximumAbsoluteChange)),maximumPointError:Math.max(...results.map(row=>row.maximumAbsoluteError))};
await writeFile(output,JSON.stringify({kind:'synthetic-ancestry-template-sensitivity-challenge',version:1,referenceSha256:hash(bytes),fixturesSha256:hash(fixtureBytes),summary,limitations:['Retained independent-binomial synthetic mixtures and population-template examples; not real genealogical fractions or independent accuracy evidence.','These selected worst cases do not estimate a population coverage rate.','Both chromosome and reference-template ranges are finite perturbations, not confidence intervals. Truth containment does not calibrate either range.'],results},null,2)+'\n');
console.log(JSON.stringify(summary));
