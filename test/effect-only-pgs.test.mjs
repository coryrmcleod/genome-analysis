import test from 'node:test';import assert from 'node:assert/strict';
import {effectAlleleCandidates,possibleEffectDosages} from '../public/effect-only-pgs.js';import {analyzeText} from '../public/engine.js';import {validatePGSLibrary} from '../public/pgs.js';import {estimatePGS} from '../public/pgs-estimate.js';import {parseScoringFile} from '../scripts/import-pgs-library.mjs';
function fixture(weight=2){const mappings=Object.fromEntries(['GRCh37','GRCh38'].map(b=>[b,{chrom:'1',position:100,ref:'C',alleles:['C','A','G','T']}]));const target={id:'rs1',gene:'SYNTHETIC',label:'Synthetic test',trait:'Synthetic test',category:'Health',priority:1,evidence:'Synthetic',effectAllele:'A',frequency:null,mappings,summary:'Synthetic',caution:'Not a real score',sources:[{label:'Synthetic fixture',url:'https://example.org/synthetic'}]};
 const library={version:'test',retrievedAt:'2026-09-07T00:00:00Z',targets:[target],models:[{id:'PGS999999',name:'Synthetic',trait:'Synthetic',family:'Synthetic',license:'Synthetic test',catalogURL:'https://www.pgscatalog.org/score/PGS999999/',effectType:'additive',variantCount:1,variants:[{id:'rs1',sourceId:'rs1',alleleMode:'effect-only',effectAllele:'A',sourceEffectAllele:'A',otherAllele:null,sourceOtherAllele:null,effectAlleleCandidates:['A','T'],reverseComplemented:false,weight,weightText:String(weight)}]}]};return {library,catalog:{version:'test',retrievedAt:library.retrievedAt,records:[target]}};}
function score(gt,weight=2){const {library,catalog}=fixture(weight);return analyzeText('##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n1\t100\trs1\tC\tA,G,T\t80\tPASS\t.\tGT:GQ:DP\t'+gt+':60:30\n',catalog,{pgsLibrary:library}).polygenicScores[0];}
test('effect-only orientation retains both possibilities unless the reference excludes one',()=>{
 assert.deepEqual(effectAlleleCandidates('A',['A','G']),['A']);assert.deepEqual(effectAlleleCandidates('A',['C','T']),['T']);assert.deepEqual(effectAlleleCandidates('A',['A','T','G']),['A','T']);assert.throws(()=>effectAlleleCandidates('A',['C','G']));
 assert.deepEqual(possibleEffectDosages(['A','G'],['A','T']),[0,1]);assert.deepEqual(possibleEffectDosages(['A','T'],['A','T']),[1]);assert.deepEqual(possibleEffectDosages(['C','G'],['A','T']),[0]);
 const bad=fixture().library;bad.models[0].variants[0].effectAlleleCandidates=['A'];assert.throws(()=>validatePGSLibrary(bad));
});
test('only orientation-invariant measured dosages produce complete raw sums',()=>{
 assert.equal(score('1/3').rawSum,2);assert.equal(score('0/2').rawSum,0);const ambiguous=score('1/2');assert.equal(ambiguous.rawSum,null);assert.equal(ambiguous.terms[0].status,'Effect orientation unresolved');assert.deepEqual(ambiguous.terms[0].possibleDosages,[0,1]);
 const range=estimatePGS(ambiguous,null,'none');assert.equal(range.lower,0);assert.equal(range.upper,2);assert.equal(range.unconditionalUpper,2);assert.equal(range.assumedTerms,0);
 assert.equal(estimatePGS(score('1/1'),null,'none').upper,4);const negative=estimatePGS(score('1/2',-2),null,'none');assert.equal(negative.lower,-2);assert.equal(negative.upper,0);
});
test('population frequencies never select the orientation of a measured effect-only genotype',()=>{
 const m=score('1/2');const reference={records:{rs1:{status:'Verified public forward mapping',sourceURL:'https://rest.ensembl.org/variation/human/rs1',populations:{EUR:{sampleCount:100,genotypes:[{genotype:'T/T',count:90},{genotype:'A/A',count:10}]}}}}};
 const e=estimatePGS(m,reference,'EUR');assert.equal(e.assumedTerms,0);assert.equal(e.lower,0);assert.equal(e.upper,2);assert.equal(e.terms[0].originalGenotype,'A/G');
});
test('a missing comparison allele needs explicit importer support and is never fabricated',()=>{
 const text='#variants_number=1\nrsID\teffect_allele\teffect_weight\nrs1\tA\t0.5\n';assert.throws(()=>parseScoringFile(text));assert.equal(parseScoringFile(text,{allowEffectOnly:true}).rows[0].other_allele,undefined);
});
