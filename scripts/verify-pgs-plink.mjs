// Independent numerical check using synthetic data only. Run Node inside WSL.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {analyzeText} from '../public/engine.js';
import {pgsTargetCatalog,isPalindromic,calculatePGS} from '../public/pgs.js';
const exec=promisify(execFile),library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url)));
const work=new URL('../work/pgs-conformance/',import.meta.url);await mkdir(work,{recursive:true});const results=[];
for(const build of ['GRCh37','GRCh38'])for(const model of library.models){
  const lines=['##fileformat=VCFv4.3',`##reference=${build}`,'##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">','##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Genotype quality">','##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Depth">','#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC'];
  const terms=model.variants.slice().sort((a,b)=>{const x=library.targets.find(t=>t.id===a.id).mappings[build],y=library.targets.find(t=>t.id===b.id).mappings[build];return Number(x.chrom)-Number(y.chrom)||x.position-y.position;});
  for(const [i,v] of terms.entries()){
    const m=library.targets.find(t=>t.id===v.id).mappings[build],other=v.otherAllele||m.alleles.find(a=>a!==v.effectAllele),pair=v.alleleMode==='effect-only'&&v.effectAlleleCandidates.length>1?v.effectAlleleCandidates:[v.effectAllele,other],all=[m.ref,...pair.filter(a=>a!==m.ref)];
    const bases=v.alleleMode==='effect-only'&&v.effectAlleleCandidates.length>1||isPalindromic(...pair)?pair:i%3===0?[pair[0],pair[0]]:i%3===1?pair:[pair[1],pair[1]];
    lines.push([m.chrom,m.position,v.id,m.ref,all.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',`${all.indexOf(bases[0])}/${all.indexOf(bases[1])}:60:30`].join('\t'));
  }
  const vcf=lines.join('\n')+'\n',stem=fileURLToPath(new URL(`${model.id}-${build}`,work));await writeFile(stem+'.vcf',vcf);
  await writeFile(stem+'.weights',model.variants.map(v=>`${v.id}\t${v.effectAllele}\t${v.weightText}`).join('\n')+'\n');
  const report=analyzeText(vcf,pgsTargetCatalog(library)),own=calculatePGS(library,report).find(s=>s.id===model.id);
  if(own.rawSum===null)throw Error('Synthetic complete-model fixture unexpectedly withheld');
  await exec('plink2',['--vcf',stem+'.vcf','--score',stem+'.weights','1','2','3','no-mean-imputation','cols=+scoresums','--out',stem,'--threads','1','--memory','640'],{maxBuffer:2_000_000});
  const out=(await readFile(stem+'.sscore','utf8')).trim().split(/\r?\n/),columns=out[0].trim().split(/\s+/),values=out[1].trim().split(/\s+/),external=Number(values[columns.indexOf('SCORE1_SUM')]);
  if(!Number.isFinite(external)||Math.abs(external-own.rawSum)>1e-5)throw Error(`PLINK mismatch for ${model.id}: ${external} vs ${own.rawSum}`);
  results.push({id:model.id,build,appRawSum:own.rawSum,plinkRawSum:external,matched:own.matched});
}
await writeFile(new URL('results.json',work),JSON.stringify({syntheticOnly:true,results},null,2));console.log(JSON.stringify(results,null,2));

