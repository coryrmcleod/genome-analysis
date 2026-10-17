// Bounded source-identity feasibility check. No annotation, admission or publication.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseScoringFile,coordinateVariantIdentity} from './import-pgs-library.mjs';
import {GAD_REVIEW,loadGADPublicMappingEvidence} from './gad-coordinate-evidence.mjs';
const budget=Number(process.argv[2]||500);if(!Number.isSafeInteger(budget)||budget<1||budget>1000)throw Error('Public request budget must be1..1000');
await loadGADPublicMappingEvidence();
const cache=new URL('../work/pgs-source/',import.meta.url),out=new URL('../work/gad-coordinate-progress.json',import.meta.url),id=GAD_REVIEW.id,hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await readFile(new URL(id+'.txt.gz',cache));if(hash(bytes)!==GAD_REVIEW.original)throw Error('Unreviewed original source');
const parsed=parseScoringFile(gunzipSync(bytes).toString(),{allowCoordinateIds:true,allowEffectOnly:true});if(parsed.rows.length!==21630||parsed.metadata.genome_build!=='GRCh38')throw Error('Wrong complete source');
let index=0,requests=0,checked=0,failure=null;const evidence=[];
await Promise.all(Array.from({length:4},async()=>{while(index<parsed.rows.length&&!failure){
 const row=parsed.rows[index++],name=`${id}-GRCh38-${row.chr_name}-${row.chr_position}-identity.json`,dest=new URL(name,cache),url=`https://rest.ensembl.org/overlap/region/human/${row.chr_name}:${row.chr_position}-${row.chr_position}?feature=variation&content-type=application/json`;
 try{let data;try{data=await readFile(dest);}catch(e){if(e.code!=='ENOENT')throw e;if(requests>=budget)return;requests++;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);data=Buffer.from(await r.arrayBuffer());if(data.length>2000000)throw Error('Oversize response');JSON.parse(data);await writeFile(dest,data,{flag:'wx'});}
 const variantId=coordinateVariantIdentity(row,'GRCh38',JSON.parse(data));evidence.push({sourceId:row.rsID,id:variantId,url,sha256:hash(data)});checked++;if(checked%100===0)console.log('GAD exact source identities checked: '+checked+'; new public requests: '+requests);
 }catch(e){failure={sourceId:row.rsID,url,reason:e.message};}
 }}));
const audit={id,originalSha256:hash(bytes),scope:'Source-build identity feasibility only; no coordinate annotation or score admission',checked,newRequests:requests,total:parsed.rows.length,status:failure?'blocked':checked===parsed.rows.length?'source identities complete':'bounded checkpoint',failure,evidence};
await writeFile(out,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({...audit,evidence:undefined}));
