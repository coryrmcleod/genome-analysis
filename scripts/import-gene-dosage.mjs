import {readFile,writeFile,rename} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {KEY_GENES} from '../public/key-genes.js';import {DOSAGE_SOURCE,validateGeneDosage} from '../public/gene-dosage.js';
export function parseDosageSource(text,genes){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/),head=lines.findIndex(l=>l.startsWith('#Gene Symbol\t'));
 if(head<0||!lines.slice(0,head).some(l=>l.includes('Genomic Locations are reported on GRCh38 (hg38)')))throw Error('Missing dosage source build/header');
 const columns=['#Gene Symbol','Gene ID','cytoBand','Genomic Location',...['Haploinsufficiency','Triplosensitivity'].flatMap(k=>[k+' Score',k+' Description',...Array.from({length:6},(_,i)=>k+' PMID'+(i+1))]),'Date Last Evaluated','Haploinsufficiency Disease ID','Triplosensitivity Disease ID'];
 if(lines[head]!==columns.join('\t'))throw Error('Dosage TSV schema changed');
 const date=lines.find(l=>/^#\d{2} [A-Z][a-z]{2},\d{4}$/.test(l));if(!date)throw Error('Missing dosage release date');
 const stamp=Date.parse(date.slice(1).replace(',',' ')+' 00:00:00 GMT');if(!Number.isFinite(stamp))throw Error('Invalid dosage release date');
 const wanted=new Set(genes),records=[];let sourceRecordCount=0;
 for(const line of lines.slice(head+1)){if(!line)continue;const fields=line.split('\t');if(fields.length!==columns.length)throw Error('Malformed dosage TSV row');sourceRecordCount++;const [gene,ncbiGeneId,cytoband,location]=fields;if(!wanted.has(gene))continue;
  const evidence=(offset,diseaseOffset)=>({score:fields[offset],description:fields[offset+1],pmids:fields.slice(offset+2,offset+8).flatMap(v=>v.split(/\s*;\s*/)).filter(Boolean),diseaseId:fields[diseaseOffset]||null});
  records.push({gene,ncbiGeneId,cytoband,location,evaluatedAt:fields[20],haploinsufficiency:evidence(4,21),triplosensitivity:evidence(12,22),url:`https://search.clinicalgenome.org/kb/gene-dosage/${gene}`});
 }
 return {releaseDate:new Date(stamp).toISOString().slice(0,10),sourceRecordCount,records};
}
const input=process.argv[2];
if(input){const bytes=await readFile(input),parsed=parseDosageSource(bytes.toString(),KEY_GENES.flatMap(k=>k.genes));if(parsed.records.length<1)throw Error('No selected gene curations');
 const library={version:'1.0.0',retrievedAt:new Date().toISOString(),sourceURL:DOSAGE_SOURCE,sourceSha256:createHash('sha256').update(bytes).digest('hex'),build:'GRCh38',selection:'Exact symbols in the Key genes profiles; no personal copy-number analysis.',...parsed};validateGeneDosage(library);
 const next=new URL('../public/data/gene-dosage-library.next.json',import.meta.url),dest=new URL('../public/data/gene-dosage-library.json',import.meta.url);await writeFile(next,JSON.stringify(library,null,2)+'\n');await rename(next,dest);console.log(JSON.stringify({sourceRecords:parsed.sourceRecordCount,genes:new Set(parsed.records.map(r=>r.gene)).size,curations:parsed.records.length,releaseDate:parsed.releaseDate}));
}
