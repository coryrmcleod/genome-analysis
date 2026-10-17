// Evidence-only diagnostic. Does not parse/admit a model, score a genome or publish.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../work/adhd-indel-evidence/',import.meta.url),cache=new URL('../work/pgs-source/',import.meta.url);
await mkdir(root,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const id='PGS003753',term='rs11290954',meta=JSON.parse(await readFile(new URL(id+'.json',cache)));
if(meta.id!==id)throw Error('Wrong public metadata');
function rows(bytes){const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),cols=lines.shift().split('\t');return lines.map(l=>{const values=l.split('\t');if(values.length!==cols.length)throw Error('Malformed evidence row');return Object.fromEntries(cols.map((k,i)=>[k,values[i]]));});}
const originalBytes=await readFile(new URL(id+'.txt.gz',cache)),original=rows(originalBytes),byId=new Map(original.map(r=>[r.rsID,r]));
if(original.length!==35445||byId.size!==35445)throw Error('Unexpected original inventory');
const audit={id,mode:'Evidence only; no model admission',originalSha256:sha(originalBytes),term:byId.get(term),builds:{}};
async function get(url,name){const u=new URL(url);if(u.protocol!=='https:'||!['ftp.ebi.ac.uk','rest.ensembl.org','grch37.rest.ensembl.org'].includes(u.hostname))throw Error('Unexpected public host');const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('Public evidence HTTP '+r.status);const bytes=Buffer.from(await r.arrayBuffer());await writeFile(new URL(name,root),bytes);return {url,sha256:sha(bytes),bytes};}
for(const build of ['GRCh37','GRCh38']){
 const h=await get(meta.ftp_harmonized_scoring_files[build].positions,id+'_'+build+'.txt.gz'),harmonized=rows(h.bytes);
 const failures=harmonized.filter(r=>r.hm_match_chr==='False'||r.hm_match_pos==='False'||!/^(?:[1-9]|1\d|2[0-2])$/.test(r.hm_chr)||!/^[1-9]\d*$/.test(r.hm_pos)||!byId.has(r.rsID)||Number(r.effect_weight)!==Number(byId.get(r.rsID)?.effect_weight)||r.effect_allele!==byId.get(r.rsID)?.effect_allele||r.other_allele!==byId.get(r.rsID)?.other_allele);
 const host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org',v=await get(`https://${host}/variation/human/${term}?content-type=application/json`,term+'-'+build+'-variation.json'),variation=JSON.parse(v.bytes);
 const maps=variation.mappings?.filter(m=>m.assembly_name===build&&m.seq_region_name==='11'&&m.strand===1);
 const result={harmonized:{url:h.url,sha256:h.sha256},rowCount:harmonized.length,uniqueIds:new Set(harmonized.map(r=>r.rsID)).size,failures,term:harmonized.find(r=>r.rsID===term),variation:{url:v.url,sha256:v.sha256},canonicalName:variation.name,mappings:maps};
 if(variation.name===term&&maps?.length===1&&maps[0].start===maps[0].end){const m=maps[0],f=await get(`https://${host}/sequence/region/human/11:${m.start-100}..${m.end+100}:1?content-type=application/json`,term+'-'+build+'-sequence.json');result.sequence={url:f.url,sha256:f.sha256,...JSON.parse(f.bytes)};}
 audit.builds[build]=result;await writeFile(new URL('audit.json',root),JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({build,rows:result.rowCount,uniqueIds:result.uniqueIds,failures:failures.length,examples:failures.slice(0,3),term:result.term,mappings:maps,flanks:result.sequence?.seq}));
}
