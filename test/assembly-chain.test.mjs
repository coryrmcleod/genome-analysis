import test from 'node:test';import assert from 'node:assert/strict';
import {chainIntervalMappings as map} from '../scripts/assembly-chain.mjs';
test('chain coordinate conversion preserves interval boundaries on both orientations',()=>{
 const plus='chain 1 chr1 1000 + 100 120 chr2 2000 + 300 320 1\n20\n';
 const minus=plus.replace('+ 300 320','- 300 320');
 assert.deepEqual(map(plus,'chr1',105,106)[0],{chainId:'1',sourceChrom:'chr1',sourceStart:105,sourceEnd:106,targetChrom:'chr2',targetStart:305,targetEnd:306,strand:1});
 assert.equal(map(minus,'chr1',105,106)[0].targetStart,1694);
 assert.equal(map(plus,'chr1',120,121).length,0);
 assert.equal(map(plus,'chr1',99,101).length,0);
 assert.equal(map(plus+minus,'chr1',105,106).length,2);
});
test('chain gaps and malformed or incomplete chains cannot supply a transform',()=>{
 const text='chain 1 chr1 1000 + 100 125 chr2 2000 + 300 322 1\n10 5 2\n10\n';
 assert.equal(map(text,'chr1',110,111).length,0);
 assert.equal(map(text,'chr1',109,116).length,0);
 assert.equal(map(text,'chr1',115,116)[0].targetStart,312);
 for(const bad of [text.replace('10 5 2','10 4 2'),text.replace('10\n','11\n'),text.replace(/10\n$/,''),text.replace('100 125','100 124')])assert.throws(()=>map(bad,'chr1',105,106));
});

test('chain headers cannot overwrite unfinished evidence or escape declared safe bounds',()=>{
 const valid='chain 1 chr1 1000 + 100 120 chr2 2000 + 300 320 1\n20\n';
 const invalid=['chain 1 chr9 1000 + 100 120 chr9 2000 + 300 320 2\n10 0 0\n'+valid,valid.replace('chr1 1000','chr1 110'),valid.replace('chr2 2000','chr2 310'),valid.replace('chr2 2000','chr2 9007199254740993'),valid.replace('100 120','120 100'),valid.replace('300 320','320 300'),valid.replace('chr1 1000','chr1 0'),valid.replace('\n20\n','\n9007199254740993\n')];
 for(const text of invalid)assert.throws(()=>map(text,'chr1',105,106));
 const other=valid.replaceAll('chr1','chr9').replace(' 1\n',' 2\n');
 assert.deepEqual(map(other+valid,'chr1',105,106),map(valid,'chr1',105,106));
});

test('accepted safe-integer chain endpoints agree with exact integer arithmetic',()=>{
 const max=Number.MAX_SAFE_INTEGER,source=max-5000,target=max-6000;
 for(const strand of ['+','-'])for(const [offset,length] of [[0,1],[1,1],[2,1],[3,1],[17,1],[50,1],[99,1],[0,100]]){
  const text=`chain 1 chr1 ${max} + ${source} ${source+100} chr2 ${max} ${strand} ${target} ${target+100} 1\n100\n`;
  const hit=map(text,'chr1',source+offset,source+offset+length)[0];
  const first=BigInt(target)+BigInt(offset),last=first+BigInt(length);
  assert.equal(hit.targetStart,Number(strand==='-'?BigInt(max)-last:first));
  assert.equal(hit.targetEnd,Number(strand==='-'?BigInt(max)-first:last));
 }
});

test('chain intervals agree with independently constructed per-base gap and orientation mappings',()=>{
 for(let scenario=0;scenario<12;scenario++){
  const chrom='chr'+(1+scenario%3),strand=scenario%2?'-':'+';
  let source=100+scenario*7,target=300+scenario*11;
  const sourceStart=source,targetStart=target,points=new Map(),blocks=[];
  for(let b=0;b<8;b++){
   const size=3+(scenario*13+b*7)%23,ds=1+(scenario+b)%7,dq=1+(scenario+2*b)%9;
   for(let j=0;j<size;j++)points.set(source+j,strand==='-'?9999-(target+j):target+j);
   blocks.push({size,ds,dq});source+=size;target+=size;if(b<7){source+=ds;target+=dq;}
  }
  const text=`chain 1 ${chrom} 10000 + ${sourceStart} ${source} chr4 10000 ${strand} ${targetStart} ${target} ${scenario+1}\n`+blocks.map((b,i)=>i===7?String(b.size):`${b.size} ${b.ds} ${b.dq}`).join('\n')+'\n';
  for(let start=sourceStart-1;start<=source;start++)for(const length of [1,2,5,13]){
   const end=start+length,mapped=Array.from({length},(_,i)=>points.get(start+i));
   const expected=mapped.every(position=>position!==undefined)?[{chainId:String(scenario+1),sourceChrom:chrom,sourceStart:start,sourceEnd:end,targetChrom:'chr4',targetStart:Math.min(...mapped),targetEnd:Math.max(...mapped)+1,strand:strand==='-'?-1:1}]:[];
   assert.deepEqual(map(text,chrom,start,end),expected);
   assert.deepEqual(map(text,'chr22',start,end),[]);
  }
 }
});
