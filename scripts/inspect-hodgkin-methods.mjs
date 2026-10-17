// Public methods evidence only. No scoring-file edits or score admission.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7675001/fullTextXML';
const dest=new URL('../work/pgs-source/PGS000638-methods.xml',import.meta.url);
let bytes;try{bytes=await readFile(dest);}catch(e){if(e.code!=='ENOENT')throw e;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Methods HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2000000||!bytes.toString().includes('32991828'))throw Error('Unexpected methods source');await writeFile(dest,bytes,{flag:'wx'});}
const text=bytes.toString(),at=text.indexOf('PRS Structure');
console.log(JSON.stringify({url,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,section:text.slice(at,at+6500).replace(/<[^>]+>/g,' ')}));
