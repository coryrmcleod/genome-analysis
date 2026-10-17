import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {validateSensitivityReference} from '../public/pgs-sensitivity.js';import {coherentSensitivity} from '../public/pgs-coherent.js';import {termForBuild} from '../public/pgs-build-alleles.js';
const raw=await readFile(new URL('../public/data/pgs-score-sensitivity.json',import.meta.url)),reference=JSON.parse(raw),library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),small=reference.models.find(row=>row.id==='PGS000034'),large=reference.models.find(row=>row.id==='PGS000824'),targets=new Map(library.targets.map(target=>[target.id,target]));
function syntheticTarget(row){const source=library.models.find(model=>model.id===row.id),uncertain=new Set(row.orientationBasis.terms.map(term=>term.id));return {terms:source.variants.map(original=>{const term=termForBuild(original,'GRCh38');return {...term,mapping:targets.get(term.id).mappings.GRCh38,genotype:term.effectAllele+'/'+term.otherAllele,status:uncertain.has(term.id)?'Strand ambiguous':'Called',contribution:uncertain.has(term.id)?null:term.weight}})}}
const smallTarget=syntheticTarget(small),largeTarget=syntheticTarget(large);
const validate=row=>validateSensitivityReference({...reference,models:[row]});
test('all 503 score and base-vector positions must be explicit',()=>{
 assert.equal(validateSensitivityReference(reference),reference);assert.equal(small.sampleCount,503);
 for(const key of ['lowerScores','centralScores','upperScores','baseScores'])for(let index=0;index<503;index++){
  const changed=structuredClone(small),array=key==='baseScores'?changed.orientationBasis.baseScores:changed[key];delete array[index];assert.throws(()=>validate(changed),/sensitivity bounds|orientation basis/);assert.equal(Object.hasOwn(array,index),false);
  if(key==='baseScores')for(const limit of [512,0])assert.throws(()=>coherentSensitivity(smallTarget,changed,limit),/orientation basis/);
 }
 assert.equal(createHash('sha256').update(raw).digest('hex'),'c667c4d88ac52c0075ff1ee51973ba5cc5169eff0f5ecc549d7c0bc4927981a2');
});
test('orientation terms, candidates and every contribution entry must be explicit before either calculation path',()=>{
 const changes=[row=>delete row.orientationBasis.terms[0],row=>delete row.orientationBasis.terms[0].candidates[0],row=>delete row.orientationBasis.terms[0].contributions[0]];
 for(const index of [0,251,502])for(const value of ['hole',undefined,null,NaN,Infinity])changes.push(row=>{const vector=row.orientationBasis.terms[0].contributions[0];if(value==='hole')delete vector[index];else vector[index]=value});
 for(const change of changes){const row=structuredClone(small);change(row);assert.throws(()=>validate(row),/orientation basis|orientation vectors/);for(const limit of [512,0])assert.throws(()=>coherentSensitivity(smallTarget,row,limit),/orientation basis|orientation vectors/)}
});
test('the actual large-scenario shortcut cannot silently narrow a synthetic sensitivity interval',()=>{
 assert.equal(large.orientationBasis.terms.length,252);const complete=coherentSensitivity(largeTarget,large);assert.equal(complete.scenarioCount,null);assert.deepEqual([complete.lower,complete.upper],[0,100]);
 for(const index of [0,251,502]){const changed=structuredClone(large);delete changed.orientationBasis.baseScores[index];assert.throws(()=>validate(changed),/orientation basis/);assert.throws(()=>coherentSensitivity(largeTarget,changed),/orientation basis/)}
 assert.deepEqual(coherentSensitivity(largeTarget,JSON.parse(JSON.stringify(large))),complete);
});
