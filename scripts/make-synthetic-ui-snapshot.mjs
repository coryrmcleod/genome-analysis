// Generates public-model/synthetic-genotype UI fixtures only; never opens a personal genome.
import {readFile,writeFile} from 'node:fs/promises';
import {analyzeText} from '../public/engine.js';
import {europeanScore} from '../public/european-scores.js';
import {saveWorkspace,validateSaved} from '../public/workspace.js';
const read=async name=>JSON.parse(await readFile(new URL('../public/data/'+name+'.json',import.meta.url)));
const library=await read('pgs-library'),model=library.models.find(m=>m.id==='PGS000315');
if(!model||model.variantCount!==7)throw Error('Expected complete IgE model');
const ids=new Set(model.variants.map(v=>v.id)),targets=library.targets.filter(t=>ids.has(t.id)),single={...library,models:[model],targets};
const rows=model.variants.map(v=>{const m=targets.find(t=>t.id===v.id).mappings.GRCh38,alleles=[m.ref,...m.alleles.filter(a=>a!==m.ref)];return [m.chrom,m.position,v.id,m.ref,alleles.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',[v.effectAllele,v.otherAllele].map(a=>alleles.indexOf(a)).join('/')+':60:30'].join('\t');});
const vcf='##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n'+rows.join('\n')+'\n';
const report=analyzeText(vcf,{version:'synthetic',records:[]},{pgsLibrary:single});
const [pop,ref,sens]=await Promise.all(['pgs-populations','pgs-score-reference','pgs-score-sensitivity'].map(read));
report.polygenicScores.forEach(m=>europeanScore(m,pop,ref,sens));report.syntheticDemo=true;report.inputFile='SYNTHETIC-IgE-seven-heterozygotes.vcf';
// Mimic a historical snapshot without pretending it was produced by a past scanner.
delete report.analysisMethodVersion;for(const m of report.polygenicScores)for(const t of m.terms)delete t.recordObserved;
report.warnings.push('Synthetic historical-format UI fixture; not a person or historical biological observation.');
const saved=saveWorkspace(report,{view:'scores'},'Synthetic UI verification only.');validateSaved(saved);
await writeFile(new URL('../work/synthetic-legacy-ui.json',import.meta.url),JSON.stringify(saved));
await writeFile(new URL('../work/synthetic-ige-ui.vcf',import.meta.url),vcf);
console.log(JSON.stringify({model:model.id,terms:model.variantCount,rawSum:report.polygenicScores[0].rawSum,synthetic:true}));
