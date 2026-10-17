// Candidate feasibility only: reuse public response evidence at identical coordinates.
// This never admits a score, changes a source file or makes a network request.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseScoringFile,coordinateVariantIdentity} from './import-pgs-library.mjs';
import {validateCandidateScreenIds} from './pgs-candidate-screen-guard.mjs';
const [id,output]=process.argv.slice(2),root=new URL('../',import.meta.url),cache=new URL('work/pgs-source/',root);
if(!output)throw Error('Supply candidate ID and audit path');validateCandidateScreenIds([id],JSON.parse(await readFile(new URL('public/data/pgs-library.json',root))));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=await readFile(new URL(id+'.txt.gz',cache)),original=parseScoringFile(gunzipSync(bytes).toString(),{allowCoordinateIds:true,allowEffectOnly:true});
const rows=new Map(original.rows.filter(r=>r.coordinateSource).map(r=>[original.metadata.genome_build+':'+r.chr_name+':'+r.chr_position,r])),checked=new Map(),failures=[];
for(const name of await readdir(cache)){
 const match=name.match(/^PGS\d{6}-(GRCh37|GRCh38)-(\d+)-(\d+)-identity\.json$/);if(!match)continue;const [,build,chrom,position]=match,key=[build,chrom,position].join(':'),row=rows.get(key);if(!row)continue;
 const response=await readFile(new URL(name,cache)),source={name,sha256:hash(response),url:`https://${build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org'}/overlap/region/human/${chrom}:${position}-${position}?feature=variation&content-type=application/json`};
 try{const variantId=coordinateVariantIdentity(row,build,JSON.parse(response));if(checked.has(key)&&checked.get(key).id!==variantId)throw Error('Cached response identity disagreement');const entry=checked.get(key)||{id:variantId,coordinate:key,sources:[]};entry.sources.push(source);checked.set(key,entry);}
 catch(e){failures.push({coordinate:key,effectAllele:row.effect_allele,reason:e.message,source});}
}
const audit={id,originalSha256:hash(bytes),scope:'Public cached-coordinate feasibility only; not complete verification or admission',coordinateTerms:rows.size,checkedCoordinates:checked.size,failures,checked:[...checked.values()]};
await writeFile(output,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({...audit,checked:undefined}));
