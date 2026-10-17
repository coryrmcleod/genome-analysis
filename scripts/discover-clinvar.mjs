import fs from 'node:fs';
import path from 'node:path';
import {createGunzip} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {parseClinVarRow,pairClinVarBuilds,CLINICAL_GENES} from './clinvar-source.mjs';
const directory=process.argv[2];
if(!directory)throw Error('Supply the directory containing clinvar_GRCh37.vcf.gz and clinvar_GRCh38.vcf.gz.');
async function read(build){
 const file=path.join(directory,`clinvar_${build}.vcf.gz`),map=new Map(),hash=createHash('sha256');let date,sourceBuild;
 const stream=fs.createReadStream(file);stream.on('data',b=>hash.update(b));const unzip=stream.pipe(createGunzip());let failure;stream.on('error',e=>unzip.destroy(e));unzip.on('error',e=>failure=e);
 const lines=createInterface({input:unzip,crlfDelay:Infinity});unzip.on('error',()=>lines.close());
 for await(const line of lines){if(line.startsWith('##fileDate='))date=line.slice(11);if(line.startsWith('##reference='))sourceBuild=line.slice(12);const row=parseClinVarRow(line);if(row){if(map.has(row.variationId))throw Error('Duplicate ClinVar variation ID');map.set(row.variationId,row);}}
 if(failure)throw failure;if(sourceBuild!==build)throw Error('ClinVar build header differs from requested build');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Missing ClinVar release date');return {map,date,sha256:hash.digest('hex')};
}
const a=await read('GRCh37'),b=await read('GRCh38');if(a.date!==b.date)throw Error('ClinVar build snapshots differ');
const candidates=pairClinVarBuilds(a.map,b.map),out=new URL('../work/clinvar-discovery/',import.meta.url);fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(new URL('candidates.json',out),JSON.stringify({dates:[a.date,b.date],sourceHashes:{GRCh37:a.sha256,GRCh38:b.sha256},selectedGenes:[...CLINICAL_GENES],candidates}));
console.log(JSON.stringify({release:a.date,pairedAlleles:candidates.length,selectedGenes:CLINICAL_GENES.size}));
