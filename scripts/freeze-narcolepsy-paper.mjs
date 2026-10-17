// Primary PDF evidence for table review only; no score admission.
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://cdn.amegroups.cn/journals/amepc/files/journals/16/articles/34291/public/34291-PB10-7819-R3.pdf',dest=new URL('../work/pgs-source/PGS000756-methods.pdf',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Primary PDF HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(!b.subarray(0,5).equals(Buffer.from('%PDF-'))||b.length>10000000)throw Error('Invalid primary PDF');
await writeFile(dest,b,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(dest))!==hash(b))throw Error('Frozen primary PDF changed');});console.log(JSON.stringify({url,sha256:hash(b)}));
