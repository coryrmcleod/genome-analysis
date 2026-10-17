import test from 'node:test';import assert from 'node:assert/strict';
import {createShortVariantScanner,simpleIndel,validateShortVariantLibrary,NORMALIZATION_MARKER} from '../public/short-variants.js';
import {analyzeText} from '../public/engine.js';
const hash='a'.repeat(64);
function library(){return {version:'test',build:'GRCh38',retrievedAt:'2026-09-07T00:00:00Z',releaseDate:'2026-09-05',referenceSha256:hash,records:[{id:'clinvar:1',variantKind:'short-indel',gene:'SYNTHETIC',label:'Synthetic deletion fixture',trait:'Synthetic test',summary:'Synthetic fixture only',caution:'Not a real finding',effectAllele:'C',mappings:{GRCh38:{chrom:'1',position:100,ref:'CAA',alleles:['CAA','C']}},clinvar:[{variationId:'1',allele:'C',classification:'Pathogenic',reviewStatus:'reviewed_by_expert_panel',stars:3,releaseDate:'2026-09-05',url:'https://www.ncbi.nlm.nih.gov/clinvar/variation/1/'}]}]};}
function scanner(normalized=true,targets=[]){const s=createShortVariantScanner(library(),targets);if(normalized){s.header('##GenomeAnalysisIndelMatching='+NORMALIZATION_MARKER);s.header('##GenomeAnalysisReferenceSHA256='+hash);}return s;}
function feed(s,{pos=100,ref='CAA',alt='C',gt='0/1',gq='60',dp='30',filter='PASS',info='.'}={}){s.consume(['1',String(pos),'arbitrary_id',ref,alt,'80',filter,info,'GT:GQ:DP',[gt,gq,dp].join(':')],{format:'VCF',build:'GRCh38',sampleIndex:9,chrom:'1',pos});}
const finish=s=>s.finish({format:'VCF',build:'GRCh38'}).results[0];
test('indel record presence remains unknown until matching prerequisites are satisfied',()=>{
 const unassessed=scanner(false);feed(unassessed);assert.equal(finish(unassessed).recordObserved,null);
 assert.equal(finish(scanner()).recordObserved,false);
 const observed=scanner();feed(observed);assert.equal(finish(observed).recordObserved,true);
});

