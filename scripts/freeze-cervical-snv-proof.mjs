// Freeze the independently retrieved14SNV mapping responses; no model admission.
import {readFile,mkdir,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const hashes={GRCh37:'275ce394db6c855bcfef877bdff4e867146fc2d5bc8d5bdae3ae9f0994e380a7',GRCh38:'41ca28e6a2c2d143e378c8683dd4728cd9b64e7a67c36b9245f32d10a8912fc2'},out=new URL('../test/fixtures/pgs/cervical-snv/',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
for(const [build,expected] of Object.entries(hashes)){
 const name=build+'-variation.json',source=new URL('../work/cervical-snv-evidence/'+name,import.meta.url),target=new URL(name,out);
 if(hash(await readFile(source))!==expected)throw Error('Reviewed mapping response changed');
 try{if(hash(await readFile(target))!==expected)throw Error('Refusing to replace frozen mapping');}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,target,1);}
}
console.log('Frozen two public14-SNV mapping responses; cervical score remains uninstalled.');
