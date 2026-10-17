import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleAssociations,mapping,frequencyFor} from '../scripts/expand-catalog.mjs';
import {pubmedURL,searchPubMed,getJSON} from '../scripts/reference-api.mjs';
const maps={GRCh38:{alleles:['A','G']},GRCh37:{alleles:['A','G']}};
const association={source:'NHGRI-EBI GWAS catalog',variants:'rs123',study:'PMID:12345',risk_allele:'G',pvalue:'2e-10',trait:'Test trait'};
test('association eligibility rejects linked proxies, uncertain alleles, weak signals and missing literature',()=>{
  assert.equal(eligibleAssociations({phenotypes:[association]},'rs123',maps).length,1);
  for(const change of [{variants:'rs123,rs456'},{variants:null},{risk_allele:'?'},{risk_allele:'C'},{pvalue:'0.001'},{pvalue:'0'},{study:'Unpublished'},{source:'ClinVar'}])assert.equal(eligibleAssociations({phenotypes:[{...association,...change}]},'rs123',maps).length,0);
  assert.equal(eligibleAssociations({phenotypes:[association]},'rs123',{...maps,GRCh37:{alleles:['A','C']}}).length,0);
});
test('mapping refuses ambiguous placement, indels and strand reversal',()=>{
  const row={assembly_name:'GRCh38',strand:1,seq_region_name:'1',start:100,end:100,allele_string:'A/G'};
  assert.equal(mapping({mappings:[row]},'GRCh38').ref,'A');
  for(const rows of [[row,row],[{...row,strand:-1}],[{...row,allele_string:'A/AG'}]])assert.throws(()=>mapping({mappings:rows},'GRCh38'));
});
test('frequency distinguishes absence from zero and detects inconsistent counts',()=>{
  assert.equal(frequencyFor({populations:[]},'G'),null);
  const rows=[{population:'1000GENOMES:phase_3:EUR',allele:'G',frequency:0,allele_count:0},{population:'1000GENOMES:phase_3:EUR',allele:'A',frequency:1,allele_count:100}];
  assert.equal(frequencyFor({populations:rows},'G').value,0);
  assert.throws(()=>frequencyFor({populations:[{...rows[0],frequency:0.5},rows[1]]},'G'));
});
test('reference API limits hosts and PubMed search accepts only public rsIDs',async()=>{
  await assert.rejects(searchPubMed('sample genome text'));
  await assert.rejects(getJSON('https://example.com/private'));
  const url=new URL(pubmedURL('esearch',{term:'rs123[All Fields]'}));assert.equal(url.searchParams.get('db'),'pubmed');assert.equal(url.searchParams.get('term'),'rs123[All Fields]');
});
