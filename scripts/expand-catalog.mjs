import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {candidates} from './expansion-candidates.mjs';
import {seeds} from './catalog-seeds.mjs';
import {getJSON,pubmedSummaries,searchPubMed} from './reference-api.mjs';
import {validateCatalog} from '../public/catalog.js';
const output=new URL('../public/data/catalog.json',import.meta.url);
export function mapping(raw,build){
  const options=(raw.mappings||[]).filter(m=>m.assembly_name===build&&m.strand===1&&/^(?:[1-9]|1\d|2[0-2])$/.test(m.seq_region_name)&&m.start===m.end);
  if(options.length!==1)throw Error(`No unambiguous autosomal SNV mapping in ${build}`);
  const m=options[0],alleles=m.allele_string.split('/');if(alleles.some(a=>!/^[ACGT]$/.test(a)))throw Error('Non-SNV alleles');
  return {chrom:m.seq_region_name,position:m.start,ref:alleles[0],alleles};
}
export function eligibleAssociations(raw,id,mappings){
  return (raw.phenotypes||[]).filter(p=>p.source==='NHGRI-EBI GWAS catalog'&&p.variants===id&&/^PMID:\d+$/.test(p.study||'')&&/^[ACGT]$/.test(p.risk_allele||'')&&Object.values(mappings).every(m=>m.alleles.includes(p.risk_allele))&&Number(p.pvalue)>0&&Number(p.pvalue)<=5e-8&&typeof p.trait==='string'&&p.trait.length<350)
    .sort((a,b)=>Number(a.pvalue)-Number(b.pvalue)||a.study.localeCompare(b.study)||a.trait.localeCompare(b.trait));
}
export function frequencyFor(raw,allele){
  const population=(raw.populations||[]).filter(p=>p.population==='1000GENOMES:phase_3:EUR');
  const hits=population.filter(p=>p.allele===allele);if(hits.length!==1)return null;
  const hit=hits[0];if(!Number.isFinite(hit.frequency)||hit.frequency<0||hit.frequency>1)return null;
  const total=population.every(p=>Number.isInteger(p.allele_count))?population.reduce((sum,p)=>sum+p.allele_count,0):null;
  if(total&&Math.abs(hit.allele_count/total-hit.frequency)>1e-6)throw Error('Frequency count disagreement');
  return {value:hit.frequency,allele,alleleCount:hit.allele_count??null,alleleNumber:total,population:'1000 Genomes Phase 3 — EUR',dataset:'1000GENOMES:phase_3:EUR'};
}
function category(trait){return /cognit|alzheimer|memory|intelligence/i.test(trait)?'Cognition':/vitamin|folate|iron|ferritin|calcium/i.test(trait)?'Nutrition':/diabet|glucose|insulin|lipid|cholester|triglyceride|body mass|weight|protein|albumin|hba1c|fatty acid|docosahexaenoic|phosphatidyl|choline|metabolic syndrome/i.test(trait)?'Metabolic':'Health';}
const usableGene=value=>typeof value==='string'&&value.trim()&&!/^(?:NA|N\/A|NR|none|unknown|intergenic|-)$/i.test(value.trim())?value.trim():null;
async function main(){
  const base=validateCatalog(JSON.parse(await readFile(output,'utf8')));
  const originalIds=new Set(seeds.map(r=>r.id));
  const records=base.records.filter(r=>originalIds.has(r.id)).map(r=>({...r,referenceRetrievedAt:r.referenceRetrievedAt||base.retrievedAt,reviewStatus:'Editorially reviewed starter entry'}));
  const audit={startedAt:new Date().toISOString(),target:100,accepted:[],skipped:[],method:'Candidate rsIDs → exact single-variant GWAS association at p ≤ 5e-8 → two-build allele validation → PubMed bibliographic verification. Not clinical curation.'};
  for(const id of candidates){
    if(records.length>=100)break;if(originalIds.has(id))continue;
    try{
      const urls=[`https://rest.ensembl.org/variation/human/${id}?content-type=application/json;pops=1;phenotypes=1`,`https://grch37.rest.ensembl.org/variation/human/${id}?content-type=application/json`];
      const raw=await getJSON(urls[0]);if(raw.name!==id)throw Error('Merged or changed rsID requires review');
      const current=mapping(raw,'GRCh38');
      // Avoid the second mapping request for candidates with no qualifying associations.
      if(!eligibleAssociations(raw,id,{GRCh38:current}).length)throw Error('No qualifying exact-variant GWAS association');
      const old=await getJSON(urls[1]);if(old.name!==id)throw Error('Build-specific rsID identity disagreement');
      const mappings={GRCh38:current,GRCh37:mapping(old,'GRCh37')};
      const associations=eligibleAssociations(raw,id,mappings);if(!associations.length)throw Error('Association allele missing in one assembly');
      const selected=associations[0],allele=selected.risk_allele,pmid=selected.study.slice(5);
      const publication=(await pubmedSummaries([pmid]))[pmid];
      if(publication.publicationTypes.some(t=>/retract|expression of concern/i.test(t)))throw Error('Publication is flagged for retraction/concern');
      const gene=usableGene(selected.genes)||associations.map(p=>usableGene(p.genes)).find(Boolean)||`Locus ${current.chrom}:${current.position}`;
      records.push({id,gene,label:'GWAS research association',category:category(selected.trait),trait:selected.trait,effectAllele:allele,priority:1,evidence:'Research association',reviewStatus:'API-linked; scientific review pending',
        summary:`The GWAS Catalog, via Ensembl, links this variant to ${selected.trait}. Allele ${allele} is the reported association allele for the linked study. This is a population association, not a causal or clinical classification.`,
        caution:'Automated evidence linkage has not been independently reviewed. The reported allele may increase or decrease the measured trait; it is not necessarily harmful. A p-value does not measure effect size. Study ancestry, replication, linkage disequilibrium, and clinical usefulness require review. Do not infer a personal risk or cognitive ability from this entry.',
        mappings,frequency:frequencyFor(raw,allele),referenceRetrievedAt:raw.referenceFetchedAt,referenceSources:urls,literature:[publication],
        association:{source:selected.source,trait:selected.trait,reportedAllele:allele,pvalue:selected.pvalue,reportedEffect:selected.beta_coefficient||null,pmid,alleleHarmonization:'API-reported allele matches both reference mappings; independent study-strand harmonization pending',studyAncestry:'Not retrieved; EUR frequency does not imply European study ancestry',selection:'Smallest reported p-value among eligible records; not a ranking of effect size or clinical importance'},
        sources:[{label:`PubMed ${pmid}: ${publication.title}`,url:publication.url},{label:'GWAS Catalog variant associations',url:`https://www.ebi.ac.uk/gwas/variants/${id}`}]
      });audit.accepted.push({id,pmid,trait:selected.trait});console.log(`${records.length}/100 ${id}: ${selected.trait}`);
    }catch(e){audit.skipped.push({id,reason:e.message});console.log(`Skipped ${id}: ${e.message}`);}
  }
  // PubMed search adds reading leads for the original panel; search hits never upgrade evidence.
  for(const record of records.filter(r=>originalIds.has(r.id))){
    const ids=await searchPubMed(record.id);const summaries=await pubmedSummaries(ids);record.literature=ids.map(id=>({...summaries[id],relationship:'rsID search result; relevance not independently reviewed'}));
  }
  audit.completedAt=new Date().toISOString();await mkdir(new URL('../work/',import.meta.url),{recursive:true});
  await writeFile(new URL('../work/catalog-expansion-audit.json',import.meta.url),JSON.stringify(audit,null,2));
  if(records.length!==100)throw Error(`Only ${records.length} eligible variants. Existing catalog preserved; see work/catalog-expansion-audit.json.`);
  const data={...base,version:'0.2.0',retrievedAt:audit.completedAt,scope:'100-variant research panel: 15 editorial starter entries and 85 API-linked GWAS associations pending scientific review. Not comprehensive clinical annotation.',expansion:{...audit,skipped:undefined,accepted:undefined,originalCount:15,researchCount:85,apiCache:'Public reference responses cached locally for 24 hours; use --fresh to bypass.'},records};
  validateCatalog(data);await writeFile(new URL('catalog.previous.json',output),JSON.stringify(base,null,2)+'\n');
  const temp=new URL('catalog.next.json',output);await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,output);
  console.log('Published 100 validated reference records. No personal genome was read or transmitted.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
