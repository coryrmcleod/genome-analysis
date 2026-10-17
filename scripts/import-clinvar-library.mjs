// Builds a bounded gene-list library from paired public ClinVar VCF snapshots.
// Source discovery emits only public reference records, never personal genotypes.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateClinicalLibrary} from '../public/clinical.js';
const root=new URL('../',import.meta.url),cache=new URL('work/clinvar-discovery/',root);
const discovery=JSON.parse(await readFile(new URL('candidates.json',cache)));
if(discovery.dates.length!==2||discovery.dates[0]!==discovery.dates[1])throw Error('ClinVar builds have different release dates');
const grouped=new Map();for(const r of discovery.candidates){if(!grouped.has(r.id))grouped.set(r.id,[]);grouped.get(r.id).push(r);}
const ids=[...grouped.keys()].sort(),references={GRCh37:{},GRCh38:{}},jobs=[];
for(const build of ['GRCh37','GRCh38'])for(let i=0;i<ids.length;i+=100)jobs.push({build,ids:ids.slice(i,i+100)});
let index=0;const provenance=[];
async function worker(){while(index<jobs.length){const job=jobs[index++],key=createHash('sha256').update(JSON.stringify(job.ids)).digest('hex').slice(0,16),file=new URL(`ensembl-${job.build}-${key}.json`,cache);let bytes;
 try{bytes=await readFile(file);}catch{const host=job.build==='GRCh38'?'rest.ensembl.org':'grch37.rest.ensembl.org';const r=await fetch(`https://${host}/variation/human`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({ids:job.ids}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Ensembl HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());await writeFile(file,bytes);}
 Object.assign(references[job.build],JSON.parse(bytes));provenance.push({build:job.build,sha256:createHash('sha256').update(bytes).digest('hex')});if(index%10===0)console.log('Reference batches completed; dispatched',index,'/',jobs.length);
}}
await Promise.all(Array.from({length:3},worker));
const records=[],excluded=[];
for(const [id,assertions] of grouped){try{
 const first=assertions[0],mappings={};
 for(const build of ['GRCh37','GRCh38']){const m=first.mappings[build];if(assertions.some(a=>a.mappings[build].chrom!==m.chrom||a.mappings[build].position!==m.position||a.mappings[build].ref!==m.ref))throw Error('rsID maps to multiple sites');
  const raw=references[build][id],hits=raw?.mappings?.filter(x=>x.assembly_name===build&&x.strand===1&&x.seq_region_name===m.chrom&&x.start===m.position&&x.end===m.position);
  if(raw?.name!==id||hits?.length!==1)throw Error('Independent mapping not verified');const alleles=hits[0].allele_string.split('/');if(alleles[0]!==m.ref||!alleles.every(a=>/^[ACGT]$/.test(a))||assertions.some(a=>!alleles.includes(a.alt)))throw Error('Reference/allele mismatch or complex variation');mappings[build]={...m,alleles};
 }
 const clinvar=assertions.map(a=>({variationId:a.variationId,allele:a.alt,classification:a.classification,reviewStatus:a.reviewStatus,stars:a.reviewStatus==='practice_guideline'?4:3,conditions:a.conditions,conditionIdentifiers:a.conditionIdentifiers,releaseDate:discovery.dates[0],url:`https://www.ncbi.nlm.nih.gov/clinvar/variation/${a.variationId}/`,scope:'Aggregate germline classification for this allele; condition list is not a condition-specific assertion or personal diagnosis.'}));
 const genes=[...new Set(assertions.flatMap(a=>a.genes))].join(' / ');
 records.push({id,gene:genes,label:'ClinVar reviewed SNV',trait:'Inherited-condition review: '+genes,category:'ClinVar review',priority:2,evidence:'ClinVar expert-panel / guideline classification',effectAllele:first.alt,frequency:null,mappings,clinvar,
  summary:'Review the allele-specific ClinVar classifications below. Presence does not by itself establish disease or carrier status.',
  caution:'This is a selected gene-list SNV panel, not clinical screening. Indels, copy-number changes, structural variants, additional genes, inheritance, phase and penetrance are not assessed. A missing or reference call does not exclude a condition. Confirm consequential findings with a qualified clinical service.',
  sources:clinvar.map(a=>({label:`ClinVar VCV ${a.variationId}`,url:a.url}))});
 }catch(e){excluded.push({id,reason:e.message});}}
const result={version:'1.2.0',retrievedAt:new Date().toISOString(),releaseDate:discovery.dates[0],source:'ClinVar germline VCF',sourceURLs:['https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh37/clinvar.vcf.gz','https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'],selection:'All compatible autosomal expert-panel or guideline P/LP SNVs with paired builds and verified rsIDs within the selected inherited-condition gene list; not a comprehensive disease screen.',sourceHashes:discovery.sourceHashes,selectedGenes:discovery.selectedGenes,referenceProvenance:provenance,records};
validateClinicalLibrary(result);await writeFile(new URL('public/data/clinical-library.next.json',root),JSON.stringify(result,null,2)+'\n');await rename(new URL('public/data/clinical-library.next.json',root),new URL('public/data/clinical-library.json',root));await writeFile(new URL('audit.json',cache),JSON.stringify({included:records.length,excluded},null,2));console.log(JSON.stringify({included:records.length,assertions:records.reduce((n,r)=>n+r.clinvar.length,0),excluded:excluded.length}));
