import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePharmacogeneticLibrary} from '../public/pharmacogenetics.js';
const root=new URL('../',import.meta.url),cache=new URL('work/cpic-source/',root);await mkdir(cache,{recursive:true});
const genes=JSON.parse(await readFile(new URL('genes.json',cache))),locations=JSON.parse(await readFile(new URL('locations.json',cache)));
// GRCh38 primary chromosome accessions, checked independently against Ensembl coordinates.
const accessions={1:'NC_000001.11',2:'NC_000002.12',4:'NC_000004.12',6:'NC_000006.12',7:'NC_000007.14',8:'NC_000008.11',10:'NC_000010.11',12:'NC_000012.12',13:'NC_000013.11',16:'NC_000016.10',19:'NC_000019.10',22:'NC_000022.11'};
const candidates=locations.filter(l=>/^g\.\d+[ACGT]>[ACGT]$/.test(l.chromosomelocation||'')&&/^rs\d+$/.test(l.dbsnpid||''));
const ids=[...new Set(candidates.map(l=>l.dbsnpid))].sort(),references={GRCh37:{},GRCh38:{}},jobs=[],provenance=[];
for(const build of ['GRCh37','GRCh38'])for(let i=0;i<ids.length;i+=100)jobs.push({build,ids:ids.slice(i,i+100)});
let next=0;async function worker(){while(next<jobs.length){const job=jobs[next++],key=createHash('sha256').update(JSON.stringify(job.ids)).digest('hex').slice(0,16),file=new URL(`ensembl-${job.build}-${key}.json`,cache),host=job.build==='GRCh38'?'rest.ensembl.org':'grch37.rest.ensembl.org';let bytes;
 try{bytes=await readFile(file);}catch{const r=await fetch(`https://${host}/variation/human`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({ids:job.ids}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Ensembl '+r.status);bytes=Buffer.from(await r.arrayBuffer());await writeFile(file,bytes);}
 Object.assign(references[job.build],JSON.parse(bytes));provenance.push({build:job.build,sha256:createHash('sha256').update(bytes).digest('hex')});console.log('Verified public reference batch',job.build,job.ids.length);
}}
await Promise.all(Array.from({length:3},worker));
const records=[],excluded=[],seen=new Set();
for(const l of candidates){try{
 const gene=genes.find(g=>g.symbol===l.genesymbol),h=l.chromosomelocation.match(/^g\.(\d+)([ACGT])>([ACGT])$/),chrom=gene?.chr.replace(/^chr/,'');
 if(!gene||gene.chromosequenceid!==accessions[chrom]||Number(h[1])!==l.position||h[2]===h[3]||seen.has(l.dbsnpid))throw Error('Ambiguous source accession, coordinate, or duplicate rsID');
 const mappings={};for(const build of ['GRCh37','GRCh38']){const raw=references[build][l.dbsnpid],hits=raw?.mappings?.filter(m=>m.assembly_name===build&&m.strand===1&&m.seq_region_name===chrom&&m.start===m.end);
  if(raw?.name!==l.dbsnpid||hits?.length!==1)throw Error('Unverified independent mapping');const m=hits[0],alleles=m.allele_string.split('/');
  if(alleles[0]!==h[2]||!alleles.includes(h[3])||alleles.some(a=>!/^[ACGT]$/.test(a))||build==='GRCh38'&&m.start!==l.position)throw Error('Source/reference allele or coordinate mismatch');mappings[build]={chrom,position:m.start,ref:h[2],alleles};
 }
 const sourceURL=`https://api.cpicpgx.org/v1/sequence_location?id=eq.${l.id}`,geneResourceURL=gene.url||`https://api.cpicpgx.org/v1/gene?symbol=eq.${encodeURIComponent(l.genesymbol)}`;
 records.push({id:l.dbsnpid,gene:l.genesymbol,label:'CPIC variant component',trait:'Pharmacogenetic context: '+l.genesymbol,category:'Pharmacogenetic context',priority:2,evidence:'CPIC allele-definition component',effectAllele:h[3],frequency:null,mappings,
  summary:'This SNP is represented in CPIC allele-definition data. Its presence alone does not identify a complete star allele, enzyme phenotype, or medication response.',
  caution:'CPIC definitions describe combinations of variants. Phase, additional variants, gene deletions, duplications and hybrids can change interpretation. This component lookup does not recommend medication or dose changes; it is not a complete pharmacogenetic test.',
  pharmacogenetics:{source:'CPIC',gene:l.genesymbol,locationId:l.id,locationVersion:l.version,chromosomalHGVS:l.chromosomelocation,chromosomeSequence:gene.chromosequenceid,geneHGVS:l.genelocation,proteinHGVS:l.proteinlocation,sourceName:l.name,sourceURL,geneURL:geneResourceURL,sourceGeneURL:gene.url,role:'Sequence component only; no haplotype or phenotype assigned'},
  sources:[{label:'CPIC '+l.genesymbol+' reference resources',url:geneResourceURL},{label:'Exact CPIC sequence-location record',url:sourceURL}]});seen.add(l.dbsnpid);
 }catch(e){excluded.push({id:l.dbsnpid,locationId:l.id,reason:e.message});}}
const sourceDownloads=JSON.parse(await readFile(new URL('download-provenance.json',cache)));const sourceHashes={};for(const file of ['genes.json','locations.json'])sourceHashes[file]=createHash('sha256').update(await readFile(new URL(file,cache))).digest('hex');
const library={version:'1.1.0',retrievedAt:new Date().toISOString(),source:'CPIC public API',selection:'Verified single-base allele-definition components in 14 selected pharmacogenes. Repeat lengths, HLA types and complete haplotypes are not assigned. Not a complete pharmacogenetic assay or functional classification.',sourceHashes,sourceDownloads,referenceProvenance:provenance,records};
validatePharmacogeneticLibrary(library);await writeFile(new URL('public/data/cpic-library.next.json',root),JSON.stringify(library,null,2)+'\n');await rename(new URL('public/data/cpic-library.next.json',root),new URL('public/data/cpic-library.json',root));
await writeFile(new URL('audit.json',cache),JSON.stringify({included:records.length,excluded,excludedNonSNVorMissingID:locations.length-candidates.length},null,2));console.log(JSON.stringify({included:records.length,excluded:excluded.length,genes:[...new Set(records.map(r=>r.gene))]}));
