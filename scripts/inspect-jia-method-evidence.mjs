// Freeze a primary public methods source for review; no model admission.
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7677485/fullTextXML';
const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Primary methods HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString(),hash=b=>createHash('sha256').update(b).digest('hex');
if(!text.includes('217421')||!text.includes('SparSNP')||!text.includes('32887683'))throw Error('Unexpected primary article');
const dest=new URL('../work/pgs-source/PGS000114-methods.xml',import.meta.url);
await writeFile(dest,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(dest))!==hash(bytes))throw Error('Frozen methods changed');});
console.log(JSON.stringify({url,sha256:hash(bytes)}));
const start=text.indexOf('<title>Development and validation');console.log(text.slice(start,start+10000));
