import test from 'node:test';import assert from 'node:assert/strict';import {possibleEffectDosages} from '../public/effect-only-pgs.js';
test('effect-only dosage requires every genotype and candidate entry to be an explicit base string',()=>{
 for(const index of [0,1])for(const value of [undefined,null,new String('A'),{},1,'','N','AA']){const gt=['A','A'];gt[index]=value;assert.throws(()=>possibleEffectDosages(gt,['A']),/Invalid effect-only/);}
 for(const index of [0,1]){const gt=['A','A'];delete gt[index];assert.throws(()=>possibleEffectDosages(gt,['A']),/Invalid effect-only/);const candidates=['A','T'];delete candidates[index];assert.throws(()=>possibleEffectDosages(['A','A'],candidates),/Invalid effect-only/);}
 for(const value of [undefined,null,new String('A'),{},1,'','N','AA'])assert.throws(()=>possibleEffectDosages(['A','A'],[value]),/Invalid effect-only/);
 assert.throws(()=>possibleEffectDosages(Array(2),['A']),/Invalid effect-only/);assert.throws(()=>possibleEffectDosages(['A','A'],Array(1)),/Invalid effect-only/);
 for(const a of ['A','C','G','T'])for(const b of ['A','C','G','T']){const genotype=[a,b],candidates=['A','T'],before=JSON.stringify([genotype,candidates]);assert.deepEqual(possibleEffectDosages(genotype,candidates),[...new Set(candidates.map(c=>Number(a===c)+Number(b===c)))].sort((x,y)=>x-y));assert.equal(JSON.stringify([genotype,candidates]),before);}
 assert.deepEqual(possibleEffectDosages(['A','T'],['A','A','T']),[1]);
});
