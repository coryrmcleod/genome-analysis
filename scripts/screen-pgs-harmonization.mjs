// Cheap complete-file preflight before independent identifier requests. No admission.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseScoringFile,preflightHarmonizedRows} from './import-pgs-library.mjs';
import {validateCandidateScreenIds} from './pgs-candidate-screen-guard.mjs';
import {verifyWeightTypeAgreement} from './pgs-weight-evidence.mjs';
const [output,...ids]=process.argv.slice(2),cache=new URL('../work/pgs-source/',import.meta.url);
if(!output||!ids.length||ids.some(id=>!/^PGS\d{6}$/.test(id)))throw Error('Supply audit path and explicit uninstalled IDs');
validateCandidateScreenIds(ids,JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))));
const audit=[],options={allowEffectOnly:true,allowCoordinateIds:true};
for(const id of ids){
 const meta=JSON.parse(await readFile(new URL(id+'.json',cache))),bytes=await readFile(new URL(id+'.txt.gz',cache));
 const original=parseScoringFile(gunzipSync(bytes).toString(),options);
 if(meta.id!==id||original.metadata.pgs_id!==id||meta.variants_number!==original.rows.length)throw Error('Candidate original inventory mismatch');
 verifyWeightTypeAgreement(meta.weight_type,original.metadata.weight_type);
 const row={id,originalSha256:createHash('sha256').update(bytes).digest('hex'),builds:{}};
 for(const build of ['GRCh37','GRCh38'])try{
  const url=meta.ftp_harmonized_scoring_files[build].positions,u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='ftp.ebi.ac.uk')throw Error('Unexpected source');
  const response=await fetch(u,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('HTTP '+response.status);
  const data=Buffer.from(await response.arrayBuffer());if(data.length>20000000)throw Error('Source too large');
  await writeFile(new URL(id+'_'+build+'.txt.gz',cache),data);
  const parsed=parseScoringFile(gunzipSync(data).toString(),options),rows=preflightHarmonizedRows(original,parsed,build);
  verifyWeightTypeAgreement(meta.weight_type,parsed.metadata.weight_type);
  row.builds[build]={status:'complete-file preflight passes',count:rows.size,sha256:createHash('sha256').update(data).digest('hex')};
 }catch(e){row.builds[build]={status:'excluded',reason:e.message};}
 audit.push(row);await writeFile(output,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(row));
}
