import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {loadCervicalResearchDefinition} from '../scripts/cervical-research-score.mjs';
import {validatePGSLibrary,pgsTargetCatalog} from '../public/pgs.js';
import {validateCatalog} from '../public/catalog.js';
import {analyzeText} from '../public/engine.js';
export async function syntheticCervicalLibrary(){
 const d=await loadCervicalResearchDefinition(),meta=JSON.parse(await readFile(new URL('./fixtures/pgs/cervical-deletion/metadata.json',import.meta.url))),target={...d.targets[0],...d.deletionTarget,label:'Certified cervical deletion',gene:'Published component'};
 return {version:'synthetic-only',retrievedAt:'2026-09-18T00:00:00Z',models:[{...d.model,license:meta.license,catalogURL:'https://www.pgscatalog.org/score/PGS005165/',sourceFiles:{original:{sha256:d.sourceSha256}}}],targets:[...d.targets,target]};
}
test('mixed schema admits only the exact reviewed deletion while routing only14SNVs to the ordinary scanner',async()=>{
 const lib=await syntheticCervicalLibrary();assert.equal(validatePGSLibrary(lib),lib);assert.equal(lib.models[0].variantCount,15);assert.equal(pgsTargetCatalog(lib).records.length,14);assert.equal(validateCatalog({version:lib.version,retrievedAt:lib.retrievedAt,records:lib.targets}).records.length,15);
 for(const mutate of [l=>l.models[0].id='PGS001522',l=>l.models[0].variants.find(v=>v.kind==='reviewed-deletion').sourceOtherAllele='AGA',l=>l.targets.at(-1).reviewedDeletion.originalSha256='bad',l=>l.targets.at(-1).mappings.GRCh38.ref='AAG',l=>l.models[0].variants.find(v=>v.kind==='reviewed-deletion').weight=-0.31,l=>l.targets.at(-1).variantKind='arbitrary-indel']){const bad=structuredClone(lib);mutate(bad);assert.throws(()=>validatePGSLibrary(bad));}
 const ordinary=structuredClone(lib);ordinary.targets[0].mappings.GRCh38.alleles.push('AAA');assert.throws(()=>validatePGSLibrary(ordinary),/mapping/);
});
test('main scanner preserves all15terms and withholds the complete model when only the deletion is observed',async()=>{
 const lib=await syntheticCervicalLibrary(),m=lib.targets.at(-1).mappings.GRCh38,text='##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n'+[m.chrom,m.position,'rs9279333','AGA','A',80,'PASS','.','GT:GQ:DP','0/1:60:30'].join('\t');
 const report=analyzeText(text,pgsTargetCatalog(lib),{pgsLibrary:lib}),score=report.polygenicScores[0];assert.equal(score.total,15);assert.equal(score.rawSum,null);assert.equal(score.terms.length,15);assert.equal(score.matched,1);assert.equal(score.terms.find(t=>t.kind==='reviewed-deletion').status,'Called');
});
test('main scanner computes the complete mixed model on both builds/representations and blocks conflicting overlaps',async()=>{
 const lib=await syntheticCervicalLibrary(),model=lib.models[0];
 for(const build of ['GRCh37','GRCh38'])for(const sourceLike of [false,true]){
  const header='##fileformat=VCFv4.3\n##reference='+build+'\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n';
  const rows=model.variants.map(v=>{const m=v.mappings[build],deletion=v.kind==='reviewed-deletion';let ref=m.ref,position=m.position,alt=m.alleles.filter(a=>a!==ref).join(',');if(deletion&&sourceLike){position--;ref='AAG';}const inventory=[m.ref,...m.alleles.filter(a=>a!==m.ref)],gt=deletion?'1|0':[v.effectAllele,v.otherAllele].map(a=>inventory.indexOf(a)).join('|');return [m.chrom,position,v.id,ref,alt,80,'PASS','.','GT:GQ:DP',gt+':60:30'].join('\t');});
  const run=lines=>analyzeText(header+lines.join('\n'),pgsTargetCatalog(lib),{pgsLibrary:lib}).polygenicScores[0];
  const score=run(rows);assert.equal(score.matched,15);assert.equal(score.status,'Complete raw sum');assert.ok(Math.abs(score.rawSum-model.variants.reduce((sum,v)=>sum+v.weight,0))<1e-12);const deletion=score.terms.find(t=>t.kind==='reviewed-deletion');assert.equal(deletion.genotype,'A|AGA');assert.equal(deletion.inputGenotype,'1|0');assert.equal(deletion.phase,'phased');
  const snp=model.variants[0].mappings[build],overlap=[snp.chrom,snp.position-1,'.','A'+snp.ref,'A',80,'PASS','.','GT:GQ:DP','0/1:60:30'].join('\t'),blocked=run([...rows,overlap]);assert.equal(blocked.rawSum,null);assert.equal(blocked.terms[0].status,'Overlapping records');
  const duplicate=run([...rows,rows[model.variants.findIndex(v=>v.kind==='reviewed-deletion')]]);assert.equal(duplicate.rawSum,null);assert.equal(duplicate.terms.find(t=>t.kind==='reviewed-deletion').status,'Duplicate records');
 }
});
