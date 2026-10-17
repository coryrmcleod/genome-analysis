// Independent assembly-converter audit only; no scoring-file annotation or repair.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=new URL('../work/gad-assembly-mapper/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});const audit=[];
for(const [from,to,position,expected] of [['GRCh38','GRCh37',39907575,40413482],['GRCh37','GRCh38',40413482,39907575]])for(const flank of [0,100]){
 const url=`https://rest.ensembl.org/map/human/${from}/19:${position-flank}..${position+flank}:1/${to}?content-type=application/json`;
 const row={from,to,position,expected,flank,url};
 try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>1000000)throw Error('Oversize mapper reply');row.sha256=hash(bytes);row.data=JSON.parse(bytes);
 const dest=new URL(from+'-'+flank+'-'+row.sha256+'.json',out);await writeFile(dest,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(dest))!==row.sha256)throw Error('Frozen mapping evidence changed');});
 row.status='retrieved; interpret all primary and alternate mappings';
 }catch(e){row.status='unavailable';row.reason=e.message;}
 audit.push(row);await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(row));
}
