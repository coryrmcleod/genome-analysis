import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {psychiatricScoreAvailability,psychiatricAvailabilityHtml,PSYCHIATRIC_SCORE_REVIEW} from '../public/psychiatric-score-availability.js';
test('psychiatric availability reflects actual installed models rather than the remote GWAS index',()=>{
 const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url))),before=JSON.stringify(library);
 const rows=psychiatricScoreAvailability(library),installed=new Set(library.models.map(m=>m.id));
 for(const row of rows)for(const entry of row.entries)assert.equal(entry.installed,installed.has(entry.id));
 assert.ok(rows[0].entries.every(m=>m.installed));assert.equal(rows.find(r=>r.condition==='Generalized anxiety disorder').entries[0].installed,false);
 const html=psychiatricAvailabilityHtml(library);assert.match(html,/not a result from your genome/);assert.match(html,/missing score says nothing/);assert.match(html,/No logarithm/);
 assert.equal(JSON.stringify(library),before);assert.equal(new Set(PSYCHIATRIC_SCORE_REVIEW.flatMap(r=>r.models)).size,12);
});
test('availability updates dynamically and escapes installed context without exposing stale rejection text',()=>{
 const html=psychiatricAvailabilityHtml({models:[{id:'PGS018943',coverageContext:'<unsafe> verified synthetic fixture only'}]});
 assert.match(html,/PGS018943 · Installed research model/);assert.match(html,/&lt;unsafe&gt;/);assert.doesNotMatch(html,/<unsafe>/);assert.doesNotMatch(html,/Additional independent mapping evidence is under review/);
 assert.ok(psychiatricScoreAvailability(null).every(r=>r.entries.every(m=>!m.installed)));
});
