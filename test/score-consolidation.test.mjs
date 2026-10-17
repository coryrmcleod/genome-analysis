import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {consolidateScoreEntries,scoreSummaryHtml} from '../public/score-browser.js';
const library=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
const models=library.models.filter(m=>/parkinson/i.test(m.family)).map(m=>({...m,terms:m.variants,total:m.variantCount,matched:0}));
test('identical Parkinson formulas consolidate, preserving distinct models and all study links',()=>{
 const before=JSON.stringify(models),groups=consolidateScoreEntries(models);
 assert.equal(groups.length,4);assert.deepEqual(groups.filter(g=>g.equivalents.length).map(g=>[g.model.total,g.equivalents.length]).sort((a,b)=>a[0]-b[0]),[[44,1],[90,1]]);
 assert.equal(JSON.stringify(models),before);
 const html=scoreSummaryHtml(models,{}, {'score:PGS004924':{pinned:true}});
 for(const m of models)assert.ok(html.includes('href="#score-'+m.id+'"'));
 assert.match(html,/data-pin="score:PGS004924"[^>]+aria-pressed="true"/);
 assert.equal((html.match(/<tr><td>/g)||[]).length,4);
});
test('filtered or older reports preserve accessible records and changed formulas never collapse',()=>{
 const pair=models.filter(m=>['PGS003763','PGS012584'].includes(m.id));
 assert.equal(consolidateScoreEntries([pair[1]]).length,1);
 const changed=structuredClone(pair);changed[1].terms[0].weight+=.001;assert.equal(consolidateScoreEntries(changed).length,2);
 const incomplete=structuredClone(pair);incomplete[1].terms.pop();assert.equal(consolidateScoreEntries(incomplete).length,2);
 assert.equal(consolidateScoreEntries(pair.map(m=>({...m,terms:undefined,variants:undefined}))).length,2);
});
