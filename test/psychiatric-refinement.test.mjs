import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicationEvidence,SELECTED_SCORES} from '../scripts/import-pgs-library.mjs';
import {validatePGSLibrary} from '../public/pgs.js';
import {psychologicalContext} from '../public/psychological-score-context.js';
const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
test('alternative publication exception binds the exact reviewed file and publication',()=>{
 const selected=SELECTED_SCORES.find(s=>s.id==='PGS000193'),model=library.models.find(m=>m.id===selected.id);
 const meta={matches_publication:false,publication:model.publication};
 assert.deepEqual(publicationEvidence(meta,selected,model.sourceFiles.original.sha256),{matchesPublication:false,publicationCaveat:model.publicationCaveat});
 assert.throws(()=>publicationEvidence(meta,selected,'0'.repeat(64)),/Unreviewed/);
 assert.throws(()=>publicationEvidence({...meta,publication:{PMID:1}},selected,model.sourceFiles.original.sha256),/Unreviewed/);
 assert.throws(()=>publicationEvidence(meta,{allowExternalPublication:true},model.sourceFiles.original.sha256),/Unreviewed/);
 assert.deepEqual(publicationEvidence({matches_publication:true},{},'unused'),{matchesPublication:true});
 const changed=structuredClone(library);delete changed.models.find(m=>m.id===selected.id).publicationCaveat;
 assert.throws(()=>validatePGSLibrary(changed),/publication caveat/);
});
test('depression model caveats are explicit and unsafe imported URLs cannot enter context HTML',()=>{
 const html=psychologicalContext({id:'PGS000193',pgcSource:{url:'javascript:alert(1)" onmouseover="alert(2)'}});
 assert.match(html,/author-supplied alternative/);assert.match(html,/UK Biobank excluded/);
 assert.doesNotMatch(html,/javascript:|onmouseover/);
 assert.equal(psychologicalContext({id:'constructor'}),'');
 const model=library.models.find(m=>m.id==='PGS003442');
 assert.equal(model.variantCount,8);assert.equal(model.matchesPublication,true);
 assert.ok(model.variants.every(v=>v.alleleMode==='effect-only'&&v.otherAllele===null));
 assert.ok(model.studySamples.variantAssociation.every(s=>s.source_PMID===30718901));
 assert.match(psychologicalContext(model),/not clinical diagnosis/);
 assert.match(psychologicalContext(model),/must not be averaged/);
});
test('new depression model retains four unresolved orientations without inventing an exact reference rank',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url))).models.find(m=>m.id==='PGS003442');
 const exact=read('pgs-score-reference'),sensitivity=read('pgs-score-sensitivity');
 assert.equal(exact.status,'Unavailable');assert.match(exact.reason,/4 scoring terms/);
 assert.equal(sensitivity.status,'Available');assert.equal(sensitivity.uncertainTerms,4);
 assert.deepEqual(sensitivity.missingReferenceTerms,[]);
 assert.equal(sensitivity.sampleCount,503);
});
test('alcohol-related endpoint context does not infer behavior or transfer covariate-adjusted performance',()=>{
 const text=psychologicalContext({id:'PGS018956'});
 assert.match(text,/not a measurement of drinking/);assert.match(text,/185 cases/);
 assert.match(text,/does not reproduce that adjusted prediction model/);
 assert.match(text,/European reference ranks are withheld/);
});
