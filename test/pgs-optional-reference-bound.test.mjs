import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {validateSensitivityReference} from '../public/pgs-sensitivity.js';import {coherentSensitivity} from '../public/pgs-coherent.js';import {termForBuild} from '../public/pgs-build-alleles.js';
const reference=JSON.parse(await readFile(new URL('../public/data/pgs-score-sensitivity.json',import.meta.url))),library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),targets=new Map(library.targets.map(t=>[t.id,t]));
function target(row){const source=library.models.find(m=>m.id===row.id),uncertain=new Set(row.orientationBasis.terms.map(t=>t.id));return {terms:source.variants.map(v=>{const t=termForBuild(v,'GRCh38');return {...t,mapping:targets.get(t.id).mappings.GRCh38,genotype:t.effectAllele+'/'+t.otherAllele,status:uncertain.has(t.id)?'Strand ambiguous':'Called',contribution:uncertain.has(t.id)?null:t.weight}})}}
const validate=row=>validateSensitivityReference({...reference,models:[row]});
test('optional reference bounds reject invalid explicit values before reference loading or direct calculation',()=>{
 for(const id of ['PGS000034','PGS003859','PGS000824']){const row=reference.models.find(m=>m.id===id),model=target(row);assert.equal(validate(row).models[0],row);
  for(const fields of [{referenceLower:NaN},{referenceUpper:Infinity},{referenceLower:Infinity},{referenceLower:null},{referenceUpper:null},{referenceLower:'0'},{referenceLower:1,referenceUpper:-1}]){
   const changed=structuredClone(row);Object.assign(changed.orientationBasis,fields);assert.throws(()=>validate(changed),/missing-reference bounds/);for(const limit of [512,0])assert.throws(()=>coherentSensitivity(model,changed,limit),/missing-reference bounds/);
  }
 }
});
test('absent zero defaults and valid signed optional bounds retain compatibility',()=>{
 const row=reference.models.find(m=>m.id==='PGS003859'),model=target(row),complete=coherentSensitivity(model,row);assert.deepEqual([complete.lower,complete.upper],[10.934393638170974,100]);
 const absent=structuredClone(row);delete absent.orientationBasis.referenceLower;delete absent.orientationBasis.referenceUpper;assert.equal(validate(absent).models[0],absent);assert.deepEqual(coherentSensitivity(model,absent),complete);
 for(const fields of [{referenceLower:-1,referenceUpper:1},{referenceLower:-1},{referenceUpper:1},{referenceLower:0,referenceUpper:0}]){const changed=structuredClone(absent);Object.assign(changed.orientationBasis,fields);validate(changed);const result=coherentSensitivity(model,changed);assert.ok(result.lower>=0&&result.lower<=result.upper&&result.upper<=100)}
 const missing=structuredClone(reference.models.find(m=>m.id==='PGS000824'));delete missing.orientationBasis.referenceLower;assert.throws(()=>validate(missing),/missing-reference bounds/);assert.throws(()=>coherentSensitivity(target(missing),missing),/missing-reference bounds/);
 assert.equal(validateSensitivityReference(reference),reference);
});
