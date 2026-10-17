import test from 'node:test';import assert from 'node:assert/strict';import {ancestryDescription,referencePopulationContext,studySexDescription} from '../public/pgs-context.js';
test('population context distinguishes a scenario source from study ancestry and calibration',()=>{
 const model={ancestry:{gwas:{dist:{EAS:100}}}};assert.match(referencePopulationContext(model,'EUR'),/not separately listed/);assert.match(referencePopulationContext(model,'EAS'),/does not validate/);assert.match(ancestryDescription(model.ancestry.gwas),/East Asian 100%/);assert.equal(ancestryDescription(null),'Not reported');
});
test('unknown sex composition is not coerced to zero or pooled across overlapping studies',()=>{
 assert.match(studySexDescription([{sample_percent_male:null}]),/not reported/);assert.match(studySexDescription([{sample_percent_male:0},{sample_percent_male:null},{sample_percent_male:60}]),/0–60%.*2 of 3/);
});
test('a combined ancestry category does not imply that all participants were European',()=>{
 const model={ancestry:{gwas:{dist:{MAE:100},multi:['MAE_NR','MAE_EUR']}}};
 assert.match(ancestryDescription(model.ancestry.gwas),/100% assigned to this combined category/);
 assert.match(ancestryDescription(model.ancestry.gwas),/constituent ancestry proportions unspecified/);
 assert.doesNotMatch(ancestryDescription(model.ancestry.gwas),/European 100%/);
 assert.match(referencePopulationContext(model,'EUR'),/European participants are included/);
 assert.doesNotMatch(referencePopulationContext(model,'EUR'),/not separately listed/);
});
