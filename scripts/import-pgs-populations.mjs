// Public reference genotypes only. No user genotypes or files are transmitted.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
const library=JSON.parse(await readFile(process.argv[2]||new URL('../public/data/pgs-library.json',import.meta.url)));
const cache=new URL('../work/pgs-populations/',import.meta.url);await mkdir(cache,{recursive:true});
const populations=['EUR'];
async function publicJSON(url){for(let attempt=0;attempt<4;attempt++){try{const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(90000)});if(!response.ok){const error=Error('Public population API HTTP '+response.status);error.permanent=response.status>=400&&response.status<500&&response.status!==429;throw error;}return await response.json();}catch(error){if(error.permanent||attempt===3)throw error;console.log('Retrying public population request',attempt+1);await new Promise(r=>setTimeout(r,1000*2**attempt));}}}

const records={};let next=0;
async function worker(){while(next<library.targets.length){const target=library.targets[next++];const sourceURL=`https://rest.ensembl.org/variation/human/${target.id}?population_genotypes=1`;
 let j;const saved=new URL(target.id+'.json',cache);try{j=JSON.parse(await readFile(saved));}catch{
  j=await publicJSON(sourceURL);await writeFile(saved,JSON.stringify(j));
 }
 const m=target.mappings.GRCh38;
 const mappings=j.mappings?.filter(a=>a.assembly_name==='GRCh38'&&a.coord_system==='chromosome'&&a.seq_region_name===m.chrom&&a.start===m.position&&a.end===m.position&&a.strand===1);
 if(j.name!==target.id||mappings?.length!==1){records[target.id]={sourceURL,status:'Mapping not verified',populations:{}};continue;}
 const groups={};for(const pop of populations){const rows=(j.population_genotypes||[]).filter(r=>r.population===`1000GENOMES:phase_3:${pop}`);const seen=new Set();let valid=rows.length>0;
  const genotypes=rows.map(r=>{const alleles=r.genotype.split(/[|/]/).sort(),key=alleles.join('/');if(alleles.length!==2||alleles.some(a=>!m.alleles.includes(a))||seen.has(key)||!Number.isInteger(r.count)||r.count<0||!Number.isFinite(r.frequency)||r.frequency<0||r.frequency>1)valid=false;seen.add(key);return {genotype:key,count:r.count,frequency:r.frequency};});
  const sampleCount=genotypes.reduce((s,r)=>s+r.count,0);if(!sampleCount||Math.abs(genotypes.reduce((s,r)=>s+r.frequency,0)-1)>0.001||genotypes.some(r=>Math.abs(r.count/sampleCount-r.frequency)>0.001))valid=false;
  if(valid)groups[pop]={sampleCount,genotypes};
 }
 records[target.id]={sourceURL,status:'Verified public forward mapping',mapping:m,populations:groups};if(Object.keys(records).length%100===0)console.log('Population reference positions processed',Object.keys(records).length,'/',library.targets.length);
}}
await Promise.all(Array.from({length:4},worker));
const releaseResponse=await fetch('https://rest.ensembl.org/info/data',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});if(!releaseResponse.ok)throw Error('Cannot record Ensembl release');const ensemblData=await releaseResponse.json();
const result={ensemblData,version:'1.0.0',retrievedAt:new Date().toISOString(),source:'1000 Genomes Phase 3 observed genotype frequencies via Ensembl',populations,records};
const output=process.argv[3]||new URL('../public/data/pgs-populations.json',import.meta.url),temporary=process.argv[3]?process.argv[3]+'.partial':new URL('../public/data/pgs-populations.next.json',import.meta.url);
await writeFile(temporary,JSON.stringify(result,null,2)+'\n');await rename(temporary,output);
console.log(JSON.stringify({targets:Object.keys(records).length,available:Object.fromEntries(populations.map(p=>[p,Object.values(records).filter(r=>r.populations[p]).length]))}));
