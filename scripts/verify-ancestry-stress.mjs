// Compare public Python challenge fixtures with the production estimator.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateAncestryReference,estimateAncestry} from '../public/ancestry.js';
const [reference,fixturesPath,output,...extra]=process.argv.slice(2);
if(!reference||!fixturesPath||!output||extra.length)throw Error('Supply reference.json public-fixtures.json output.json');
const installed=fileURLToPath(new URL('../public/data/ancestry-reference.json',import.meta.url));
if([reference,fixturesPath,installed].some(path=>resolve(path).toLowerCase()===resolve(output).toLowerCase()))throw Error('Verification output must preserve its inputs and installed panel');
const bytes=await readFile(reference),panel=validateAncestryReference(JSON.parse(bytes)),hash=createHash('sha256').update(bytes).digest('hex');
const fixtureBytes=await readFile(fixturesPath),fixtures=JSON.parse(fixtureBytes);
if(fixtures.referenceSha256!==hash||!Array.isArray(fixtures.cases)||fixtures.cases.length!==5)throw Error('Public challenge reference or case inventory mismatch');
const checks=[];
for(const fixture of fixtures.cases){
 if(fixture.dosages.length!==panel.markers.length||fixture.dosages.some(d=>d!==null&&![0,1,2].includes(d)))throw Error('Invalid public dosage inventory');
 const result=estimateAncestry({build:'GRCh38',format:'VCF',results:panel.markers.map((marker,index)=>({id:marker.id,status:fixture.dosages[index]===null?'No call':'Called',alleles:fixture.dosages[index]===null?null:Array.from({length:2},(_,copy)=>copy<fixture.dosages[index]?marker.alt:marker.mappings.GRCh38.ref)}))},panel);
 if((result.status==='Estimated')!==fixture.expectedPassesGates)throw Error('Production gate differs: '+fixture.pattern);
 if(result.status!=='Estimated')throw Error('Worst-case fixture lacks a passing arithmetic comparison: '+fixture.pattern);
 const difference=Math.max(...panel.groups.map((group,index)=>Math.abs(result.groups.find(row=>row.code===group.code).fraction-fixture.expectedFractions[index])));
 const residualDifference=Math.abs(result.residual-fixture.expectedResidual);
 if(!Number.isFinite(difference)||difference>2e-7||!Number.isFinite(residualDifference)||residualDifference>2e-7)throw Error('Production/Python arithmetic differs: '+fixture.pattern);
 checks.push({pattern:fixture.pattern,publicSample:fixture.publicSample,coverage:result.coverage,maximumFractionDifference:difference,residualDifference,passesGates:fixture.expectedPassesGates});
}
const report={referenceSha256:hash,publicFixtureSha256:createHash('sha256').update(fixtureBytes).digest('hex'),checks};
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
