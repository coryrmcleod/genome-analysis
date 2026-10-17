import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pgsTargetCatalog} from '../public/pgs.js';
import {analyzeText} from '../public/engine.js';
import {termForBuild} from '../public/pgs-build-alleles.js';
const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
const targets=new Map(library.targets.map(t=>[t.id,t]));
function synthetic(model,build){
 const selected=model.variants.map(v=>targets.get(v.id));
 const single={...library,models:[model],targets:selected};
 const header=['##fileformat=VCFv4.3','##reference='+build,'#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC'];
 const rows=model.variants.map(original=>{
  const v=termForBuild(original,build),m=targets.get(v.id).mappings[build];
  const all=[m.ref,...m.alleles.filter(a=>a!==m.ref)];
  // Deliberately select a synthetic heterozygote giving dosage one for every
  // retained orientation. This is test data, never an imputation rule.
  const pair=v.alleleMode==='effect-only'?(v.effectAlleleCandidates.length===2?v.effectAlleleCandidates:[v.effectAlleleCandidates[0],all.find(a=>a!==v.effectAlleleCandidates[0])]):[v.effectAllele,v.otherAllele];
  assert.equal(new Set(pair).size,2);assert.ok(pair.every(a=>all.includes(a)),model.id+' '+v.id+' '+build);
  return [m.chrom,m.position,v.id,m.ref,all.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',pair.map(a=>all.indexOf(a)).join('/')+':60:30'].join('\t');
 });
 return {single,header,rows};
}
test('every complete installed model scores all original terms on both builds, independently of rank availability',()=>{
 for(const model of library.models)for(const build of ['GRCh37','GRCh38']){
  const {single,header,rows}=synthetic(model,build);
  const [score]=analyzeText([...header,...rows].join('\n')+'\n',pgsTargetCatalog(single),{pgsLibrary:single}).polygenicScores;
  assert.equal(score.matched,model.variantCount,model.id+' '+build+' '+JSON.stringify(score.reasons));
  assert.ok(score.terms.every(t=>t.dosage===1&&t.contribution===Number(t.weightText)));
  const expected=model.variants.reduce((n,v)=>n+Number(v.weightText),0);
  assert.ok(Math.abs(score.rawSum-expected)<=1e-10*Math.max(1,model.variants.reduce((n,v)=>n+Math.abs(v.weight),0)),model.id+' original-weight sum');
 }
});
test('one absent original term withholds every installed full score on either build',()=>{
 for(const model of library.models)for(const build of ['GRCh37','GRCh38']){
  const {single,header,rows}=synthetic(model,build);
  const [score]=analyzeText([...header,...rows.slice(1)].join('\n')+'\n',pgsTargetCatalog(single),{pgsLibrary:single}).polygenicScores;
  assert.equal(score.rawSum,null,model.id+' '+build);assert.equal(score.matched,model.variantCount-1);
  assert.equal(score.terms[0].status,'Not observed');assert.equal(score.terms[0].contribution,null);
  assert.equal(score.terms.length,model.variantCount);
 }
});
