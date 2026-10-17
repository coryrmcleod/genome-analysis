import test from 'node:test';
import assert from 'node:assert/strict';
import {externalWebURL} from '../desktop/external-links.mjs';
test('reference links can open in the default browser',()=>{
  for(const url of ['https://www.ncbi.nlm.nih.gov/clinvar/docs/review_status/','https://www.internationalgenome.org/category/population/'])assert.equal(externalWebURL(url,'http://127.0.0.1:4317'),url);
});
test('external opening rejects executable protocols, credentials and app navigation',()=>{
  for(const url of ['file:///C:/Windows/system32/cmd.exe','javascript:alert(1)','ms-settings:','data:text/html,test','https://user:pass@example.com/','http://127.0.0.1:4317/#workspace','invalid'])assert.equal(externalWebURL(url,'http://127.0.0.1:4317'),null);
});
