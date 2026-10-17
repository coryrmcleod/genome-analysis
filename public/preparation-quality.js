// An explicit preparation screen; never interpret an unevaluated FILTER as PASS.
export function screenUnevaluatedPreparationRecord(line){
 const f=line.split('\t');
 if(f.length!==10||f[6]!=='.'||!/^[ACGT]$/.test(f[3])||f[4].split(',').some(a=>a!=='.'&&!/^[ACGT]$/.test(a)))return {line,screened:false};
 const keys=f[8].split(':'),values=f[9].split(':'),sample=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
 const numeric=(name,min)=>/^\d+(?:\.\d+)?$/.test(sample[name]||'')&&Number(sample[name])>=min;
 const alleles=[f[3],...f[4].split(',')],gt=sample.GT||'';
 const valid=new Set(keys).size===keys.length&&values.length<=keys.length&&/^\d+[|/]\d+$/.test(gt)&&gt.split(/[|/]/).map(Number).every(i=>i<alleles.length&&/^[ACGT]$/.test(alleles[i]))&&/^[ACGT]$/.test(f[3]);
 const passed=valid&&numeric('GQ',20)&&numeric('DP',10);
 f[6]=passed?'PASS':'GA_PREPARATION_LOWQUAL';
 f[7]=f[7]==='.'?'GA_PREPARATION_QC':f[7]+';GA_PREPARATION_QC';
 return {line:f.join('\t'),screened:true,passed};
}
