// Independent assembly-converter evidence only; does not alter scoring or gates.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=new URL('../work/narcolepsy-converter-evidence/',import.meta.url);await mkdir(out,{recursive:true});
const audit={id:'PGS000757',variant:'rs2854536',scope:'Evidence only; no admission or primary-chain exemption',sources:[]};
try{
 for(const [build,pos] of [['GRCh37',142274854],['GRCh38',142357119]])for(const flank of [0,100]){
  const other=build==='GRCh37'?'GRCh38':'GRCh37',name=build+'-map-'+flank+'.json',url=`https://rest.ensembl.org/map/human/${build}/7:${pos-flank}..${pos+flank}:1/${other}?content-type=application/json`;
  let bytes;try{bytes=await readFile(new URL(name,out));}catch(e){if(e.code!=='ENOENT')throw e;const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(url+': HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2000000)throw Error('Oversize evidence');JSON.parse(bytes);await writeFile(new URL(name,out),bytes,{flag:'wx'});}
  const data=JSON.parse(bytes);audit.sources.push({name,url,sha256:createHash('sha256').update(bytes).digest('hex'),mappings:data.mappings});
 }
 audit.status='responses retained; manual review required';
}catch(e){audit.status='blocked';audit.reason=e.message;}
await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
