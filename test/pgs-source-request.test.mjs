import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fetchPGSSource,retryPGSSource,createEnsemblRequestPacer} from '../scripts/pgs-source-request.mjs';
test('rate-limited responses stop queued assembly requests before options or transport and release at expiry',async()=>{
 let clock=0,release,calls=0,options=0;const pace=createEnsemblRequestPacer({now:()=>clock,sleep:()=>new Promise(resolve=>{release=resolve;})});
 const firstURL='https://rest.ensembl.org/variation/human/rs1',secondURL='https://grch37.rest.ensembl.org/variation/human/rs2',response={status:429,headers:new Headers({'Retry-After':'2.5'})};
 const request=url=>retryPGSSource(url,()=>{options++;return {};},{pace,fetcher:async()=>{calls++;return response;},sleep:async()=>assert.fail('429 must not retry')});
 const first=request(firstURL),second=request(secondURL);const rejected=assert.rejects(second,/HTTP 429 cooldown active; no request sent/);
 assert.equal(await first,response);assert.equal(calls,1);clock=100;release();await rejected;
 assert.equal(options,1);assert.equal(calls,1);
 clock=2499;await assert.rejects(request(secondURL),/cooldown active/);assert.equal(calls,1);
 clock=2500;const success={status:200};assert.equal(await retryPGSSource(secondURL,()=>({}),{pace,fetcher:async()=>{calls++;return success;}}),success);assert.equal(calls,2);
});
test('cooldown handles HTTP dates and missing headers, never shortens, and does not block other sources',async()=>{
 const url='https://rest.ensembl.org/variation/human',other='https://www.pgscatalog.org/rest/score/PGS000001';let clock=0;const epoch=Date.UTC(2026,9,1),pace=createEnsemblRequestPacer({now:()=>clock,epochNow:()=>epoch+clock,sleep:async ms=>{clock+=ms;}});
 pace.observe(url,{status:429,headers:new Headers({'Retry-After':new Date(epoch+10000).toUTCString()})});
 pace.observe(url,{status:429,headers:new Headers({'Retry-After':'1'})});
 await pace(other);clock=9999;await assert.rejects(pace(url),/cooldown active/);clock=10000;await pace(url);
 pace.observe(url,{status:429});clock=69999;await assert.rejects(pace(url),/cooldown active/);clock=70000;await pace(url);
 pace.observe(other,{status:429,headers:new Headers({'Retry-After':'900'})});clock+=100;await pace(url);
 for(const header of ['invalid','Infinity','-1','1e300']){pace.observe(url,{status:429,headers:new Headers({'Retry-After':header})});clock+=59999;await assert.rejects(pace(url),/cooldown active/);clock++;await pace(url);}
 pace.observe(url,{status:429,headers:new Headers({'Retry-After':'1','X-RateLimit-Remaining':'0','X-RateLimit-Reset':'120'})});clock+=119999;await assert.rejects(pace(url),/cooldown active/);clock++;await pace(url);
 pace.observe(url,{status:200,headers:new Headers({'Retry-After':'900'})});clock+=100;await pace(url);
});
test('concurrent assembly requests are paced before fresh options without changing responses',async()=>{
 let clock=0;const starts=[],optionsAt=[],pace=createEnsemblRequestPacer({now:()=>clock,sleep:async ms=>{clock+=ms;}});
 const urls=Array.from({length:4},(_,i)=>`https://${i%2?'grch37.rest.ensembl.org':'rest.ensembl.org'}/variation/human/rs${i}`);
 const results=await Promise.all(urls.map(url=>retryPGSSource(url,()=>{optionsAt.push(clock);return {body:'unchanged'};},{pace,fetcher:async(u,o)=>{starts.push(clock);assert.equal(u,url);assert.equal(o.body,'unchanged');return {status:503};}})));
 assert.deepEqual(starts,[0,100,200,300]);assert.deepEqual(optionsAt,starts);assert.ok(results.every(r=>r.status===503));
 await pace('https://www.pgscatalog.org/rest/score/PGS000001');assert.equal(clock,300);
 clock+=1000;await pace(urls[0]);assert.equal(clock,1300);
});
test('public source network failures retain exact URL and safe body fingerprint without retries',async()=>{
 const url='https://rest.ensembl.org/variation/human',body=JSON.stringify({ids:['rs123']}),options={method:'POST',body};
 for(const [name,phrase] of [['TimeoutError','request timed out'],['AbortError','request aborted'],['TypeError','network request failed']]){
  const cause=Object.assign(Error('opaque transport detail'),{name});let calls=0;
  await assert.rejects(fetchPGSSource(url,options,async(u,o)=>{calls++;assert.equal(u,url);assert.equal(o,options);throw cause;}),e=>{
   assert.equal(e.cause,cause);assert.ok(e.message.startsWith(url+': '+phrase));assert.ok(e.message.includes(createHash('sha256').update(body).digest('hex')));assert.ok(!e.message.includes('rs123'));return true;
  });assert.equal(calls,1);
 }
 const response={ok:false,status:503};assert.equal(await fetchPGSSource(url,{},async()=>response),response);
 await assert.rejects(fetchPGSSource(url,{},async()=>{throw Error('down');}),{message:url+': network request failed'});
});

test('transport retry recovers with fresh attempt options and keeps the request unchanged',async()=>{
 const url='https://www.pgscatalog.org/rest/score/PGS000001',body='public data',seen=[],delays=[];let calls=0;const response={ok:true,status:200};
 assert.equal(await retryPGSSource(url,()=>({body,signal:AbortSignal.timeout(1000)}),{fetcher:async(u,o)=>{seen.push(o.signal);assert.equal(u,url);assert.equal(o.body,body);if(++calls<3)throw new TypeError('fetch failed');return response;},sleep:async ms=>delays.push(ms)}),response);
 assert.equal(calls,3);assert.equal(new Set(seen).size,3);assert.deepEqual(delays,[2000,4000]);
});
test('transport retry is bounded and never retries rate limits or cancellation',async()=>{
 const url='https://www.pgscatalog.org/rest/score/PGS000001';let calls=0;
 await assert.rejects(retryPGSSource(url,()=>({}),{fetcher:async()=>{calls++;throw new TypeError('fetch failed');},sleep:async()=>{}}),/network request failed/);assert.equal(calls,3);
 for(const code of [429,403,404]){calls=0;const response={ok:false,status:code};assert.equal(await retryPGSSource(url,()=>({}),{fetcher:async()=>{calls++;return response;},sleep:async()=>assert.fail('Unexpected retry')}),response);assert.equal(calls,1);}
 calls=0;await assert.rejects(retryPGSSource(url,()=>({}),{fetcher:async()=>{calls++;throw Object.assign(Error('cancelled'),{name:'AbortError'});},sleep:async()=>assert.fail('Unexpected retry')}),/request aborted/);assert.equal(calls,1);
});
