// Evidence-only inventory. Never filters rows or authorizes score admission.
import {parsePGSDecimal} from '../public/pgs-numeric.js';
export function diagnoseSourceTerms(text){
 const lines=text.split(/\r?\n/).filter(x=>x&&!x.startsWith('#'));
 const columns=lines.shift()?.split('\t');
 if(!columns||new Set(columns).size!==columns.length||columns.some(x=>!x))throw Error('Invalid diagnostic source columns');
 const findings=[];
 for(const [index,line] of lines.entries()){
  const fields=line.split('\t');
  if(fields.length!==columns.length)throw Error('Malformed diagnostic source row');
  const row=Object.fromEntries(columns.map((key,i)=>[key,fields[i]])),issues=[];
  if(!/^[ACGT]$/.test(row.effect_allele))issues.push('non-SNV effect allele');
  if(row.other_allele&&!/^[ACGT]$/.test(row.other_allele))issues.push('non-SNV other allele');
  if(row.effect_allele===row.other_allele)issues.push('identical effect/other alleles');
  try{parsePGSDecimal(row.effect_weight);}catch{issues.push('invalid weight');}
  if(issues.length)findings.push({row:index+1,sourceId:row.rsID??null,chrom:row.chr_name??null,position:row.chr_position??null,effectAllele:row.effect_allele??null,otherAllele:row.other_allele??null,weightText:row.effect_weight??null,issues});
 }
 return {scope:'Descriptive source inventory only; not an admission decision or a reduced score',rowCount:lines.length,flaggedRowCount:findings.length,findings};
}
