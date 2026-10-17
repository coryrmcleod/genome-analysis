// Public evidence-only audit. Never installs a model or changes scoring rules.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {chainIntervalMappings} from './assembly-chain.mjs';
import {reverseComplement} from '../public/pgs-build-alleles.js';
const root=new URL('../',import.meta.url),out=new URL('work/cataract-assembly-evidence/',root);
await mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const url='https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/11577342';
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('dbSNP HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),dbsnp=JSON.parse(bytes);if(dbsnp.refsnp_id!=='11577342')throw Error('Wrong RefSNP');
const digest=hash(bytes);await writeFile(new URL('refsnp-11577342-'+digest+'.json',out),bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST')throw e;if(hash(await readFile(new URL('refsnp-11577342-'+digest+'.json',out)))!==digest)throw Error('Frozen dbSNP hash mismatch');});
const builds={};
for(const [build,position,name] of [['GRCh37',145553303,'hg19ToHg38'],['GRCh38',145881773,'hg38ToHg19']]){
 const sequenceBytes=await readFile(new URL('work/pgs-source/rs11577342-'+build+'-reversal-sequence.json',root));
 const chainBytes=await readFile(new URL('work/pgs-source/'+name+'.over.chain.gz',root));
 const sequence=JSON.parse(sequenceBytes);
 builds[build]={position,sequence,sequenceSha256:hash(sequenceBytes),chainSha256:hash(chainBytes),chainHits:chainIntervalMappings(gunzipSync(chainBytes).toString(),'chr1',position-101,position+100)};
 await writeFile(new URL(build+'-sequence-'+hash(sequenceBytes)+'.json',out),sequenceBytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
}
const rc=reverseComplement(builds.GRCh37.sequence.seq),target=builds.GRCh38.sequence.seq;
const audit={id:'PGS001837',variant:'rs11577342',status:'excluded; no rule changed',dbSNP:{url,sha256:digest,placements:dbsnp.primary_snapshot_data.placements_with_allele},builds,mismatches:[...rc].flatMap((base,i)=>base===target[i]?[]:[{offset:i-100,reverseComplement37:base,reference38:target[i]}]),primaryAssemblyIssue:'https://www.ncbi.nlm.nih.gov/grc/human/issues/HG-1287',caution:'Unique reciprocal chain placement and central-only difference are observations, not proof against every possible duplicated-copy mapping. The current exact-sequence rule remains unchanged.'};
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({status:audit.status,mismatches:audit.mismatches,dbSNPSha256:digest}));
