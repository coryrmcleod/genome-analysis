// One recovery probe after new successful both-build Ensembl variation requests.
// Preserve the prior failed inventory; never rerun this probe unchanged.
import {readFile,writeFile,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../work/psoriatic-identity-evidence/',import.meta.url),target=new URL('recovery-after-pe.json',root),prior=new URL('inventory.json',root),url='https://rest.ensembl.org/overlap/region/human/6:20716890-20716890?feature=variation&content-type=application/json';
try{await readFile(target);throw Error('Recovery probe already recorded; do not repeat');}catch(e){if(e.code!=='ENOENT')throw e;}
await copyFile(prior,new URL('inventory-before-pe-recovery.json',root),1);
let audit={url,reason:'Fresh PGS003861 both-build variation/human responses succeeded after earlier point-service failures'};
try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>5000000||!Array.isArray(JSON.parse(bytes)))throw Error('Invalid point response');const sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(new URL('../pgs-source/PGS019623-GRCh38-6-20716890-identity.json',root),bytes,{flag:'wx'});audit={...audit,status:'recovered',sha256};}catch(e){audit={...audit,status:'unavailable',error:e.message};}
await writeFile(target,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));
