import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {analyzeText} from '../public/engine.js';import {calculatePGS,pgsTargetCatalog} from '../public/pgs.js';import {estimatePGS} from '../public/pgs-estimate.js';
const library=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url))),model=library.models.find(m=>m.id==='PGS000037'),ids=new Set(model.variants.map(v=>v.id));
const single={...library,models:[model],targets:library.targets.filter(t=>ids.has(t.id))},catalog=pgsTargetCatalog(single);
function fixture(build){
 const rows=single.targets.map(t=>{const m=t.mappings[build],v=model.variants.find(v=>v.id===t.id),all=[m.ref,...m.alleles.filter(a=>a!==m.ref)];return [m.chrom,m.position,t.id,m.ref,all.slice(1).join(','),80,'PASS','.', 'GT:GQ:DP',`${all.indexOf(v.effectAllele)}/${all.indexOf(v.otherAllele)}:60:30`].join('\t');});
 const target=single.targets[0],m=target.mappings[build];
 return {rows,target,m,header:`##fileformat=VCFv4.3\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n`};
}
test('ordinary SNP scores withhold overlapping indels without an optional clinical or deletion library',()=>{
 for(const build of ['GRCh37','GRCh38']){
  const {rows,target,m,header}=fixture(build);
  const score=lines=>analyzeText(header+lines.join('\n'),{version:'test',records:[]},{pgsLibrary:single}).polygenicScores[0];
  assert.notEqual(score(rows).rawSum,null);
  for(const gt of ['0/1','./.','1/1'])for(const after of [true,false]){
   const indel=[m.chrom,m.position-1,'.','A'+m.ref,'A',80,'PASS','.', 'GT:GQ:DP',gt+':2:1'].join('\t');
   const lines=after?[...rows,indel]:[indel,...rows],s=score(lines);
   assert.equal(s.rawSum,null);assert.equal(s.terms.find(t=>t.id===target.id).status,'Overlapping records');assert.equal(estimatePGS(s,null,'EUR').bestGuess,null);
   const direct=calculatePGS(single,analyzeText(header+lines.join('\n'),catalog))[0];assert.equal(direct.rawSum,null);assert.equal(direct.terms.find(t=>t.id===target.id).recordObserved,true);
  }
  const overlap=[m.chrom,m.position-1,'.','A'+m.ref,'A',80,'PASS','.', 'GT:GQ:DP','0/1:60:30'].join('\t');
  for(const calls of [rows.slice(1),[rows[0].replace(':60:30',':2:1'),...rows.slice(1)],[rows[0].replace(/\d\/\d:60:30$/,'./.:60:30'),...rows.slice(1)]]){
   const s=score([...calls,overlap]);assert.equal(s.terms.find(t=>t.id===target.id).status,'Overlapping records');assert.equal(s.terms.find(t=>t.id===target.id).recordObserved,calls.length===rows.length);assert.equal(estimatePGS(s,null,'EUR').bestGuess,null);
  }
  const reference=[m.chrom,m.position-1,'.','A'+m.ref,'A',80,'PASS','.', 'GT:GQ:DP','0/0:60:30'].join('\t');
  assert.equal(score([...rows,reference]).rawSum,score(rows).rawSum);
 }
});
test('ordinary SNP scores retain selected-sample boundaries for structural overlaps',()=>{
 const {rows,m,header}=fixture('GRCh38'),multi=header.replace('SYNTHETIC\n','REFERENCE\tSELECTED\n');
 const records=rows.map(row=>row+'\t'+row.split('\t').at(-1));
 const structural=[m.chrom,1,'.','A','<DEL>',80,'PASS','END='+m.position,'GT:GQ:DP','0/1:60:30','0/0:60:30'].join('\t');
 const read=sample=>analyzeText(multi+[...records,structural].join('\n'),catalog,{sample});
 assert.notEqual(calculatePGS(single,read('SELECTED'))[0].rawSum,null);
 assert.equal(calculatePGS(single,read('REFERENCE'))[0].rawSum,null);
});
