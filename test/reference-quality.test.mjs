import test from 'node:test';import assert from 'node:assert/strict';
import {addReferenceQuality} from '../public/reference-quality.js';
const row=(gt,gq,dp=30)=>`chr1\t10\t.\tA\t.\t50\t.\t.\tGT:DP:GQ\t${gt}:${dp}:${gq}`;
test('reference GQ requires both caller agreement and identical depth; never replaces existing quality',()=>{
 const header='#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS\n';
 assert.equal(addReferenceQuality(header+row('0/0','.'),header+row('0/0','80')).supplemented,1);
 for(const [a,b] of [[row('0/0','.'),row('0/1','80')],[row('0/0','.'),row('0/0','80',29)],[row('0/0','10'),row('0/0','80')],[row('./.','.'),row('0/0','80')],[row('0/0','.'),row('0/0','.')]])assert.equal(addReferenceQuality(header+a,header+b).supplemented,0);
});
