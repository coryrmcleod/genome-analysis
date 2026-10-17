// Publication guard: frequency data and the score targets must be one coherent batch.
export function validateExpansionPopulations(populations,library){
 if(JSON.stringify(populations?.populations)!==JSON.stringify(['EUR'])||populations.reference?.sampleCount!==503)throw Error('Unreviewed staged population panel');
 const records=populations.records;
 if(!records||Object.keys(records).length!==library.targets.length)throw Error('Population target inventory mismatch');
 for(const target of library.targets){
  const r=records[target.id];
  if(!r||JSON.stringify(r.mapping)!==JSON.stringify(target.mappings.GRCh38))throw Error('Population target mapping mismatch: '+target.id);
  if(Object.keys(r.populations||{}).some(p=>p!=='EUR'))throw Error('Unexpected staged population');
  const group=r.populations?.EUR;
  if(target.variantKind==='reviewed-pgs-deletion'&&group)throw Error('Certified deletion genotype frequencies require separate reviewed cohort verification');
  if(!group){if(r.status==='Verified public forward mapping')throw Error('Verified frequency record has no genotypes');continue;}
  if(r.status!=='Verified public forward mapping'||group.sampleCount!==503||!Array.isArray(group.genotypes)||!group.genotypes.length)throw Error('Invalid staged genotype group');
  let total=0;const seen=new Set();
  for(const g of group.genotypes){
   const alleles=typeof g.genotype==='string'?g.genotype.split('/'):[];
   if(alleles.length!==2||alleles.some(a=>!target.mappings.GRCh38.alleles.includes(a)||!/^[ACGT]$/.test(a))||alleles.join('/')!==[...alleles].sort().join('/')||seen.has(g.genotype)||!Number.isSafeInteger(g.count)||g.count<=0||!Number.isFinite(g.frequency)||Math.abs(g.frequency-g.count/503)>1e-12)throw Error('Invalid staged genotype counts: '+target.id);
   seen.add(g.genotype);total+=g.count;
  }
  if(total!==503)throw Error('Incomplete staged genotype counts: '+target.id);
 }
 return populations;
}
