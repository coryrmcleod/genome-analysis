// Add caller-produced GQ only when two BCFtools callers agree on diploid REF.
export function addReferenceQuality(multiallelic,consensus){
 const calls=new Map();
 for(const l of consensus.split(/\r?\n/)){if(!l||l.startsWith('#'))continue;const f=l.split('\t'),keys=f[8].split(':'),v=Object.fromEntries(keys.map((k,i)=>[k,f[9].split(':')[i]]));calls.set(f.slice(0,2).join(':'),{ref:f[3],...v});}
 let supplemented=0;
 const lines=multiallelic.split(/\r?\n/).map(l=>{
  if(!l||l.startsWith('#'))return l;
  const f=l.split('\t'),keys=f[8].split(':'),values=f[9].split(':'),v=Object.fromEntries(keys.map((k,i)=>[k,values[i]])),other=calls.get(f.slice(0,2).join(':'));
  if(v.GT!=='0/0'||(v.GQ&&v.GQ!=='.')||other?.GT!=='0/0'||other.ref!==f[3]||!/^\d+$/.test(other.GQ||'')||other.DP!==v.DP)return l;
  let i=keys.indexOf('GQ');if(i<0){i=keys.length;keys.push('GQ');}values[i]=other.GQ;f[8]=keys.join(':');f[9]=values.join(':');f[7]=(f[7]==='.'?'':f[7]+';')+'GA_REF_GQ';supplemented++;return f.join('\t');
 });
 const index=lines.findIndex(l=>l.startsWith('#CHROM'));
 lines.splice(index,0,'##INFO=<ID=GA_REF_GQ,Number=0,Type=Flag,Description="Reference GQ from BCFtools consensus caller; multiallelic and consensus callers agree on diploid reference genotype and depth">');
 return {text:lines.join('\n'),supplemented};
}
