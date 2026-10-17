import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {editionFetch, LibraryNotIncludedError, withheldLibraries} from '../public/public-edition.js';

test('withheld reference data never trigger a download and permitted requests are preserved', async t => {
  const requests = [];
  const request = t.mock.method(globalThis, 'fetch', async (...args) => { requests.push(args); return {ok:true}; });
  for (const name of withheldLibraries) await assert.rejects(editionFetch('./data/'+name), LibraryNotIncludedError);
  assert.equal(request.mock.callCount(), 0);
  const options = {method:'GET'};
  assert.deepEqual(await editionFetch('./data/catalog.json', options), {ok:true});
  assert.deepEqual(requests, [['./data/catalog.json', options]]);
});

test('release inventory exactly preserves included snapshots and omits withheld datasets', async () => {
  const audit = JSON.parse(await readFile(new URL('../docs/data-rights-audit.json', import.meta.url)));
  assert.equal(audit.withheldScoreModels.length, 354);
  for (const entry of audit.datasets) {
    const url = new URL('../public/data/'+entry.file, import.meta.url);
    if (!entry.included) { await assert.rejects(access(url)); continue; }
    const bytes = await readFile(url);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /not included in this public edition/);
  assert.match(html, /id="cram-workflow" hidden/);
});
