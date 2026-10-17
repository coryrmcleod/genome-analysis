import test from 'node:test';import assert from 'node:assert/strict';
import {parseClinVarRow,pairClinVarBuilds} from '../scripts/clinvar-source.mjs';
const row='17\t43000000\t12345\tG\tA\t.\t.\tRS=12345;GENEINFO=BRCA1:672;CLNSIG=Pathogenic;CLNREVSTAT=reviewed_by_expert_panel;CLNDN=condition_a|condition_b;CLNDISDB=MedGen:1';
test('ClinVar discovery rejects unsupported variant types, review states and haplotype-only assertions',()=>{
 assert.ok(parseClinVarRow(row));
 for(const s of [row.replace('\tG\tA\t','\tG\tAT\t'),row.replace('\tG\tA\t','\tG\tA,C\t'),row.replace('\tG\tA\t','\tG\t<DEL>\t'),row.replace(/^17/,'X'),row.replace('CLNSIG=Pathogenic;','SCI=Pathogenic;'),row.replace('CLNSIG=Pathogenic;','CLNSIG=Uncertain_significance;'),row.replace('reviewed_by_expert_panel','criteria_provided_single_submitter'),row+';CLNSIGINCL=Pathogenic',row+';CLNSIGCONF=Pathogenic(1)|Benign(1)',row.replace('RS=12345','RS=12345,67890')])assert.equal(parseClinVarRow(s),null);
});
test('dual-build admission requires same variation ID, rsID and exact reference/alternate alleles',()=>{
 const a=parseClinVarRow(row),b={...a,position:42000000};assert.equal(pairClinVarBuilds(new Map([[a.variationId,b]]),new Map([[a.variationId,a]])).length,1);
 for(const bad of [{...b,id:'rs9'},{...b,alt:'C'},{...b,ref:'T'}])assert.equal(pairClinVarBuilds(new Map([[a.variationId,bad]]),new Map([[a.variationId,a]])).length,0);
 assert.equal(pairClinVarBuilds(new Map(),new Map([[a.variationId,a]])).length,0);
});
