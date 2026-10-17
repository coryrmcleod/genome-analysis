import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reverseComplement,validateAssemblyReversal,termForBuild} from '../public/pgs-build-alleles.js';
import {calculatePGS,validatePGSLibrary,pgsTargetCatalog} from '../public/pgs.js';
import {analyzeText} from '../public/engine.js';
import {referenceDefinition} from '../public/pgs-reference.js';
import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {chainIntervalMappings} from '../scripts/assembly-chain.mjs';
import {estimatePGS} from '../public/pgs-estimate.js';
const existing=JSON.parse(fs.readFileSync(new URL('../public/data/pgs-library.json',import.meta.url)));
function fixture(){
 const mappings={GRCh37:{chrom:'10',position:500,ref:'T',alleles:['T','C']},GRCh38:{chrom:'10',position:700,ref:'A',alleles:['A','G']}};
 const e={version:1,method:'reciprocal-unique-chain-and-exact-flanks',flankSize:100};
 const seq='A'.repeat(100)+'T'+'C'.repeat(100);
 for(const [build,other] of [['GRCh37','GRCh38'],['GRCh38','GRCh37']]){
  const m=mappings[build],n=mappings[other],hg=build==='GRCh37'?'hg19':'hg38',name=build==='GRCh37'?'hg19ToHg38':'hg38ToHg19',host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
  e[build]={chainHits:[{chainId:'test',sourceChrom:'chr10',sourceStart:m.position-101,sourceEnd:m.position+100,targetChrom:'chr10',targetStart:n.position-101,targetEnd:n.position+100,strand:-1}],sequence:{id:`chromosome:${build}:10:${m.position-100}:${m.position+100}:1`,seq:build==='GRCh37'?seq:reverseComplement(seq)},chainSource:{url:`https://hgdownload.soe.ucsc.edu/goldenPath/${hg}/liftOver/${name}.over.chain.gz`,sha256:'1'.repeat(64)},sequenceSource:{url:`https://${host}/sequence/region/human/10:${m.position-100}..${m.position+100}:1?content-type=application/json`,sha256:'2'.repeat(64)}};
 }
 const v={id:'rs999990',sourceId:'rs999990',weight:-.25,weightText:'-0.25',effectAllele:'C',otherAllele:'T',sourceEffectAllele:'C',sourceOtherAllele:'T',alleleMode:'explicit-pair',reverseComplemented:false,buildAlleles:{GRCh37:{effectAllele:'C',otherAllele:'T',reverseComplemented:false},GRCh38:{effectAllele:'G',otherAllele:'A',reverseComplemented:true}},assemblyReversalEvidence:e};
 const target={...existing.targets[0],id:v.id,effectAllele:'C',frequency:null,mappings,buildEffectAlleles:{GRCh37:'C',GRCh38:'G'},assemblyReversalEvidence:e};
 delete target.association;delete target.literature;
 const model={...existing.models[0],id:'PGS999990',catalogURL:'https://www.pgscatalog.org/score/PGS999990/',variantCount:1,variants:[v]};
 return {...existing,models:[model],targets:[target]};
}
test('build-specific scoring preserves exact biological dosage and signed contribution across builds',()=>{
 const lib=validatePGSLibrary(fixture()),before=JSON.stringify(lib);
 for(const build of ['GRCh37','GRCh38'])for(const dosage of [0,1,2]){
  const m=lib.targets[0].mappings[build],gt=['0/0','0/1','1/1'][dosage];
  const text=`##fileformat=VCFv4.3\n##reference=${build}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n10\t${m.position}\trs999990\t${m.ref}\t${m.alleles[1]}\t80\tPASS\t.\tGT:GQ:DP\t${gt}:60:30\n`;
  const report=analyzeText(text,pgsTargetCatalog(lib),{pgsLibrary:lib}),s=report.polygenicScores[0];
  assert.equal(s.rawSum,dosage?-.25*dosage:0);assert.equal(s.terms[0].sourceEffectAllele,'C');assert.equal(s.terms[0].weightText,'-0.25');
  assert.equal(report.results[0].copies,dosage);assert.equal(s.terms[0].effectAllele,build==='GRCh37'?'C':'G');
  assert.equal(referenceDefinition(s,build),referenceDefinition(lib.models[0],build,lib.targets));
  assert.equal(calculatePGS(lib,{...report,results:[],format:'VCF'})[0].rawSum,null);
 }
 assert.equal(JSON.stringify(lib),before);
 assert.notEqual(referenceDefinition(lib.models[0],'GRCh37',lib.targets),referenceDefinition(lib.models[0],'GRCh38',lib.targets));
});
test('assembly reversal requires unique reciprocal mappings, exact forward sequences and frozen allele fields',()=>{
 const lib=fixture(),v=lib.models[0].variants[0];assert.ok(validateAssemblyReversal(v.assemblyReversalEvidence,lib.targets[0].mappings));
 const mutations=[e=>e.GRCh37.chainHits.push({...e.GRCh37.chainHits[0]}),e=>e.GRCh38.chainHits[0].strand=1,e=>e.GRCh38.chainHits[0].targetStart++,e=>e.GRCh37.sequence.seq='N'+e.GRCh37.sequence.seq.slice(1),e=>e.GRCh38.sequence.seq='A'+e.GRCh38.sequence.seq.slice(1),e=>e.GRCh37.chainSource.url='https://example.org/chain'];
 for(const mutate of mutations){const e=structuredClone(v.assemblyReversalEvidence);mutate(e);assert.throws(()=>validateAssemblyReversal(e,lib.targets[0].mappings));}
 const bad=structuredClone(v);bad.buildAlleles.GRCh38.weight=99;assert.throws(()=>termForBuild(bad,'GRCh38'));assert.throws(()=>termForBuild(v,'hg38'));
 const unproven=fixture();delete unproven.models[0].variants[0].assemblyReversalEvidence;assert.throws(()=>validatePGSLibrary(unproven));
});

