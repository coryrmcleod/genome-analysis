// Freeze only reviewed raw responses after semantic validation; never replace evidence.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {THYROID_EXTRA_LOCI,verifyExtraThyroidAliasData} from './thyroid-extra-alias-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),root=new URL('../',import.meta.url),dest=new URL('test/fixtures/pgs/thyroid-extra-alias/',root),files=[],pending=[];
for(const locus of THYROID_EXTRA_LOCI){
 const data={},sources=[{name:`overlap-${locus.position}.json`,source:`work/pgs-source/PGS018695-GRCh38-6-${locus.position}-identity.json`,url:`https://rest.ensembl.org/overlap/region/human/6:${locus.position}-${locus.position}?feature=variation&content-type=application/json`},...[locus.canonical,...locus.aliases].map(id=>({name:`refsnp-${id}.json`,source:`work/thyroid-refsnp-aliases/refsnp-${id}.json`,url:`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id}`}))];
 for(const item of sources){const bytes=await readFile(new URL(item.source,root));data[item.name]=JSON.parse(bytes);files.push({name:item.name,sha256:hash(bytes),url:item.url});pending.push(item);}
 verifyExtraThyroidAliasData(locus,data);
}
await mkdir(dest,{recursive:true});
for(const item of pending)await copyFile(new URL(item.source,root),new URL(item.name,dest),1);
const bytes=Buffer.from(JSON.stringify({scope:'Exact three reviewed thyroid loci',files},null,2)+'\n');await writeFile(new URL('manifest.json',dest),bytes,{flag:'wx'});console.log({files:files.length,manifestSha256:hash(bytes)});
