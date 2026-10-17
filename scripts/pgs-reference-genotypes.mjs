// Decode VCF allele indices before checking model compatibility. An unused ALT
// entry is not a genotype and does not invalidate otherwise matching samples.
export function matchReferenceGenotypes(term,mapping,rows,sampleCount){
 if(!rows.length)return {status:'missing'};
 if(rows.length!==1)return {status:'incompatible',reason:'Duplicate reference records'};
 const r=rows[0],allowed=term.alleleMode==='effect-only'?mapping.alleles:[term.effectAllele,term.otherAllele];
 if(r.ref!==mapping.ref||r.alleles.length<2||new Set(r.alleles).size!==r.alleles.length||r.alleles.some(a=>!mapping.alleles.includes(a)||!/^[ACGT]$/.test(a))||!r.alleles.includes(term.effectAllele)||term.alleleMode!=='effect-only'&&!r.alleles.includes(term.otherAllele)||r.samples.length!==sampleCount)return {status:'incompatible',reason:'Reference allele definition or sample count mismatch'};
 const gtIndex=r.format.indexOf('GT');if(gtIndex<0)return {status:'incompatible',reason:'No reference GT field'};
 const genotypes=r.samples.map(s=>{const g=s.split(':')[gtIndex]?.split(/[|/]/);return g?.length===2&&g.every(a=>/^(0|[1-9]\d*)$/.test(a)&&Number.isSafeInteger(Number(a))&&Number(a)<r.alleles.length)?g.map(a=>r.alleles[Number(a)]):null;});
 if(genotypes.some(g=>g===null))return {status:'incomplete',reason:'Missing or malformed reference genotype'};
 if(genotypes.some(g=>g.some(a=>!allowed.includes(a))))return {status:'incompatible',reason:'A reference sample carries an allele outside the model'};
 const used=new Set(genotypes.flat());
 return {status:'matched',record:r,genotypes,unusedAlleles:r.alleles.filter(a=>!used.has(a)),dosages:genotypes.map(g=>g.filter(a=>a===term.effectAllele).length)};
}
