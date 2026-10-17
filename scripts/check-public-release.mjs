import {readFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const audit=JSON.parse(await readFile(path.join(root,'docs/data-rights-audit.json')));
let verified=0;
for(const row of audit.datasets){
  const file=path.join(root,'public/data',row.file);
  if(!row.included){try{await access(file);}catch{continue;}throw Error('Withheld dataset is present: '+row.file);}
  const bytes=await readFile(file);
  if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Data snapshot differs from reviewed inventory: '+row.file);
  verified++;
}
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md','README.md','SECURITY.md','docs/DATA-LICENSES.md','docs/PUBLIC-EDITION.md'])await access(path.join(root,file));
const excluded=new Set(['.git','node_modules','work','tmp','dist-desktop']);
async function visit(dir=''){
  for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
    const rel=path.join(dir,entry.name);
    if(entry.isSymbolicLink())throw Error('Unexpected link in public source: '+rel);
    if(entry.isDirectory()){if(!excluded.has(entry.name))await visit(rel);continue;}
    if(/\.(?:vcf(?:\.gz)?(?:\.(?:tbi|csi))?|gvcf(?:\.gz)?|bam|bai|cram|crai|fastq(?:\.gz)?|fq(?:\.gz)?|fa|fasta|fai|pem|key|pfx|p12)$/i.test(entry.name)&&rel!==path.join('public','synthetic-demo.vcf'))throw Error('Potential personal input or credential file: '+rel);
    if(/^\.env(?:\.|$)/i.test(entry.name)&&entry.name!=='.env.example'||/^genome-report-/i.test(entry.name))throw Error('Private configuration/report file: '+rel);
  }
}
await visit();
console.log(JSON.stringify({status:'passed',verifiedDataSnapshots:verified,withheldScoreModels:audit.withheldScoreModels.length,scope:'Public source and data boundaries; not clinical validation'}));
