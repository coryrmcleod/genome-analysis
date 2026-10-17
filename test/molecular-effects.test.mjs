import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseMolecularConsequences,validateMolecularConsequences,explainMolecularConsequence} from '../public/molecular-effects.js';
test('consequence parsing preserves source IDs and synonyms without inferring clinical significance',()=>{
 const terms=parseMolecularConsequences('SO:0001587|nonsense,SO:0001619|non-coding_transcript_variant');validateMolecularConsequences(terms);assert.equal(terms[0].term,'nonsense');assert.match(explainMolecularConsequence(terms[0]),/stop signal/);assert.match(explainMolecularConsequence({id:'SO:0001587',term:'missense_variant'}),/Source consequence term/);assert.throws(()=>parseMolecularConsequences('SO:0001587|<script>'));assert.deepEqual(parseMolecularConsequences('.'),[]);
});
test('installed consequence annotations retain exact allele records and source snapshot provenance',()=>{
 for(const name of ['clinical-library','short-variant-library']){const l=JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));assert.equal(l.molecularConsequenceSource.sha256,l.sourceHashes?.GRCh38||l.sourceSha256);assert.equal(l.molecularConsequenceSource.releaseDate,l.releaseDate);for(const r of l.records)for(const a of r.clinvar){validateMolecularConsequences(a.molecularConsequences);assert.ok(Array.isArray(a.molecularConsequences));}}
});
