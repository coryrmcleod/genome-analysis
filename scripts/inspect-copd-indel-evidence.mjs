// Public evidence only. Does not admit a score or change genotype interpretation.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const out=new URL('../work/copd-indel-evidence/',import.meta.url),cache=new URL('../work/pgs-source/',import.meta.url);
await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
async function get(url,name){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);const b=Buffer.from(await r.arrayBuffer()),sha256=hash(b);await writeFile(new URL(`${name}-${sha256}.json`,out),b);return {url,sha256,data:JSON.parse(b)};}
function rows(b){const lines=gunzipSync(b).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),keys=lines.shift().split('\t');return lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[keys[i],v])));}
const original=await readFile(new URL('PGS012564.txt.gz',cache)),source=rows(original);
if(source.length!==22||new Set(source.map(r=>r.rsID)).size!==22)throw Error('Unexpected source inventory');
const audit={id:'PGS012564',status:'Evidence only; excluded pending complete indel support',originalSha256:hash(original),term:source.find(r=>r.rsID==='rs113897301'),builds:{}};
try{
 audit.refsnp=await get('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/113897301','refsnp');
 for(const [build,host,position] of [['GRCh37','grch37.rest.ensembl.org',156929078],['GRCh38','rest.ensembl.org',157502070]]){
  const b=await readFile(new URL(`PGS012564_${build}.txt.gz`,cache));
  audit.builds[build]={harmonizedSha256:hash(b),term:rows(b).find(r=>r.rsID==='rs113897301'),variation:await get(`https://${host}/variation/human/rs113897301?content-type=application/json`,build+'-variation'),sequence:await get(`https://${host}/sequence/region/human/5:${position-100}..${position+101}:1?content-type=application/json`,build+'-sequence')};
 }
}catch(e){audit.error=e.message;}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({...audit,refsnp:audit.refsnp?{sha256:audit.refsnp.sha256,placements:audit.refsnp.data.primary_snapshot_data?.placements_with_allele}:null}));
