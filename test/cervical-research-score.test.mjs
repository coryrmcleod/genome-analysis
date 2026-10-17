import test from 'node:test';import assert from 'node:assert/strict';
import {loadCervicalResearchDefinition,createCervicalResearchScanner} from '../scripts/cervical-research-score.mjs';
import {isPalindromic} from '../public/pgs.js';
const header=build=>['##fileformat=VCFv4.3','##reference='+build,'#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC'];
function fixture(definition,build,dosage=1,canonical=true){
 let expectedUnits=0;
 const rows=definition.model.variants.map((v,index)=>{
  const m=v.mappings[build],effectCopies=v.kind==='reviewed-deletion'?dosage:isPalindromic(v.effectAllele,v.otherAllele)?1:index%3,alleles=[...Array(effectCopies).fill(v.effectAllele),...Array(2-effectCopies).fill(v.otherAllele)];
  expectedUnits+=Math.round(v.weight*1000)*effectCopies;
  let ref=m.ref,alt=m.alleles.filter(a=>a!==m.ref).join(','),position=m.position,gt;
  if(v.kind==='reviewed-deletion'){if(!canonical){position--;ref='AAG';}alt='A';gt=Array(2-dosage).fill('0').concat(Array(dosage).fill('1')).join('/');}
  else{const inventory=[ref,...alt.split(',')];gt=alleles.map(a=>inventory.indexOf(a)).join('/');}
  return [m.chrom,String(position),v.id,ref,alt,'80','PASS','.','GT:GQ:DP',gt+':60:30'];
 });
 return {rows,expected:expectedUnits/1000};
}
async function score(build,rows,heads=header(build)){
 const scanner=await createCervicalResearchScanner({build,sample:'SYNTHETIC',syntheticOnly:true});for(const line of heads)scanner.consume(line);for(const row of rows)scanner.consume(row.join('\t'));return scanner.finish();
}
test('complete15-term cervical benchmark preserves original coefficients and both equivalent deletion representations on both builds',async()=>{
 const definition=await loadCervicalResearchDefinition();assert.equal(definition.model.variants.length,15);assert.equal(definition.model.variants.find(v=>v.kind==='reviewed-deletion').weightText,'-0.318');
 for(const build of ['GRCh37','GRCh38'])for(const dosage of [0,1,2])for(const canonical of [true,false]){
  const f=fixture(definition,build,dosage,canonical),result=await score(build,f.rows);assert.equal(result.total,15);assert.equal(result.matched,15);assert.equal(result.status,'Complete raw sum');assert.ok(Math.abs(result.rawSum-f.expected)<1e-12);assert.equal(result.deletionCall.dosage,dosage);assert.equal(result.installed,false);assert.equal(result.percentile,null);
  assert.deepEqual(result.terms.map(t=>t.weightText),definition.model.variants.map(t=>t.weightText));
 }
});
test('complete cervical score is withheld when either SNP or deletion evidence is missing, ambiguous, low quality or duplicated',async()=>{
 const d=await loadCervicalResearchDefinition(),build='GRCh38',base=fixture(d,build).rows,deletionIndex=d.model.variants.findIndex(v=>v.kind==='reviewed-deletion'),palIndex=d.model.variants.findIndex(v=>isPalindromic(v.effectAllele,v.otherAllele));
 const variants=[];
 variants.push(base.filter((r,i)=>i!==deletionIndex),base.filter((r,i)=>i!==0),[...base,base[deletionIndex]]);
 for(const call of ['./.:60:30','1/1:10:30','1/1:60:1','1:60:30']){const rows=structuredClone(base);rows[deletionIndex][9]=call;variants.push(rows);}
 const pal=structuredClone(base);pal[palIndex][9]='0/0:60:30';variants.push(pal);
 const malformed=structuredClone(base);malformed[deletionIndex][8]='GT:GQ:GQ';variants.push(malformed);
 const block=structuredClone(base);block[deletionIndex][4]='<NON_REF>';block[deletionIndex][9]='0/0:60:30';variants.push(block);
 for(const rows of variants){const result=await score(build,rows);assert.equal(result.rawSum,null);assert.equal(result.total,15);assert.equal(result.terms.length,15);assert.match(result.status,/withheld/);}
 await assert.rejects(()=>createCervicalResearchScanner({build,sample:'PERSONAL',syntheticOnly:true}),/synthetic/);
 await assert.rejects(()=>createCervicalResearchScanner({build,sample:'SYNTHETIC'}),/synthetic/);
 await assert.rejects(()=>score(build,base,header('GRCh37')),/disagrees/);
 const scanner=await createCervicalResearchScanner({build,sample:'SYNTHETIC',syntheticOnly:true});assert.throws(()=>scanner.consume(base[0].join('\t')),/header required/);
});
