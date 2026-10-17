// Synthetic source assignments by chromosome; no haplotypes, LD or genealogy.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateAncestry,validateAncestryReference} from '../public/ancestry.js';
const [output,reference,...extra]=process.argv.slice(2);
if(!output||extra.length)throw Error('Usage: node scripts/challenge-ancestry-chromosome-mixtures.mjs output.json [reference.json]');
const installedReference=fileURLToPath(new URL('../public/data/ancestry-reference.json',import.meta.url));
if([installedReference,reference].filter(Boolean).some(path=>resolve(path).toLowerCase()===resolve(output).toLowerCase()))throw Error('Challenge output must not replace a reference panel');
const bytes=await readFile(reference??new URL('../public/data/ancestry-reference.json',import.meta.url)),panel=validateAncestryReference(JSON.parse(bytes));
const codes=panel.groups.map(g=>g.code),seed=0x4c6f6361,replicates=10;let state=seed;
function random(){state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
const patterns=[{label:'second source on chromosome 1',chromosomes:['1']},{label:'second source on chromosomes 1–11',chromosomes:Array.from({length:11},(_,i)=>String(i+1))},{label:'second source on all autosomes',chromosomes:Array.from({length:22},(_,i)=>String(i+1))}];
const results=[];
for(const [a,b]of [['EUR','MENA'],['EUR','SAS'],['EUR','AFR'],['EAS','IAM'],['EAS','OCE']])for(const pattern of patterns){
 const selected=new Set(pattern.chromosomes),aIndex=codes.indexOf(a),bIndex=codes.indexOf(b);
 const assignedShare=panel.markers.filter(m=>selected.has(m.mappings.GRCh38.chrom)).length/(2*panel.markers.length);
 const assignedMarkerShares=codes.map(c=>c===a?1-assignedShare:c===b?assignedShare:0),runs=[];let worstCase=null;
 for(let replicate=0;replicate<replicates;replicate++){
  const input={build:'GRCh38',format:'VCF',results:panel.markers.map(m=>({id:m.id,status:'Called',alleles:[aIndex,selected.has(m.mappings.GRCh38.chrom)?bIndex:aIndex].map(i=>random()<m.frequencies[i]?m.alt:m.mappings.GRCh38.ref)}))};
  const fit=estimateAncestry(input,panel),rows=fit.status==='Estimated'?codes.map(c=>fit.groups.find(g=>g.code===c)):[];
  const run={replicate,status:fit.status,reason:fit.reason,residual:fit.residual??null,fractions:rows.map(g=>g.fraction),maximumAssignedShareDifference:rows.length?Math.max(...rows.map((g,i)=>Math.abs(g.fraction-assignedMarkerShares[i]))):null,allRangesContainAssignedShares:rows.length?rows.every((g,i)=>g.sensitivityLow<=assignedMarkerShares[i]+1e-12&&g.sensitivityHigh>=assignedMarkerShares[i]-1e-12):null};
  runs.push(run);if(rows.length&&(!worstCase||run.maximumAssignedShareDifference>worstCase.maximumAssignedShareDifference))worstCase={...run,dosages:input.results.map((r,i)=>r.alleles.filter(allele=>allele===panel.markers[i].alt).length)};
 }
 const passing=runs.filter(r=>r.status==='Estimated');
 results.push({label:a+'/'+b+' · '+pattern.label,firstSource:a,secondSource:b,chromosomes:pattern.chromosomes,assignedMarkerShares,runs,worstCase,summary:{replicates,passing:passing.length,maximumAssignedShareDifference:passing.length?Math.max(...passing.map(r=>r.maximumAssignedShareDifference)):null,allRangesContainAssignedShares:passing.filter(r=>r.allRangesContainAssignedShares).length}});
 console.log(JSON.stringify({label:results.at(-1).label,...results.at(-1).summary}));
}
await writeFile(output,JSON.stringify({kind:'synthetic-ancestry-chromosome-mixtures',version:1,seed,randomGenerator:'Mulberry32',replicates,codes,referenceSha256:createHash('sha256').update(bytes).digest('hex'),method:panel.method,limitations:['One allele at every marker uses the first aggregate source; the second uses the selected chromosome source. Alleles remain independent within each chromosome.','Source-assigned marker shares are not genome-length fractions, genealogical truth or a known constant mixture parameter for this heterogeneous experiment. Differences are descriptive, not calibrated estimation errors.','No phased haplotypes, linkage disequilibrium, local ancestry inference, missingness, sequencing error or independent population validation.','Chromosome deletion ranges are sensitivity summaries, not confidence intervals.'],results},null,2)+'\n');
