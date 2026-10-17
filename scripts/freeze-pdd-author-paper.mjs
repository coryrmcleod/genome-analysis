// Freeze the author-hosted primary paper for table-level review; no score admission.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://www.scherzerlaboratory.org/pdf/20210518-SCHERZER-Author-pdf.pdf',out=new URL('../work/PGS000777-author-paper.pdf',import.meta.url);
let bytes;try{bytes=await readFile(out);}catch(e){if(e.code!=='ENOENT')throw e;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Author PDF HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>20000000||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid author PDF');await writeFile(out,bytes,{flag:'wx'});}
console.log(JSON.stringify({url,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}));
