// Public primary-paper evidence only; no proxy or unweighted-model exception.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url='https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7048986/fullTextXML',dest=new URL('../work/pgs-source/PGS000756-methods.xml',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Public article HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer()),text=b.toString();if(!text.includes('32175396')||!text.includes('GRS3'))throw Error('Wrong primary source');
await writeFile(dest,b,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(dest))!==hash(b))throw Error('Frozen article changed');});
console.log(JSON.stringify({url,sha256:hash(b)}));
for(const table of text.matchAll(/<table-wrap\b[\s\S]*?<\/table-wrap>/g))if(/Table [12]</.test(table[0]))console.log(table[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' '));
