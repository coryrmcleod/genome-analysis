import test from 'node:test';import assert from 'node:assert/strict';
import {coherentSensitivity} from '../public/pgs-coherent.js';
import {empiricalPercentile} from '../public/pgs-reference.js';
const gt=[[0,0],[0,1],[1,1],[2,1],[2,2]],weights=[-2,3];
const terms=weights.map((weight,i)=>({id:'rs'+i,weight,status:'Strand ambiguous',genotype:'A/A',mapping:{alleles:['A','T']},contribution:null}));
const basis={baseScores:gt.map(()=>0),terms:terms.map((t,i)=>({id:t.id,candidates:['A','T'],contributions:[gt.map(g=>g[i]*t.weight),gt.map(g=>(2-g[i])*t.weight)]}))};

test('tiny coefficient units retain shared-orientation uncertainty instead of false invariant ties',()=>{
 for(const scale of [1e-100,1e-15,1,1e15])for(let a=0;a<=2;a++)for(let b=0;b<=2;b++){
  const model={terms:terms.map((t,i)=>({...t,weight:t.weight*scale,genotype:['T/T','A/T','A/A'][[a,b][i]]}))};
  const scaled={...basis,terms:basis.terms.map(t=>({...t,contributions:t.contributions.map(v=>v.map(x=>x*scale))}))};
  const exact=coherentSensitivity(model,{orientationBasis:scaled}),bounded=coherentSensitivity(model,{orientationBasis:scaled},0);
  assert.ok(bounded.lower<=exact.lower&&bounded.upper>=exact.upper,JSON.stringify({scale,a,b,exact:[exact.lower,exact.upper],bounded:[bounded.lower,bounded.upper]}));
 }
});
test('shared orientation enumeration equals independent brute force with signed weights and ties',()=>{
 for(let a=0;a<=2;a++)for(let b=0;b<=2;b++){
  const dosages=[a,b],model={terms:terms.map((t,i)=>({...t,genotype:['T/T','A/T','A/A'][dosages[i]]}))};
  const snapshot=JSON.stringify({model,basis});const result=coherentSensitivity(model,{orientationBasis:basis});
  const ranks=[];
  for(let k=0;k<4;k++){
   const score=g=>g.reduce((n,d,i)=>n+weights[i]*((k>>i)&1?2-d:d),0);
   ranks.push(empiricalPercentile(gt.map(score),score(dosages)));
  }
  assert.equal(result.lower,Math.min(...ranks));assert.equal(result.upper,Math.max(...ranks));assert.equal(result.scenarioCount,4);assert.equal(result.missingGenotypes,0);assert.equal(result.point,null);
  const pairwise=coherentSensitivity(model,{orientationBasis:basis},0);assert.ok(pairwise.lower<=result.lower&&pairwise.upper>=result.upper);
  assert.equal(JSON.stringify({model,basis}),snapshot);
 }
});
test('missing or quality-failed calls retain dosage uncertainty despite genotype strings',()=>{
 for(const status of ['Not observed','Quality limited','No call']){
  const model={terms:[{...terms[0],status},terms[1]]},r=coherentSensitivity(model,{orientationBasis:basis});
  assert.equal(r.missingGenotypes,1);
  for(let d=0;d<=2;d++){
   const full=coherentSensitivity({terms:[{...terms[0],genotype:['T/T','A/T','A/A'][d]},terms[1]]},{orientationBasis:basis});
   assert.ok(full.lower>=r.lower&&full.upper<=r.upper);
  }
 }
});
test('matching target and reference genotypes cancel shared orientation uncertainty',()=>{
 const model={terms:[terms[0]]},reference={orientationBasis:{baseScores:[0,0,0],terms:[{id:'rs0',candidates:['A','T'],contributions:[[-4,-4,-4],[0,0,0]]}]}};
 for(const limit of [0,512]){const r=coherentSensitivity(model,reference,limit);assert.equal(r.lower,50);assert.equal(r.upper,50);}
});
test('descriptive scenario median uses modal assumptions without trusting a quality-excluded genotype',()=>{
 const failed={id:'fixed',weight:2,effectAllele:'A',otherAllele:'T',mapping:{alleles:['A','T']},status:'Quality limited',genotype:'A/A',contribution:null};
 const model={terms:[terms[0],failed]},reference={orientationBasis:{baseScores:[0,2,4],terms:[{id:'rs0',candidates:['A','T'],contributions:[[-4,-2,0],[0,-2,-4]]}]}};
 const estimate={terms:[{id:'fixed',assumedGenotypes:['T/T'],method:'Assumed population modal genotype'}]};
 const r=coherentSensitivity(model,reference,512,estimate);
 assert.equal(r.point,null);assert.equal(r.scenarioSummary.count,2);
 assert.match(r.scenarioSummary.method,/not a most-likely percentile/);
 const assumed=coherentSensitivity({terms:[terms[0],{...failed,status:'Called',genotype:'T/T',contribution:0}]},reference);
 assert.deepEqual(r.scenarios.map(s=>s.centralRank),assumed.scenarios.map(s=>s.lower));
 assert.ok(r.scenarioSummary.median>=r.lower&&r.scenarioSummary.median<=r.upper);
 assert.equal(coherentSensitivity(model,reference).scenarioSummary,null);
 const tied={terms:[{id:'fixed',assumedGenotypes:['A/A','T/T'],method:'Assumed population modal genotype (tied modes retained)'}]};
 assert.equal(coherentSensitivity(model,reference,512,tied).scenarioSummary,null);
});
test('missing reference terms remain bounded for every reference genotype and shared direction',()=>{
 const model={terms:[terms[0],{id:'absent',effectAllele:'A',otherAllele:'T',weight:0.5,status:'Called',genotype:'A/T',contribution:0.5,mapping:{alleles:['A','T']}}]};
 const base={baseScores:[0,1,2],terms:[{id:'rs0',candidates:['A','T'],contributions:[[-4,-2,0],[0,-2,-4]]}],referenceLower:0,referenceUpper:1};
 const ref={orientationBasis:base,missingReferenceTerms:[{id:'absent',weight:0.5,lower:0,upper:1}]};
 const result=coherentSensitivity(model,ref),fallback=coherentSensitivity(model,ref,0);
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)for(let direction=0;direction<2;direction++){
  const score=base.baseScores.map((x,i)=>x+base.terms[0].contributions[direction][i]+[a,b,c][i]*0.5),target=(direction?0:-4)+0.5,rank=empiricalPercentile(score,target);
  assert.ok(rank>=result.lower&&rank<=result.upper);assert.ok(rank>=fallback.lower&&rank<=fallback.upper);
 }
 assert.equal(result.scenarioSummary.neutralReference,true);assert.match(result.scenarioSummary.method,/not a measured genotype/);
 assert.ok(result.scenarioSummary.median>=result.lower&&result.scenarioSummary.median<=result.upper);
 assert.equal(result.point,null);
});
