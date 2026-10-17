import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {KEY_GENES} from '../public/key-genes.js';
import {validateGeneValidity} from '../public/gene-validity.js';
// The source uses quoted CSV fields, including escaped quotes and embedded commas.
export function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('Unclosed CSV quotation');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows;
}
export function importGeneValidity(bytes,genes){
 const rows=parseCSV(bytes.toString('utf8')),date=rows[1]?.[0]?.match(/^FILE CREATED: (\d{4}-\d{2}-\d{2})$/)?.[1];
 const header=['GENE SYMBOL','GENE ID (HGNC)','DISEASE LABEL','DISEASE ID (MONDO)','MOI','SOP','CLASSIFICATION','ONLINE REPORT','CLASSIFICATION DATE','GCEP'];
 if(JSON.stringify(rows[4])!==JSON.stringify(header)||rows[0]?.[0]!=='CLINGEN GENE DISEASE VALIDITY CURATIONS')throw Error('Unexpected ClinGen source schema');
 const all=rows.slice(6).filter(r=>r.some(Boolean)).map(r=>{if(r.length!==10)throw Error('Malformed ClinGen row');const [gene,hgnc,disease,mondo,inheritance,sop,classification,url,classificationDate,panel]=r;return {gene,hgnc,disease,mondo,inheritance,sop,classification,url,classificationDate,panel};});
 const library={schemaVersion:1,version:'1.0.0',releaseDate:date,retrievedAt:new Date().toISOString(),sourceURL:'https://search.clinicalgenome.org/kb/gene-validity/download',sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceRecordCount:all.length,records:all.filter(r=>genes.has(r.gene))};
 if(!library.records.length)throw Error('No selected gene curations found');return validateGeneValidity(library);
}
if(process.argv[1]&&import.meta.url===(await import('node:url')).pathToFileURL(process.argv[1]).href){
 const bytes=await readFile(process.argv[2]||'work/clingen/gene-validity.csv'),library=importGeneValidity(bytes,new Set(KEY_GENES.flatMap(g=>g.genes)));
 const out=new URL('../public/data/gene-validity-library.json',import.meta.url),tmp=new URL(out.href+'.tmp');await writeFile(tmp,JSON.stringify(library,null,2)+'\n');await rename(tmp,out);
 console.log(JSON.stringify({records:library.records.length,genes:new Set(library.records.map(r=>r.gene)).size,classes:library.records.reduce((a,r)=>(a[r.classification]=(a[r.classification]||0)+1,a),{})}));
}
