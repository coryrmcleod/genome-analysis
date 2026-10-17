import {createHash} from 'node:crypto';
// Ensembl documents an average of 15 requests/second. Share one conservative
// queue across both assemblies; cache hits never reach this scheduler.
export function createEnsemblRequestPacer({now=()=>performance.now(),epochNow=()=>Date.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),interval=100}={}){
 let tail=Promise.resolve(),last=-Infinity,cooldownUntil=-Infinity;
 const supported=url=>['rest.ensembl.org','grch37.rest.ensembl.org'].includes(new URL(url).hostname);
 const check=url=>{if(now()<cooldownUntil)throw Error(`${url}: HTTP 429 cooldown active; no request sent. Retry after ${Math.ceil((cooldownUntil-now())/1000)} seconds.`);};
 const pace=url=>{
  if(!supported(url))return Promise.resolve();
  const turn=tail.then(async()=>{
   check(url);
   while(now()-last<interval){await sleep(interval-(now()-last));check(url);}
   last=now();
  });
  tail=turn.catch(()=>{});return turn;
 };
 // Do not retry 429 or hold a job asleep for a server-directed cooldown. Later
 // queued requests fail before creating a timeout or invoking the transport.
 pace.observe=(url,response)=>{
  if(!supported(url)||response.status!==429)return;
  const raw=response.headers?.get?.('Retry-After')?.trim();let milliseconds=60000;
  if(raw&&raw.length<=128){
   if(/^\d+(?:\.\d+)?$/.test(raw))milliseconds=Number(raw)*1000;
   else if(/^[A-Za-z]{3}, .+ GMT$/.test(raw)&&Number.isFinite(Date.parse(raw)))milliseconds=Math.max(0,Date.parse(raw)-epochNow());
  }
  if(!Number.isFinite(milliseconds))milliseconds=60000;
  const reset=response.headers?.get?.('X-RateLimit-Reset');
  if(response.headers?.get?.('X-RateLimit-Remaining')==='0'&&/^\d+(?:\.\d+)?$/.test(reset||'')&&Number.isFinite(Number(reset)*1000))milliseconds=Math.max(milliseconds,Number(reset)*1000);
  cooldownUntil=Math.max(cooldownUntil,now()+milliseconds);
 };
 return pace;
}
const paceEnsembl=createEnsemblRequestPacer();
// Keep transient failures actionable without logging request contents.
export async function fetchPGSSource(url,options={},fetcher=fetch){
 try{return await fetcher(url,options);}
 catch(error){
  const body=options.body;
  const context=body===undefined?'':` (request SHA-256 ${createHash('sha256').update(body).digest('hex')})`;
  const kind=error?.name==='TimeoutError'?'request timed out':error?.name==='AbortError'?'request aborted':'network request failed';
  throw new Error(`${url}: ${kind}${context}`,{cause:error});
 }
}
// Retry only transient transport failures. Each attempt gets a fresh timeout;
// HTTP responses (including rate limits) remain the caller's responsibility.
export async function retryPGSSource(url,optionsForAttempt,{fetcher=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),pace=paceEnsembl}={}){
 for(let attempt=0;attempt<3;attempt++){
  try{await pace(url);const response=await fetchPGSSource(url,optionsForAttempt(),fetcher);pace.observe?.(url,response);return response;}
  catch(error){
   if(attempt===2||!['TypeError','TimeoutError'].includes(error.cause?.name))throw error;
   await sleep(2000*2**attempt);
  }
 }
}
