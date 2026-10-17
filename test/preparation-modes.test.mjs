import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {alignmentPreparationArguments,prepare} from '../desktop/prepare.mjs';
import {selectPreparationFiles,validatePreparationMode} from '../desktop/preparation-selection.mjs';
import {ancestryCallingMode,preparationAncestryTargets} from '../scripts/call-alignment.mjs';
test('desktop modes preserve all required calling arguments and pass explicit ancestry choice',()=>{
 const inputs={scripts:'/scripts',alignment:'/test.bam',reference:'/test.fa',linuxRoot:'/output',original:'/test.vcf.gz'};
 const without=alignmentPreparationArguments(inputs,false),withAncestry=alignmentPreparationArguments(inputs,true);
 assert.deepEqual(without.slice(0,-1),withAncestry.slice(0,-1));
 assert.equal(without.at(-1),'false');assert.equal(withAncestry.at(-1),'true');
 for(const key of ['--alignment','--reference','--build','--output','--missing-from'])assert.ok(without.includes(key));
 for(const value of [undefined,null,'false',0])assert.throws(()=>validatePreparationMode(value));
 assert.equal(ancestryCallingMode(),true);assert.equal(ancestryCallingMode('false'),false);assert.throws(()=>ancestryCallingMode('invalid'));
});
test('without ancestry never loads its reference or adds markers; with ancestry loads validated public targets',async()=>{
 let calls=0;const without=await preparationAncestryTargets(false,()=>{calls++;throw Error('must not load');});
 assert.equal(calls,0);assert.deepEqual(without,{reference:null,records:[]});
 const withAncestry=await preparationAncestryTargets(true);assert.ok(withAncestry.records.length>3000);assert.equal(withAncestry.records.length,withAncestry.reference.markers.length);
 await assert.rejects(preparationAncestryTargets(true,async()=>'{"invalid":true}'));
});
test('file chooser retains VCF, alignment, FASTA and output selection and cancels at each step',async()=>{
 const paths=['C:\\Synthetic\\test.vcf.gz','C:\\Synthetic\\test.bam','C:\\Synthetic\\test.fa','C:\\Synthetic'];
 for(let cancel=0;cancel<4;cancel++){
  let calls=0;const chosen=await selectPreparationFiles({showOpenDialog:async()=>{const i=calls++;return {canceled:i===cancel,filePaths:[paths[i]]};}},{});
  assert.equal(chosen,null);assert.equal(calls,cancel+1);
 }
 const requests=[];const selected=await selectPreparationFiles({showOpenDialog:async(parent,options)=>{requests.push(options);return {filePaths:[paths[requests.length-1]]};}},{});
 assert.deepEqual(Object.values(selected),paths);assert.deepEqual(requests[3].properties,['openDirectory','createDirectory']);
 assert.deepEqual(requests.slice(0,3).map(r=>r.filters[0].extensions),[['gz'],['cram','bam'],['fa','fasta']]);
 await assert.rejects(selectPreparationFiles({showOpenDialog:async()=>({filePaths:[]})},{}),/No file/);
});
test('invalid source extension or missing synthetic files stop before processing',async()=>{
 const inputs={original:'C:\\Synthetic\\test.txt',alignment:'C:\\Synthetic\\test.bam',reference:'C:\\Synthetic\\test.fa',parent:'C:\\Synthetic'};
 for(const mode of [true,false]){
  await assert.rejects(prepare(inputs,'C:\\Synthetic',()=>{},mode),/Select a .vcf.gz/);
  await assert.rejects(prepare({...inputs,original:'C:\\Synthetic\\missing.vcf.gz'},'C:\\Synthetic',()=>{},mode),/ENOENT/);
 }
});
test('dialog offers only ancestry preparation and explains the potentially long wait',()=>{
 const html=readFileSync(new URL('../desktop/prepare.html',import.meta.url),'utf8');
 assert.match(html,/id="start" aria-describedby="preparation-duration">Prepare VCF with ancestry/);
 assert.match(html,/id="preparation-duration">This step may take a long time/);
 assert.match(html,/20 minutes or more/);
 assert.doesNotMatch(html,/without ancestry|start-ancestry|Both options|percentage/i);
});
