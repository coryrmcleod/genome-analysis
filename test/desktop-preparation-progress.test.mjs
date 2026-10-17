import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../desktop/prepare-ui.js',import.meta.url),'utf8');
async function harness(){
 const elements=new Map(['start','status','log','setup-status','check','windows','tools','activity'].map(id=>[id,{textContent:'',hidden:true,disabled:false,addEventListener(kind,callback){this[kind]=callback;}}]));
 let progress,resolve,reject,now=0,id=0;const modes=[];const timers=new Map();
 vm.runInNewContext(source,{document:{querySelector:selector=>elements.get(selector.slice(1))},window:{genomePreparation:{setup:async()=>({state:'ready',message:'Ready'}),onProgress:callback=>{progress=callback;},start:mode=>{modes.push(mode);return new Promise((yes,no)=>{resolve=yes;reject=no;});}}},Date:{now:()=>now},setInterval:callback=>{timers.set(++id,callback);return id;},clearInterval:key=>timers.delete(key)});
 await Promise.resolve();await Promise.resolve();
 return {elements,timers,modes,progress:event=>progress(event),finish:message=>resolve(message),fail:()=>reject(Error('failed')),tick:seconds=>{now+=seconds*1000;for(const callback of timers.values())callback();}};
}
test('preparing shows its stage without percentages while elapsed activity continues through a long step',async()=>{
 const h=await harness(),status=h.elements.get('status'),activity=h.elements.get('activity');
 h.progress({percent:71,stage:'Calling missing positions'});assert.equal(status.textContent,'');
 const pending=h.elements.get('start').click();assert.equal(status.textContent,'Preparing…');
 h.progress({percent:71,stage:'Calling missing positions'});assert.equal(status.textContent,'Preparing… Calling missing positions');assert.equal(activity.hidden,false);assert.equal(h.timers.size,1);
 h.tick(125);assert.equal(activity.textContent,'Working · 2:05 elapsed');assert.equal(status.textContent,'Preparing… Calling missing positions');
 assert.doesNotMatch(status.textContent,/%/);
 h.progress('Processing output\n');assert.equal(h.elements.get('log').textContent,'Processing output\n');assert.equal(h.timers.size,1);
 h.progress({percent:100,stage:'Complete'});h.finish('Finished. Select this file in Analyze VCF.');await pending;
 assert.equal(status.textContent,'Finished. Select this file in Analyze VCF.');assert.equal(activity.hidden,true);assert.equal(h.timers.size,0);assert.equal(h.elements.get('start').disabled,false);
});
test('failure, cancellation and retry stop activity and reset the elapsed clock',async()=>{
 const h=await harness(),start=h.elements.get('start'),activity=h.elements.get('activity');
 let pending=start.click();h.progress({percent:7,stage:'Checking processing tools'});h.tick(60);h.fail();await pending;assert.equal(h.elements.get('status').textContent,'Unable to start preparation.');assert.equal(h.timers.size,0);assert.equal(activity.hidden,true);
 pending=start.click();h.progress({percent:0,stage:'Checking selected files'});assert.equal(activity.textContent,'Working · 0:00 elapsed');h.finish('Cancelled.');await pending;assert.equal(h.timers.size,0);assert.equal(activity.hidden,true);
 h.progress({percent:90,stage:'Late event'});assert.equal(h.elements.get('status').textContent,'Cancelled.');
});

test('the sole preparation button always includes ancestry and locks until completion',async()=>{
 const h=await harness();
 for(let run=0;run<2;run++){
  const pending=h.elements.get('start').click();assert.equal(h.modes.at(-1),true);
  for(const button of ['start','check','windows','tools'])assert.equal(h.elements.get(button).disabled,true);
  h.finish('Cancelled.');await pending;
  assert.equal(h.elements.get('start').disabled,false);
 }
});
