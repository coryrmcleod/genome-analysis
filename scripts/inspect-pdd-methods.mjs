import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const url='https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8459648/fullTextXML';
const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Primary methods HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString();
if(!text.includes('33958783')||!text.includes('Polygenic hazard score'))throw Error('Unexpected primary methods document');
await fs.writeFile(new URL('../work/pdd-methods-2026-09-18.xml',import.meta.url),bytes,{flag:'wx'});
console.log(JSON.stringify({url,sha256:createHash('sha256').update(bytes).digest('hex')}));
for(const table of text.matchAll(/<table-wrap\b[\s\S]*?<\/table-wrap>/g))if(table[0].includes('0.688')||table[0].includes('Performance of different'))console.log(table[0].replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
