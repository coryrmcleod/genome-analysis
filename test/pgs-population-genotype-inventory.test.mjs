import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {estimatePGS,hasCompletePopulationGenotypes} from '../public/pgs-estimate.js';
const model={inputFormat:'VCF',matched:1,terms:[{id:'rs1',weight:.1,status:'Called',dosage:1,contribution:.1},{id:'rs2',weight:.2,status:'Not observed',effectAllele:'A',otherAllele:'C',mapping:{alleles:['A','C']},contribution:null}]};
const reference=group=>({records:{rs2:{status:'Verified public forward mapping',sourceURL:'https://example.test/synthetic',populations:{EUR:group}}}});
test('duplicate or incomplete genotype categories never supply a population mode',()=>{
 const groups=[{sampleCount:503,genotypes:[{genotype:'A/A',count:130},{genotype:'A/A',count:130},{genotype:'A/C',count:243}]},{sampleCount:503,genotypes:[{genotype:'A/A',count:243},{genotype:'A/C',count:130},{genotype:'C/A',count:130}]}];
 for(const genotype of ['A','A/C/G','A/',' /C'])groups.push({sampleCount:503,genotypes:[{genotype:'A/A',count:300},{genotype,count:203}]});
 const hole={sampleCount:503,genotypes:[{genotype:'A/A',count:260},{genotype:'A/C',count:243},{genotype:'C/C',count:0}]};delete hole.genotypes[2];groups.push(hole);
 for(const group of groups){const before=structuredClone(group);assert.equal(hasCompletePopulationGenotypes(group),false);const result=estimatePGS(model,reference(group),'EUR');assert.equal(result.assumedTerms,0);assert.equal(result.unresolvedTerms,1);assert.equal(result.lower,.1);assert.equal(result.upper,.5);assert.equal(result.unconditionalLower,.1);assert.equal(result.unconditionalUpper,.5);assert.equal(result.terms[0].frequency,null);assert.deepEqual(result.terms[0].assumedGenotypes,[]);assert.deepEqual(group,before)}
});
test('unique categories, legitimate ties and unused third-allele rows retain complete source counts',()=>{
 const examples=[{rows:[{genotype:'A/A',count:260},{genotype:'A/C',count:243}],expected:['A/A']},{rows:[{genotype:'A/A',count:200},{genotype:'A/C',count:200},{genotype:'C/C',count:103}],expected:['A/A','A/C']},{rows:[{genotype:'C/A',count:300},{genotype:'A/A',count:203}],expected:['C/A']},{rows:[{genotype:'A/A',count:260},{genotype:'A/C',count:192},{genotype:'G/G',count:51}],expected:['A/A']}];
 for(const example of examples){const group={sampleCount:503,genotypes:example.rows},before=structuredClone(group);assert.equal(hasCompletePopulationGenotypes(group),true);const result=estimatePGS(model,reference(group),'EUR');assert.equal(result.assumedTerms,1);assert.deepEqual(result.terms[0].assumedGenotypes,example.expected);assert.equal(result.terms[0].sampleCount,503);assert.equal(result.unconditionalLower,.1);assert.equal(result.unconditionalUpper,.5);assert.deepEqual(group,before)}
});
test('the complete installed genotype inventory remains usable without rewriting source rows',async()=>{
 const bytes=await readFile(new URL('../public/data/pgs-populations.json',import.meta.url)),source=JSON.parse(bytes);let groups=0,rows=0;
 for(const record of Object.values(source.records))for(const group of Object.values(record.populations||{}))if(Array.isArray(group.genotypes)){groups++;rows+=group.genotypes.length;assert.equal(hasCompletePopulationGenotypes(group),true)}
 assert.equal(groups,69685);assert.equal(rows,204705);assert.equal(createHash('sha256').update(bytes).digest('hex'),'8064ae217efc7de683b5b98eff7a7ccb6a6f8bf9fec7b8c819647d04284b80c2');
});
