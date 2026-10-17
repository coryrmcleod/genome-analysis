const names={EUR:'European',AFR:'African',EAS:'East Asian',SAS:'South Asian',AMR:'Hispanic / Latin American',MAE:'Multiple ancestries, including European',MAO:'Multiple other ancestries',OTH:'Other ancestry',NR:'Not reported',GME:'Greater Middle Eastern',OCE:'Oceanian'};
export function ancestryDescription(group){
 const pairs=Object.entries(group?.dist||{});return pairs.length?pairs.map(([code,value])=>['MAE','MAO'].includes(code)?`${names[code]} (${value}% assigned to this combined category; constituent ancestry proportions unspecified)`:(names[code]||code)+' '+value+'%').join('; '):'Not reported';
}
export function referencePopulationContext(model,population){
 if(!population||population==='none')return 'No population genotype substitution is selected.';
 const dist=model.ancestry?.gwas?.dist||{},keys=Object.keys(dist),name=names[population]||population;
 if(!keys.length)return `${name} is the what-if genotype source. The model’s discovery ancestry was not reported.`;
 if(population==='EUR'&&dist.MAE>0&&!dist.EUR)return 'European participants are included in the reported multi-ancestry discovery sample, but their proportion is not separately specified. European frequencies supply the genotype scenarios; this does not establish individual applicability or calibrate personal disease risk.';
 if(!Object.hasOwn(dist,population))return `${name} is the what-if genotype source, but it is not separately listed in this model’s reported discovery ancestry. This does not establish that the model applies to you.`;
 return `${name} appears in the reported discovery ancestry. That does not validate population substitution, establish your ancestry, or calibrate a personal risk or percentile.`;
}
export function studySexDescription(samples){
 const groups=Array.isArray(samples)?samples:[],values=groups.map(s=>s.sample_percent_male).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100);
 if(!values.length)return 'Study sex composition not reported in the available sample metadata.';
 const lo=Math.min(...values),hi=Math.max(...values);return `Reported male percentage across sample groups: ${lo===hi?lo:lo+'–'+hi}%. Available for ${values.length} of ${groups.length} groups; not a pooled percentage or an assessment of your sex.`;
}
