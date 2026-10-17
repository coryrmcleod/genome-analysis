import test from 'node:test';
import assert from 'node:assert/strict';
import {createPGSOverlapGuard} from '../public/pgs-overlap-guard.js';
// The oracle scans every target directly. It does not reuse the indexed search,
// VCF extent parsing, chromosome normalization or guard result to set expectations.
const targets=Array.from({length:240},(_,i)=>({id:`rs${i+1}`,mappings:{GRCh37:{chrom:String(1+i%4),position:100+17*Math.floor(i/4),ref:'A'},GRCh38:{chrom:String(1+(i+1)%4),position:1000+19*Math.floor(i/4),ref:'A'}}}));
for(const build of ['GRCh37','GRCh38'])test(`deletion overlap search agrees with independent intervals and sample selection on ${build}`,()=>{
 for(let batch=0;batch<24;batch++)for(const sampleIndex of [0,1]){
  const guard=createPGSOverlapGuard([...targets].reverse(),{build,sampleCount:2,sampleIndex}),expected=new Set();
  for(let i=0;i<48;i++){
   const anchor=targets[(batch*31+i*13)%targets.length].mappings[build];
   const start=anchor.position+(i%3-1),end=start+(i*7+batch)%45;
   const kind=i%2===0?'symbolic':'literal';
   const hasDeletion=[(i+batch)%3!==0,(i+2*batch)%4!==0];
   const passed=(i+batch)%7!==0;
   const fields=[i%2?'chr'+anchor.chrom:anchor.chrom,String(start),'.',kind==='literal'?'A'.repeat(end-start+1):'A',kind==='literal'?'A':'<DEL>','80',passed?'PASS':'LowQual',kind==='literal'?'.':`END=${end}`,'GT:GQ:DP',...hasDeletion.map(called=>called?'0/1:60:30':'0/0:60:30')];
   // A one-base literal A>A row is not a deletion and cannot block a SNP.
   if(passed&&hasDeletion[sampleIndex]&&(kind==='symbolic'||end>start))for(const target of targets){const m=target.mappings[build];if(m.chrom===anchor.chrom&&m.position>=start&&m.position<=end)expected.add(target.id);}
   guard.consume(fields);
  }
  assert.deepEqual([...guard.finish()].sort(),[...expected].sort(),`${build} batch ${batch} sample ${sampleIndex}`);
 }
});