test('indel parser rejects ambiguous fields and nonfinite quality without suppressing uncertainty',()=>{
 for(const opts of [{gq:'9'.repeat(400)},{dp:'9'.repeat(400)}]){const s=scanner();feed(s,opts);assert.equal(finish(s).status,'Quality limited');assert.equal(finish(s).copies,null);}
 for(const [format,sample] of [['GT:GQ:DP','0/1:60:30:extra'],['GT::DP','0/1:60:30'],['GT:GT:GQ:DP','0/1:0/0:60:30']]){
  const s=scanner(true,[{id:'rs1',mappings:{GRCh38:{chrom:'1',position:101,ref:'A'}}}]);
  s.consume(['1','100','.','CAA','C','80','PASS','.',format,sample],{format:'VCF',build:'GRCh38',sampleIndex:9,chrom:'1',pos:100});
  assert.equal(finish(s).status,'Unsupported call');assert.equal(finish(s).copies,null);assert.ok(s.finish({format:'VCF',build:'GRCh38'}).blockedSNVIds.has('rs1'));
 }
});
test('simple indel scope uses a shared pad and at most 50 inserted/deleted bases',()=>{
 assert.ok(simpleIndel('C','C'+'A'.repeat(50)));assert.ok(simpleIndel('CAA','C'));
 for(const pair of [['C','C'+'A'.repeat(51)],['A','T'],['CA','CT'],['AT','ATT'],['A','<DEL>'],['c','ca'],['CA','G']])assert.equal(simpleIndel(...pair),false);
 const bad=library();bad.records.push(structuredClone(bad.records[0]));assert.throws(()=>validateShortVariantLibrary(bad));
});
test('exact normalized biallelic calls expose allele counts without rsID or phase inference',()=>{
 for(const [gt,copies] of [['0/0',0],['0|1',1],['1/1',2]]){const s=scanner();feed(s,{gt});assert.equal(finish(s).copies,copies);assert.equal(finish(s).status,'Called');}
 const s=scanner();feed(s,{pos:101});assert.equal(finish(s).status,'Not observed');
});
test('normalization, reference identity, build and sequencing input are mandatory',()=>{
 const s=scanner(false);feed(s);assert.equal(finish(s).status,'Normalization required');s.header('##GenomeAnalysisIndelMatching='+NORMALIZATION_MARKER);s.header('##GenomeAnalysisReferenceSHA256='+'b'.repeat(64));assert.equal(finish(s).status,'Normalization required');
 assert.equal(s.finish({format:'VCF',build:'GRCh37'}).results[0].status,'Unsupported build');assert.equal(s.finish({format:'23andMe',build:'GRCh38'}).results[0].status,'Unsupported input');
 for(const cmd of ['norm -m -any input.vcf','norm -a input.vcf','norm --atomize input.vcf']){const split=scanner();split.header('##bcftools_normCommand='+cmd);feed(split);assert.equal(finish(split).status,'Normalization required');}
});
test('quality failures, duplicates and overlapping non-reference calls are withheld',()=>{
 for(const opts of [{gq:'19'},{dp:'9'},{gq:'.'},{filter:'.'},{filter:'LowQual'},{gt:'./.'},{gt:'1'},{gt:'0/1/1'}]){const s=scanner();feed(s,opts);assert.notEqual(finish(s).status,'Called');assert.equal(finish(s).copies,null);}
 const duplicate=scanner();feed(duplicate);feed(duplicate);assert.equal(finish(duplicate).status,'Duplicate records');
 const s=scanner(true,[{id:'rs1',mappings:{GRCh38:{chrom:'1',position:101,ref:'A'}}}]);feed(s);feed(s,{pos:101,ref:'A',alt:'G'});assert.equal(finish(s).status,'Overlapping records');assert.ok(s.finish({format:'VCF',build:'GRCh38'}).blockedSNVIds.has('rs1'));
});
test('missing indels, SNP reference calls, gVCF blocks and multiallelic representations never become negative indel calls',()=>{
 for(const opts of [{ref:'C',alt:'.',gt:'0/0'},{pos:90,ref:'A',alt:'<NON_REF>',gt:'0/0',info:'END=200'},{alt:'C,CA',gt:'0/1'},{ref:'CAG',alt:'C'},{ref:'CAA',alt:'G'}]){const s=scanner();feed(s,opts);assert.notEqual(finish(s).status,'Called');assert.equal(finish(s).copies,null);}
 assert.equal(finish(scanner()).status,'Not observed');
});
test('the report integrates indel citations and withholds overlapping SNP interpretations',()=>{
 const snp={id:'rs1',gene:'SYNTHETIC',label:'Synthetic SNP',trait:'Synthetic',category:'Health',priority:1,evidence:'Synthetic',effectAllele:'G',frequency:null,summary:'Synthetic',caution:'Synthetic',sources:[],mappings:{GRCh38:{chrom:'1',position:101,ref:'A',alleles:['A','G']}}};
 const catalog={version:'test',retrievedAt:'2026-09-07T00:00:00Z',records:[snp]},indels=library();Object.assign(indels.records[0],{category:'ClinVar review',priority:2,evidence:'Synthetic',frequency:null,sources:[]});
 const h=`##fileformat=VCFv4.3\n##reference=GRCh38\n##GenomeAnalysisIndelMatching=${NORMALIZATION_MARKER}\n##GenomeAnalysisReferenceSHA256=${hash}\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n`;
 const deletion='1\t100\t.\tCAA\tC\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n',single='1\t101\t.\tA\tG\t80\tPASS\t.\tGT:GQ:DP\t0/1:60:30\n';
 const isolated=analyzeText(h+deletion,catalog,{shortVariantLibrary:indels});assert.equal(isolated.results.find(r=>r.variantKind==='short-indel').clinicalFindings[0].copies,1);assert.equal(isolated.stats.offPanel,0);
 const overlap=analyzeText(h+deletion+single,catalog,{shortVariantLibrary:indels});assert.ok(overlap.results.every(r=>r.status==='Overlapping records'));assert.ok(overlap.results.every(r=>r.copies===null));
 const ordinary=analyzeText(h.replace(/^##GenomeAnalysis.*\n/gm,'')+deletion+single,catalog,{shortVariantLibrary:indels});assert.equal(ordinary.results[0].status,'Overlapping records');assert.equal(ordinary.results[1].status,'Normalization required');
 const multi=analyzeText(h+deletion.replace('\tC\t80','\tC,CA\t80').replace('0/1:60','0/2:60')+single,catalog,{shortVariantLibrary:indels});assert.equal(multi.results[0].status,'Overlapping records');assert.equal(multi.results[1].copies,null);
});
