import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
test('local server serves app with CSP and refuses uploads and private paths',async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  try{const index=await fetch(base);assert.equal(index.status,200);assert.match(await index.text(),/A clearer view/);assert.match(index.headers.get('content-security-policy'),/connect-src 'self'/);assert.equal((await fetch(base,{method:'POST',body:'genome'})).status,405);assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/..%2fpackage.json')).status,403);assert.equal((await fetch(base+'/data/catalog.json')).status,200);}finally{await new Promise(resolve=>server.close(resolve));}
});
