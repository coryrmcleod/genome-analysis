// Evidence-only exact reciprocal assembly check, not a scoring exception.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {verifyAssemblyReversal} from './verify-assembly-reversal.mjs';
const cache=new URL('../work/pgs-source/',import.meta.url),out=new URL('../work/narcolepsy-reversal-evidence/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:true});
const mappings={GRCh37:{chrom:'7',position:142274854,ref:'G',alleles:['G','A']},GRCh38:{chrom:'7',position:142357119,ref:'C',alleles:['C','T']}};
const audit={id:'PGS000757',variant:'rs2854536',mappings,status:'not verified',sources:[]};
try{audit.evidence=await verifyAssemblyReversal(audit.variant,mappings,async(url,name)=>{
 let bytes;if(name.endsWith('.gz'))bytes=await readFile(new URL(name,cache));else{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(url+': HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());await writeFile(new URL(name,cache),bytes);}
 const source={url,sha256:hash(bytes)};audit.sources.push(source);return {...source,bytes};
});audit.status='strict exact reciprocal proof passes; no admission';}catch(e){audit.reason=e.message;}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