test('installed assembly reversals retain independent frozen evidence and reproduce reciprocal chain proofs',()=>{
 for(const m of existing.models)for(const v of m.variants.filter(v=>v.buildAlleles)){
  const target=existing.targets.find(t=>t.id===v.id);validateAssemblyReversal(v.assemblyReversalEvidence,target.mappings);
  for(const b of ['GRCh37','GRCh38']){
   const e=v.assemblyReversalEvidence[b],map=target.mappings[b],name=b==='GRCh37'?'hg19ToHg38.over.chain.gz':'hg38ToHg19.over.chain.gz';
   const chain=fs.readFileSync(new URL('./fixtures/pgs/assembly/'+name,import.meta.url));
   const seq=fs.readFileSync(new URL(`./fixtures/pgs/assembly/${v.id}-${b}-reversal-sequence.json`,import.meta.url));
   assert.equal(createHash('sha256').update(chain).digest('hex'),e.chainSource.sha256);assert.equal(createHash('sha256').update(seq).digest('hex'),e.sequenceSource.sha256);
   assert.deepEqual(JSON.parse(seq),e.sequence);assert.deepEqual(chainIntervalMappings(gunzipSync(chain).toString(),'chr'+map.chrom,map.position-101,map.position+100),e.chainHits);
  }
 }
});
test('unobserved build-specific terms never borrow population-mode genotypes across assemblies',()=>{
 const v=fixture().models[0].variants[0];
 for(const build of ['GRCh37','GRCh38']){
  const term={...termForBuild(v,build),status:'Not observed',contribution:null,dosage:null};
  const model={build,inputFormat:'VCF',matched:1,terms:[{id:'rs2',status:'Called',contribution:1,dosage:1,weight:1},term]};
  const reference={records:{rs999990:{status:'Verified public forward mapping',populations:{EUR:{sampleCount:503,genotypes:[{genotype:build==='GRCh37'?'C/C':'G/G',count:503}]}}}}};
  const result=estimatePGS(model,reference,'EUR');assert.equal(result.assumedTerms,0);assert.match(result.terms[0].method,/no population-mode substitution/);assert.deepEqual(result.terms[0].dosages,[0,1,2]);
 }
});
