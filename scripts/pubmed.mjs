import {searchPubMed,pubmedSummaries} from './reference-api.mjs';
const rsid=process.argv[2];
try{const ids=await searchPubMed(rsid);const publications=await pubmedSummaries(ids);console.log(JSON.stringify({rsid,query:`${rsid}[All Fields]`,retrievedAt:new Date().toISOString(),note:'Reading leads only. Search results are not verified evidence of a particular allele effect.',publications:ids.map(id=>publications[id])},null,2));}
catch(e){console.error(e.message);process.exitCode=1;}
