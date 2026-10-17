import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateAncestryReference} from '../public/ancestry.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('installed training-only marker selection binds the frozen public split and exact population inventories',async()=>{
 const panel=validateAncestryReference(JSON.parse(await readFile(new URL('../public/data/ancestry-reference.json',import.meta.url))));
 const bytes=await readFile(new URL('fixtures/ancestry/sample-partition.json',import.meta.url)),partition=JSON.parse(bytes);
 assert.equal(panel.sources.trainingOnlySelection.partitionSha256,hash(bytes));
 assert.equal(panel.sources.trainingOnlySelection.originalPreparedSha256,partition.sourcePreparedSha256);
 assert.equal(partition.seed,panel.validation.seed);
 assert.equal(partition.training.length,partition.trainingSamples);assert.equal(partition.heldout.length,partition.heldOutSamples);
 const all=[...partition.training,...partition.heldout];assert.equal(new Set(all.map(row=>row.iid)).size,all.length);
 for(const [key,rows] of [['training.keep',partition.training],['heldout.keep',partition.heldout]])assert.equal(hash(Buffer.from('#IID\n'+rows.map(row=>row.iid).join('\n')+'\n')),partition.keepSha256[key]);
 assert.equal(partition.trainingSamples,panel.validation.trainingSamples);assert.equal(partition.heldOutSamples,panel.validation.heldOutSamples);
 assert.equal(new Set(all.map(row=>row.population)).size,panel.populations.length);
 for(const population of panel.populations){
  const training=partition.training.filter(row=>row.population===population.code),heldout=partition.heldout.filter(row=>row.population===population.code);
  assert.equal(training.length,population.sampleCount);assert.equal(heldout.length,population.validationCount);assert.equal(training.length+heldout.length,population.totalUnrelatedCount);
  assert.ok([...training,...heldout].every(row=>row.region===population.region));
 }
 for(const group of panel.groups){
  assert.equal(partition.training.filter(row=>row.region===group.code).length,group.sampleCount);
  assert.equal(partition.heldout.filter(row=>row.region===group.code).length,panel.validation.broadGroups[group.code].heldOutSamples);
 }
 assert.match(panel.sources.trainingOnlySelection.markerSelection,/Training individuals only/);
 assert.match(panel.sources.trainingOnlySelection.cohortSelection,/pooled kinship/);
 assert.ok(panel.validation.limitations.some(text=>text.includes('frozen training subset')&&text.includes('pooled kinship')));
});
