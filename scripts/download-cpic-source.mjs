import {mkdir,writeFile} from 'node:fs/promises';
const cache=new URL('../work/cpic-source/',import.meta.url);await mkdir(cache,{recursive:true});
const genes=['DPYD','TPMT','NUDT15','CYP2C19','CYP2C9','CYP3A5','CYP2D6','SLCO1B1','ABCG2','VKORC1','CYP4F2','CYP2B6','UGT1A1','NAT2'];
const filter='in.('+genes.join(',')+')',sources=[];
async function get(url){const r=await fetch(url,{headers:{Accept:'application/json',Prefer:'count=exact'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('CPIC HTTP '+r.status);sources.push({url,contentRange:r.headers.get('content-range'),retrievedAt:new Date().toISOString()});return {rows:await r.json(),range:r.headers.get('content-range')};}
const geneData=(await get('https://api.cpicpgx.org/v1/gene?symbol='+filter+'&order=symbol')).rows;
if(JSON.stringify(geneData.map(g=>g.symbol).sort())!==JSON.stringify(genes.slice().sort()))throw Error('Selected CPIC gene metadata incomplete');
const locations=[];let total;
for(let offset=0;;offset+=500){const r=await get('https://api.cpicpgx.org/v1/sequence_location?genesymbol='+filter+'&order=id&limit=500&offset='+offset);const n=Number(r.range?.split('/')[1]);if(!Number.isSafeInteger(n))throw Error('CPIC total count unavailable');if(total!==undefined&&total!==n)throw Error('CPIC data changed during pagination');total=n;locations.push(...r.rows);if(locations.length===total)break;if(!r.rows.length||locations.length>total)throw Error('Incomplete CPIC pagination');}
if(new Set(locations.map(x=>x.id)).size!==locations.length)throw Error('Duplicate CPIC location records');
for(const [name,data] of [['genes',geneData],['locations',locations],['download-provenance',sources]])await writeFile(new URL(name+'.json',cache),JSON.stringify(data));
console.log(JSON.stringify({genes:geneData.length,locations:locations.length}));
