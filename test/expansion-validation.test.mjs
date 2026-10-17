import test from 'node:test';
import assert from 'node:assert/strict';
import {genotypeCounts,validateEuropeanSampleIds} from '../scripts/build-european-populations.mjs';
import {parseScoringFile,coordinateVariantIdentity,verifyHarmonizedRow} from '../scripts/import-pgs-library.mjs';
import {visibleScoreTerms,scoreSummaryHtml} from '../public/score-browser.js';
import {europeanCohortIds,EUROPEAN_GROUPS} from '../scripts/european-reference-cohort.mjs';
test('public EUR genotype modes count phased allele indices and reject missing or third alleles',()=>{
 const mapping={ref:'A',alleles:['A','G']},r={ref:'A',alleles:['A','G'],format:['DP','GT'],samples:['30:0|1','20:1/0','25:0/0']};
 assert.deepEqual(genotypeCounts(r,mapping,3),{sampleCount:3,genotypes:[{genotype:'A/A',count:1,frequency:1/3},{genotype:'A/G',count:2,frequency:2/3}]});
 for(const gt of ['./.','0/2','0','1/x'])assert.equal(genotypeCounts({...r,samples:[gt,gt,gt],format:['GT']},mapping,3),null);
 assert.equal(genotypeCounts({...r,alleles:['A','G','T']},mapping,3),null);assert.equal(genotypeCounts(r,mapping,4),null);
});
test('coordinate identities require declared assembly and a unique exact dbSNP position and allele match',()=>{
 const text='#variants_number=1\n#genome_build=GRCh37\nchr_name\tchr_position\teffect_allele\tother_allele\teffect_weight\n4\t100\tA\tG\t0.1\n';
 assert.throws(()=>parseScoringFile(text));
 const row=parseScoringFile(text,{allowCoordinateIds:true}).rows[0];assert.equal(row.rsID,'coordinate:GRCh37:4:100');
 const hit={source:'dbSNP',id:'rs123',assembly_name:'GRCh37',seq_region_name:'4',start:100,end:100,strand:1,alleles:['A','G']};
 assert.equal(coordinateVariantIdentity(row,'GRCh37',[hit]),'rs123');
 for(const change of [{start:101},{end:101},{strand:-1},{assembly_name:'GRCh38'},{seq_region_name:'5'},{alleles:['A','T']}])assert.throws(()=>coordinateVariantIdentity(row,'GRCh37',[{...hit,...change}]));
 assert.throws(()=>coordinateVariantIdentity(row,'GRCh37',[hit,{...hit,id:'rs456'}]));
 assert.throws(()=>parseScoringFile(text.replace('GRCh37','NR'),{allowCoordinateIds:true}));
 for(const [alias,canonical] of [['hg19','GRCh37'],['hg38','GRCh38']]){const parsed=parseScoringFile(text.replace('GRCh37',alias),{allowCoordinateIds:true});assert.equal(parsed.metadata.reported_genome_build,alias);assert.equal(parsed.metadata.genome_build,canonical);assert.equal(parsed.rows[0].rsID,`coordinate:${canonical}:4:100`);assert.throws(()=>coordinateVariantIdentity(parsed.rows[0],canonical,[{...hit,assembly_name:canonical==='GRCh37'?'GRCh38':'GRCh37'}]));}
 assert.throws(()=>parseScoringFile(text.replace('GRCh37','hg18'),{allowCoordinateIds:true}));
});
test('the European cohort check rejects a different 503-person panel with the same sample count',()=>{
 const ids=Array.from({length:503},(_,i)=>'public-'+i);
 assert.doesNotThrow(()=>validateEuropeanSampleIds(ids.slice().reverse(),ids));
 assert.throws(()=>validateEuropeanSampleIds([...ids.slice(1),'other-person'],ids),/outside/);
 assert.throws(()=>validateEuropeanSampleIds([...ids.slice(1),ids[1]],ids),/duplicated/);
 assert.throws(()=>validateEuropeanSampleIds(ids,ids.slice(1)),/incomplete/);
});
test('cohort identities originate in source EUR labels and exclusions, not an arbitrary keep file',()=>{
 const rows=Object.entries(EUROPEAN_GROUPS).flatMap(([pop,count])=>Array.from({length:count},(_,i)=>`${pop}-${i}\tEUR\t${pop}`));
 const sample='#IID\tSuperPop\tPopulation\n'+rows.join('\n')+'\nexcluded\tEUR\tGBR\nnon-eur\tAFR\tYRI\n';
 assert.equal(europeanCohortIds(sample,'#IID\nexcluded\n').length,503);
 assert.throws(()=>europeanCohortIds(sample.replace('GBR-0\tEUR','GBR-0\tAFR'),'#IID\nexcluded\n'),/cohort/);
 assert.throws(()=>europeanCohortIds(sample,'#IID\n'),/cohort/);
 assert.throws(()=>europeanCohortIds(sample+rows[0]+'\n','#IID\nexcluded\n'),/duplicated/);
});
test('harmonized identifiers cannot hide altered weights or invented coordinate identities',()=>{
 const row={rsID:'rs123',effect_allele:'A',other_allele:'G',effect_weight:'0.123'};
 assert.equal(verifyHarmonizedRow(row,{...row,hm_rsID:''}),'rs123');
 assert.throws(()=>verifyHarmonizedRow(row,{...row,effect_weight:'0.124',hm_rsID:'rs123'}));
 assert.throws(()=>verifyHarmonizedRow({...row,rsID:'coordinate:GRCh37:1:20'},{...row,hm_rsID:''}));
});
test('heart-rate discovery labels are accepted only for the reviewed source and never override a term condition',()=>{
 const source='#pgs_id=PGS000300\n#variants_number=1\nrsID\teffect_allele\tother_allele\teffect_weight\tvariant_description\nrs123\tA\tG\t0.1\tGWAS lead SNPs\n';
 for(const label of ['GWAS lead SNPs','exome lead SNPs','GWAS secondary','exome secondary'])assert.equal(parseScoringFile(source.replace('GWAS lead SNPs',label)).rows.length,1);
 assert.throws(()=>parseScoringFile(source.replace('PGS000300','PGS999999')));
 assert.throws(()=>parseScoringFile(source.replace('GWAS lead SNPs','only if genotype is homozygous')));
});
test('large score table limits presentation while keeping late matching variants accessible',()=>{
 const terms=Array.from({length:50000},(_,i)=>({id:'rs'+i,sourceId:'rs'+i,locus:'gene'+i,weight:i})),model={id:'PGS999999',trait:'Test trait',name:'Example',family:'Example',terms};
 assert.equal(visibleScoreTerms(model).terms.length,200);assert.equal(visibleScoreTerms(model).total,50000);assert.deepEqual(visibleScoreTerms(model,'rs49999').terms,[terms[49999]]);assert.equal(model.terms.length,50000);
});
test('combined score summary preserves measured and hypothetical labels and escapes trait text',()=>{
 const models=[{id:'PGS999999',trait:'<script>example</script>',matched:10,total:11,absoluteWeightCoverage:.9,referenceComparison:{measured:true,point:82,lower:82,upper:82}},{id:'PGS999998',trait:'Other',matched:2,total:3,referenceSensitivity:{lower:10,upper:70,scenarioSummary:{median:35}}}];
 const html=scoreSummaryHtml(models);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Measured-score rank/);assert.match(html,/Sensitivity · scenario median/);assert.match(html,/10.0–70.0/);assert.match(html,/#score-PGS999998/);
});
