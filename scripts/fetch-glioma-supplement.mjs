// Public publisher attachment; no credentials, alternate accounts or access bypass.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const out=new URL('../work/glioma-table-evidence/',import.meta.url),url='https://onlinelibrary.wiley.com/action/downloadSupplement?doi=10.1002/ijc.33176&file=ijc33176-sup-0001-TableS1.pdf';await mkdir(out,{recursive:true});
let result={url,status:'unavailable'};
try{let bytes;try{bytes=await readFile(new URL('table-s1.pdf',out));}catch(e){if(e.code!=='ENOENT')throw e;const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>5000000||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Not a bounded PDF');await writeFile(new URL('table-s1.pdf',out),bytes,{flag:'wx'});}
 result={...result,status:'downloaded',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}catch(e){result.error=e.message;}
await writeFile(new URL('audit.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
