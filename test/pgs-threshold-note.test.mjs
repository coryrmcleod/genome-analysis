import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticThresholdNote,expandedScoreContext} from '../public/expanded-score-context.js';

test('automatic threshold discrepancy appears in shared screen/export context without changing model',()=>{
 const m={id:'PGS004119',publication:{PMID:38908374},method:'pt_clump.auto',methodParameters:'r2 = 0.1, window = 250kb,  p = 1e-23',variants:[{weight:0.25}]},before=JSON.stringify(m);
 assert.match(expandedScoreContext(m),/taller stature/);
 assert.match(expandedScoreContext(m),/Catalog lists a threshold of 1e-23/);
 assert.match(expandedScoreContext(m),/correspondence.*remains unverified/);
 assert.equal(JSON.stringify(m),before);
 for(const patch of [{publication:{PMID:1}},{method:'pt_clump_nested.CV'},{methodParameters:'p = 1e-8'},{methodParameters:'p = <script>'}])assert.equal(automaticThresholdNote({...m,...patch}),'');
});
