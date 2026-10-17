// Complete original-term inventory; bounded 171-point audit, no admission.
import {readFile,writeFile,copyFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {parseScoringFile,coordinateVariantIdentity} from './import-pgs-library.mjs';
const cache=new URL('../work/pgs-source/',import.meta.url),bytes=await readFile(new URL('PGS018695.txt.gz',cache));
if(createHash('sha256').update(bytes).digest('hex')!=='3d9caddd9b3fd1cb9c4b676bff6345dfbbe99fb93d487faf3b880619357ae55f')throw Error('Source changed');
const {rows}=parseScoringFile(gunzipSync(bytes).toString(),{allowEffectOnly:true,allowCoordinateIds:true});
const audit=[];let requests=0,transportFailures=0;
let prior=[];try{prior=JSON.parse(await readFile(new URL('../work/thyroid-coordinate-inventory.json',import.meta.url))).unresolved||[];}catch(e){if(e.code!=='ENOENT')throw e;}
const retry=process.argv.includes('--retry-transport');
if(retry){if(prior.filter(p=>p.transportError).length>5)throw Error('Retry budget exceeded');await copyFile(new URL('../work/thyroid-coordinate-inventory.json',import.meta.url),new URL('../work/thyroid-coordinate-inventory-before-retry.json',import.meta.url),1);}
for(const row of rows){
 const name=`PGS018695-GRCh38-${row.chr_name}-${row.chr_position}-identity.json`,url=`https://rest.ensembl.org/overlap/region/human/${row.chr_name}:${row.chr_position}-${row.chr_position}?feature=variation&content-type=application/json`;
 const blocked=prior.find(p=>p.row.rsID===row.rsID&&p.transportError);if(blocked&&!retry){audit.push({...blocked,deferred:true});continue;}
 try{
  let point;try{point=await readFile(new URL(name,cache));}catch(e){if(e.code!=='ENOENT')throw e;requests++;if(retry&&requests>5)throw Error('Retry request budget exceeded');const r=await fetch(url,{signal:AbortSignal.timeout(retry?30000:15000)});if(!r.ok)throw Error('HTTP '+r.status);point=Buffer.from(await r.arrayBuffer());if(point.length>5000000)throw Error('Oversize response');JSON.parse(point);await writeFile(new URL(name,cache),point,{flag:'wx'});}
  const evidence={row,sha256:createHash('sha256').update(point).digest('hex'),url};
  try{audit.push({...evidence,id:coordinateVariantIdentity(row,'GRCh38',JSON.parse(point))});}catch(e){audit.push({...evidence,error:e.message});}
 }catch(e){audit.push({row,url,transportError:e.message});if(++transportFailures>=3)break;}
}
const result={total:rows.length,checked:audit.length,requests,unresolved:audit.filter(r=>r.error||r.transportError),audit};
await writeFile(new URL('../work/thyroid-coordinate-inventory.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,audit:undefined}));
