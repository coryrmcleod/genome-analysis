import {mkdir,writeFile} from 'node:fs/promises';
import {seeds} from './catalog-seeds.mjs';
// This legacy command only builds the original panel. Prevent accidental loss of expanded entries.
const {readFile}=await import('node:fs/promises');
const existing=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
if(existing.records.length>seeds.length)throw Error('Expanded catalog detected. Use node scripts/expand-catalog.mjs or Update Variant Library.cmd to preserve the 100-variant panel.');
const out=new URL('../public/data/',import.meta.url);
await mkdir(out,{recursive:true});
const records=[];
for(const seed of seeds){
  const mappings={};let populations=[];const urls=[];
  for(const [build,host] of [['GRCh38','rest.ensembl.org'],['GRCh37','grch37.rest.ensembl.org']]){
    const url=`https://${host}/variation/human/${seed.id}?content-type=application/json;pops=1`;
    const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw Error(`${seed.id} ${build}: HTTP ${res.status}`);
    const raw=await res.json();
    const options=raw.mappings.filter(m=>m.assembly_name===build&&m.strand===1&&/^(\d+|X|Y|MT)$/.test(m.seq_region_name)&&m.start===m.end);
    if(options.length!==1)throw Error(`Ambiguous mapping: ${seed.id} ${build}`);
    const m=options[0],alleles=m.allele_string.split('/');
    if(!alleles.includes(seed.effectAllele)||!alleles.every(a=>/^[ACGT]$/.test(a)))throw Error(`Alleles need review: ${seed.id} ${build}`);
    mappings[build]={chrom:m.seq_region_name,position:m.start,ref:alleles[0],alleles};
    if(build==='GRCh38')populations=raw.populations||[];
    urls.push(url);
  }
  const eur=populations.find(p=>p.population==='1000GENOMES:phase_3:EUR'&&p.allele===seed.effectAllele);
  const all=populations.filter(p=>p.population==='1000GENOMES:phase_3:EUR');
  const frequency=eur?{value:eur.frequency,allele:eur.allele,alleleCount:eur.allele_count,alleleNumber:all.every(p=>Number.isInteger(p.allele_count))?all.reduce((n,p)=>n+p.allele_count,0):null,population:'1000 Genomes Phase 3 — EUR',dataset:'1000GENOMES:phase_3:EUR'}:null;
  records.push({...seed,mappings,frequency,referenceSources:urls});
  console.log(`${seed.id}: GRCh37 + GRCh38, EUR ${frequency?.value??'unknown'}`);
}
const data={version:'0.1.0',retrievedAt:new Date().toISOString(),scope:'Curated SNV starter panel, not whole-genome clinical annotation',frequencyNotes:'EUR is the 1000 Genomes Phase 3 European superpopulation; it is not all Europeans, personal ancestry, or a gnomAD NFE estimate. Frequencies describe the tracked allele, not genotype frequency or disease risk.',records};
await writeFile(new URL('catalog.json',out),JSON.stringify(data,null,2)+'\n');
console.log(`Saved ${records.length} public reference records. No personal data used.`);
