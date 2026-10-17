// Public candidate discovery only. Passing this screen never installs a model.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseScoringFile} from './import-pgs-library.mjs';
import {validateCandidateScreenIds} from './pgs-candidate-screen-guard.mjs';
import {verifyWeightTypeAgreement} from './pgs-weight-evidence.mjs';
import {retryPGSSource} from './pgs-source-request.mjs';
import {diagnoseSourceTerms} from './pgs-source-diagnostics.mjs';
const [output,...ids]=process.argv.slice(2);
if(!output||!ids.length||ids.some(id=>!/^PGS\d{6}$/.test(id)))throw Error('Supply audit.json and explicit score IDs');
validateCandidateScreenIds(ids,JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))));
const cache=new URL('../work/pgs-source/',import.meta.url);await mkdir(cache,{recursive:true});const audit=[];
for(const id of ids){try{
 const mr=await retryPGSSource('https://www.pgscatalog.org/rest/score/'+id,()=>({signal:AbortSignal.timeout(60000)}));if(!mr.ok)throw Error('Metadata HTTP '+mr.status);
 const metaBytes=Buffer.from(await mr.arrayBuffer()),m=JSON.parse(metaBytes);
 if(m.id!==id)throw Error('Wrong score metadata');await writeFile(new URL(id+'.json',cache),metaBytes);
 const u=new URL(m.ftp_scoring_file);if(u.protocol!=='https:'||u.hostname!=='ftp.ebi.ac.uk')throw Error('Unexpected original source');
 const response=await retryPGSSource(u,()=>({signal:AbortSignal.timeout(60000)}));if(!response.ok)throw Error('Source HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20000000)throw Error('Oversize source');await writeFile(new URL(id+'.txt.gz',cache),bytes);
 const text=gunzipSync(bytes).toString();let parsed,reason;
 try{parsed=parseScoringFile(text,{allowEffectOnly:true,allowCoordinateIds:true});if(parsed.metadata.pgs_id!==m.id||parsed.rows.length!==m.variants_number)throw Error('Original score inventory disagrees with metadata');verifyWeightTypeAgreement(m.weight_type,parsed.metadata.weight_type);}catch(e){parsed=null;reason=e.message;}
 const lines=text.split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),columns=lines[0]?.split('\t');
 let diagnostics;try{diagnostics=diagnoseSourceTerms(text);}catch(e){diagnostics={error:e.message};}
 audit.push({id,trait:m.trait_reported,count:m.variants_number,status:parsed?'original passes':'excluded',reason,weightType:m.weight_type,matchesPublication:m.matches_publication,method:m.method_name,methodParameters:m.method_params,publication:m.publication,ancestry:m.ancestry_distribution,columns,allowEffectOnly:parsed?.rows.some(r=>!r.other_allele),allowCoordinateIds:parsed?.rows.some(r=>r.coordinateSource),sha256:createHash('sha256').update(bytes).digest('hex')});
 audit.at(-1).diagnostics=diagnostics;
}catch(e){audit.push({id,status:'excluded',reason:e.message});}
console.log(JSON.stringify(audit.at(-1)));await writeFile(output,JSON.stringify(audit,null,2)+'\n');if(/HTTP 429/.test(audit.at(-1).reason||''))throw Error('Public source rate limit: screening stopped; audit preserved. Retry after a cooldown.');}
