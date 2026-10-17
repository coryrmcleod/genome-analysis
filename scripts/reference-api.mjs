import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const cacheDir=new URL('../work/reference-api-cache/',import.meta.url);
let lastRequest=0;
export async function getJSON(url,{cache=true}={}){
  // Only public reference requests belong here. Never pass personal genotypes.
  const parsed=new URL(url);
  if(!['rest.ensembl.org','grch37.rest.ensembl.org','eutils.ncbi.nlm.nih.gov'].includes(parsed.hostname))throw Error('Unapproved reference API host');
  const cacheURL=new URL(createHash('sha256').update(url).digest('hex')+'.json',cacheDir);
  if(cache&&!process.argv.includes('--fresh')){try{const info=await stat(cacheURL);if(Date.now()-info.mtimeMs<86400000){const data=JSON.parse(await readFile(cacheURL,'utf8'));data.referenceFetchedAt??=new Date(info.mtimeMs).toISOString();return data;}}catch(e){if(e.code!=='ENOENT')throw e;}}
  for(let attempt=0;attempt<4;attempt++){
    await new Promise(r=>setTimeout(r,Math.max(0,400-(Date.now()-lastRequest))));lastRequest=Date.now();
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
      if(!response.ok){const error=Error(`Reference API ${parsed.hostname}: HTTP ${response.status}`);error.retryable=response.status===429||response.status>=500;throw error;}
      const data=await response.json();if(data.error||data.esearchresult?.ERROR)throw Error(`Reference API ${parsed.hostname} returned an error`);
      data.referenceFetchedAt=new Date().toISOString();
      if(cache){await mkdir(cacheDir,{recursive:true});await writeFile(cacheURL,JSON.stringify(data));}return data;
    }catch(e){if(attempt===3||e.retryable===false)throw e;await new Promise(r=>setTimeout(r,1000*2**attempt));}
  }
}
export function pubmedURL(endpoint,params){
  if(!['esearch','esummary'].includes(endpoint))throw Error('Unsupported PubMed operation');
  const query=new URLSearchParams({db:'pubmed',retmode:'json',tool:'GenomeAnalysisReferenceCatalog',...params});
  if(process.env.NCBI_API_KEY)query.set('api_key',process.env.NCBI_API_KEY);
  if(process.env.NCBI_EMAIL)query.set('email',process.env.NCBI_EMAIL);
  return `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${endpoint}.fcgi?${query}`;
}
export async function searchPubMed(rsid){
  if(!/^rs\d+$/.test(rsid))throw Error('PubMed discovery accepts one public rsID only');
  const data=await getJSON(pubmedURL('esearch',{term:`${rsid}[All Fields]`,retmax:'3',sort:'relevance'}));
  return data.esearchresult.idlist;
}
export async function pubmedSummaries(ids){
  const records={};const unique=[...new Set(ids)];if(unique.some(id=>!/^\d+$/.test(id)))throw Error('Invalid PMID');
  for(let i=0;i<unique.length;i+=100){
    const batch=unique.slice(i,i+100),data=await getJSON(pubmedURL('esummary',{id:batch.join(',')}));
    for(const id of batch){const item=data.result?.[id];if(!item?.title||item.error)throw Error(`PubMed metadata missing for PMID ${id}`);
      records[id]={pmid:id,title:item.title,journal:item.fulljournalname||item.source,date:item.pubdate,url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,publicationTypes:item.pubtype||[]};
    }
  }
  return records;
}
