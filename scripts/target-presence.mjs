import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import {createGunzip} from 'node:zlib';import {createInterface} from 'node:readline';import {createScanner} from '../public/engine.js';
export async function missingTargetIDs(file,catalog,{build,sample}){
 const scanner=createScanner(catalog,{build,sample}),input=createReadStream(file),digest=createHash('sha256');input.on('data',b=>digest.update(b));
 const stream=/\.gz$/i.test(file)?input.pipe(createGunzip()):input;let failure,buildConfirmed=false;input.on('error',e=>{if(stream!==input)stream.destroy(e);});stream.on('error',e=>failure=e);const lines=createInterface({input:stream,crlfDelay:Infinity});stream.on('error',()=>lines.close());
 const expected={GRCh37:249250621,GRCh38:248956422}[build];
 for await(const line of lines){const contig=/^##contig=<ID=(?:chr)?1,length=(\d+)(?:,|>)/.exec(line);if(contig){if(Number(contig[1])!==expected)throw Error('Existing VCF contig length disagrees with the requested build');buildConfirmed=true;}scanner.consume(line);}
 if(failure)throw failure;const report=scanner.finish();if(!buildConfirmed||report.format!=='VCF'||report.sample!==sample||report.build!==build||report.stats.malformed)throw Error('Existing VCF sample/build or record structure cannot support a missing-position check');
 return {ids:new Set(report.results.filter(r=>r.status==='Not observed').map(r=>r.id)),sha256:digest.digest('hex'),records:report.stats.records,represented:report.results.filter(r=>r.status!=='Not observed').length,policy:'Only absent target positions are called. Existing no-calls, failed quality, mismatches and other records are retained for review.'};
}
export function verifyTargetReference(text,targets){
 const expected=new Map();for(const t of targets){const key=`${t.chrom}:${t.position}-${t.position+t.ref.length-1}`;if(expected.has(key)&&expected.get(key)!==t.ref)throw Error('Targets disagree on reference base');expected.set(key,t.ref);}
 const observed=new Map();let key=null,sequence='';const save=()=>{if(key===null)return;if(observed.has(key)||!expected.has(key)||sequence.toUpperCase()!==expected.get(key))throw Error('Target reference base mismatch or duplicate: '+key);observed.set(key,sequence);};
 for(const line of text.trim().split(/\r?\n/)){if(line.startsWith('>')){save();key=line.slice(1).trim();sequence='';}else sequence+=line.trim();}save();if(observed.size!==expected.size)throw Error('Target reference batch is incomplete');return observed.size;
}
