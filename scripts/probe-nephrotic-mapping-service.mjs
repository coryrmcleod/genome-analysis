// Bounded independent GET diagnostic after the five-ID POST failed. No import.
import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const out=new URL('../work/nephrotic-service-probe/',import.meta.url);await mkdir(out,{recursive:true});const audit=[];
for(const id of ['rs9273542','rs2858317','rs3828799','rs2637678','rs10518133']){
 const url=`https://rest.ensembl.org/variation/human/${id}?content-type=application/json`,row={id,url};
 try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});row.http=r.status;if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer()),data=JSON.parse(b);row.sha256=createHash('sha256').update(b).digest('hex');row.name=data.name;row.mappings=data.mappings;await writeFile(new URL(id+'-'+row.sha256+'.json',out),b);row.status='retrieved';}catch(e){row.status='failed';row.reason=e.message;}
 audit.push(row);await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(row));if(row.status==='failed')break;
}
