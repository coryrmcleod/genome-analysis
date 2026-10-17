import test from 'node:test';import assert from 'node:assert/strict';import {parseGenomicIndel,genomicIndelToVCF} from '../public/hgvs-indels.js';
test('fully specified genomic indels produce the expected altered DNA sequence',()=>{
 const genome='ACGTACGT',cases=[['NC_000001.11:g.3_4del','ACACGT'],['NC_000001.11:g.3_4delGT','ACACGT'],['NC_000001.11:g.3_4insAA','ACGAATACGT'],['NC_000001.11:g.3_4dup','ACGTGTACGT'],['NC_000001.11:g.3dupG','ACGGTACGT']];
 for(const [hgvs,expected] of cases){const p=parseGenomicIndel(hgvs),v=genomicIndelToVCF(p,genome.slice(p.readStart-1,p.readEnd));assert.equal(genome.slice(v.position-1,v.position-1+v.ref.length),v.ref);assert.equal(genome.slice(0,v.position-1)+v.alt+genome.slice(v.position-1+v.ref.length),expected);}
});
test('uncertain, transcript, complex, oversized and malformed descriptions are not approximated',()=>{
 for(const h of ['NM_000001.1:c.3del','NC_000001.11:g.(3_4)del','NC_000001.11:g.3_4delinsAA','NC_000001.11:g.3_5insA','NC_000001.11:g.4_3del','NC_000001.11:g.3_3dup','NC_000001.11:g.1del','NC_000001.11:g.2_52del','NC_000001.11:g.3delAA','NC_000001.11:g.3_4insN'])assert.throws(()=>parseGenomicIndel(h),h);
 const p=parseGenomicIndel('NC_000001.11:g.3_4delGT');assert.throws(()=>genomicIndelToVCF(p,'CAA'));assert.throws(()=>genomicIndelToVCF(p,'CG'));assert.throws(()=>genomicIndelToVCF(p,'CNT'));
});
