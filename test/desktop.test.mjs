import test from 'node:test';
import assert from 'node:assert/strict';
import {localPath,preparationProgress} from '../desktop/prepare.mjs';
test('desktop preparation accepts local selected paths and rejects network, relative and control-character paths',()=>{
  assert.equal(localPath('D:\\Genome Data\\sample.vcf.gz'),'D:\\Genome Data\\sample.vcf.gz');
  for(const value of ['https://example.com/data','\\\\server\\share\\file','..\\file','C:\\file\n--option',null])assert.throws(()=>localPath(value));
});
test('preparation percentages advance only after completed steps and finish at 100',()=>{
 const events=[],steps=preparationProgress(event=>events.push(event));
 for(let i=0;i<14;i++){steps.begin('Working');steps.begin('Still working');assert.equal(events.at(-1).percent,Math.floor(i*100/14));steps.complete();}
 steps.begin('Complete');assert.equal(events[0].percent,0);assert.equal(events.at(-1).percent,100);assert.throws(()=>steps.complete(),/Unexpected preparation step/);
});
