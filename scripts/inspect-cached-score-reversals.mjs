// Read-only public-cache investigation; never repairs or admits a scoring term.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseScoringFile,preflightHarmonizedRows,verifyHarmonizedRow} from './import-pgs-library.mjs';
import {harmonizeModelAlleles} from '../public/allele-harmonization.js';
import {verifyAssemblyReversal} from './verify-assembly-reversal.mjs';
const [id,output]=process.argv.slice(2);if(!/^PGS\d{6}$/.test(id)||!output)throw Error('Supply score ID and audit output');
const cache=new URL('../work/pgs-source/',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const originalBytes=await readFile(new URL(id+'.txt.gz',cache)),original=parseScoringFile(gunzipSync(originalBytes).toString()),builds={},references={};
for(const b of ['GRCh37','GRCh38']){
 builds[b]=preflightHarmonizedRows(original,parseScoringFile(gunzipSync(await readFile(new URL(id+'_'+b+'.txt.gz',cache))).toString()),b);references[b]={};
 for(const f of (await readdir(cache)).filter(f=>f.startsWith('pgs-ensembl-'+b+'-')))Object.assign(references[b],JSON.parse(await readFile(new URL(f,cache))));
}
const reversals=[],mappingFailures=[];
for(const row of original.rows){
 const mappings={},orientations={};
 let failed=false;
 for(const b of ['GRCh37','GRCh38']){try{const h=builds[b].get(row.rsID),raw=references[b][verifyHarmonizedRow(row,h)];const hits=raw?.mappings?.filter(m=>m.assembly_name===b&&m.strand===1&&m.seq_region_name===h.hm_chr&&m.start===Number(h.hm_pos)&&m.start===m.end);if(hits?.length!==1)throw Error('Cache mapping missing or ambiguous');const m=hits[0];mappings[b]={chrom:m.seq_region_name,position:m.start,ref:m.allele_string.split('/')[0],alleles:m.allele_string.split('/').filter(a=>/^[ACGT]$/.test(a))};orientations[b]=harmonizeModelAlleles(row.effect_allele,row.other_allele,mappings[b].alleles);}catch(e){mappingFailures.push({id:row.rsID,build:b,reason:e.message});failed=true;}}
 if(failed)continue;
 if(JSON.stringify(orientations.GRCh37)===JSON.stringify(orientations.GRCh38))continue;
 const entry={id:row.rsID,mappings,orientations,sources:[]};
 try{entry.evidence=await verifyAssemblyReversal(row.rsID,mappings,async(url,name)=>{const bytes=await readFile(new URL(name,cache));const source={url,sha256:sha(bytes)};entry.sources.push(source);return {...source,bytes};});entry.status='strict proof passes';}
 catch(e){entry.status='not verified';entry.reason=e.message;}
 reversals.push(entry);
}
const audit={id,originalSha256:sha(originalBytes),scope:'Cached public evidence only, no admission or repair; mapping failures may reflect cache limitations',mappingFailures,reversals};await writeFile(output,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
