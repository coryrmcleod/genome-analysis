import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {validatePGSLibrary} from '../public/pgs.js';
test('cross-model allele-pair disagreement is rejected before publication, while reversing the weighted allele is allowed',()=>{
 const source=JSON.parse(readFileSync(new URL('../public/data/pgs-library.json',import.meta.url))),template=source.models[0],v=structuredClone(template.variants.find(v=>v.alleleMode!=='effect-only'&&!['AT','CG'].includes([v.effectAllele,v.otherAllele].sort().join('')))),target=structuredClone(source.targets.find(t=>t.id===v.id));
 for(const m of Object.values(target.mappings))m.alleles=['A','C','G','T'];v.sourceEffectAllele=v.effectAllele;v.sourceOtherAllele=v.otherAllele;v.reverseComplemented=false;
 const m1={...template,variants:[v],variantCount:1},m2=structuredClone(m1);m2.id='PGS999999';m2.catalogURL='https://www.pgscatalog.org/score/PGS999999/';
 const library={...source,models:[m1,m2],targets:[target]};validatePGSLibrary(library);
 const b=m2.variants[0];[b.effectAllele,b.otherAllele]=[b.otherAllele,b.effectAllele];b.sourceEffectAllele=b.effectAllele;b.sourceOtherAllele=b.otherAllele;validatePGSLibrary(library);
 const comp={A:'T',T:'A',C:'G',G:'C'};b.effectAllele=comp[b.effectAllele];b.otherAllele=comp[b.otherAllele];b.sourceEffectAllele=b.effectAllele;b.sourceOtherAllele=b.otherAllele;
 assert.throws(()=>validatePGSLibrary(library),/Cross-model allele-pair disagreement/);
});
