import fs from 'node:fs';import {createGunzip} from 'node:zlib';import {createInterface} from 'node:readline';import {CLINICAL_GENES} from './clinvar-source.mjs';
const [sourceVCF,referenceFAI]=process.argv.slice(2);if(!sourceVCF||!referenceFAI)throw Error('Supply ClinVar GRCh38 VCF.GZ and reference FASTA.FAI');
const records=[],counts={},header=['##fileformat=VCFv4.3','##reference=GRCh38'];let date,build,failure;
const input=fs.createReadStream(sourceVCF),stream=input.pipe(createGunzip());input.on('error',e=>stream.destroy(e));stream.on('error',e=>failure=e);const lines=createInterface({input:stream,crlfDelay:Infinity});stream.on('error',()=>lines.close());
for await(const l of lines){
 if(l.startsWith('##fileDate='))date=l.slice(11);if(l.startsWith('##reference='))build=l.slice(12);
 
 if(l.startsWith('#'))continue;const f=l.split('\t');if(!/^(?:[1-9]|1\d|2[0-2])$/.test(f[0])||!/^\d+$/.test(f[2])||!/^([ACGT]){1,51}$/.test(f[3])||!/^([ACGT]){1,51}$/.test(f[4])||f[3].length===f[4].length||Math.min(f[3].length,f[4].length)!==1||f[3][0]!==f[4][0])continue;
 const i=Object.fromEntries(f[7].split(';').map(x=>{const n=x.indexOf('=');return n<0?[x,true]:[x.slice(0,n),x.slice(n+1)];}));if(!['reviewed_by_expert_panel','practice_guideline'].includes(i.CLNREVSTAT)||!['Pathogenic','Likely_pathogenic','Pathogenic/Likely_pathogenic'].includes(i.CLNSIG)||i.CLNSIGINCL||i.CLNSIGCONF)continue;
 const genes=(i.GENEINFO||'').split('|').map(x=>x.split(':')[0]).filter(g=>CLINICAL_GENES.has(g));if(!genes.length)continue;
 records.push({variationId:f[2],rsID:/^\d+$/.test(i.RS||'')?'rs'+i.RS:null,genes,chrom:f[0],position:Number(f[1]),ref:f[3],alt:f[4],classification:i.CLNSIG,reviewStatus:i.CLNREVSTAT,conditions:i.CLNDN,conditionIdentifiers:i.CLNDISDB});for(const g of genes)counts[g]=(counts[g]||0)+1;
}
if(failure)throw failure;if(build!=='GRCh38'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Missing/unsupported reference build or date');
fs.mkdirSync('work/indel-source',{recursive:true});fs.writeFileSync('work/indel-source/candidates.json',JSON.stringify({releaseDate:date,records}));header.push(...fs.readFileSync(referenceFAI,'utf8').split(/\r?\n/).map(l=>l.split('\t')).filter(f=>/^chr(?:[1-9]|1\d|2[0-2])$/.test(f[0])).map(f=>`##contig=<ID=${f[0]},length=${f[1]}>`));header.push('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO');fs.writeFileSync('work/indel-source/source.vcf',header.concat(records.map(r=>['chr'+r.chrom,r.position,r.variationId,r.ref,r.alt,'.','PASS','.'].join('\t'))).join('\n')+'\n');console.log({releaseDate:date,count:records.length,genes:counts});
