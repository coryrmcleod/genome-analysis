import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {analyzeText,analyzeFile,rarity} from '../public/engine.js';
import {validateCatalog} from '../public/catalog.js';
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
const marker=catalog.records.find(r=>r.id==='rs1800562'),m=marker.mappings.GRCh38;
const header='##fileformat=VCFv4.3\n##reference=GRCh38\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tTEST\n';
function row({gt='0/1',filter='PASS',format='GT:GQ:DP',sample=null,alt='A',ref='G',pos=m.position,chrom=m.chrom}={}){return `${chrom}\t${pos}\t${marker.id}\t${ref}\t${alt}\t80\t${filter}\t.\t${format}\t${sample??gt+':60:30'}`;}
const hit=text=>analyzeText(text,catalog).results.find(r=>r.id===marker.id);

test('valid off-assembly contigs are counted as unassessed rather than malformed',()=>{
 const r=analyzeText(header+row({chrom:'chrUn_KI270442v1'}),catalog);assert.equal(r.stats.unsupportedContigs,1);assert.equal(r.stats.malformed,0);assert.match(r.warnings.join(' '),/unsupported contigs/);
 const bad=analyzeText(header+row({pos:'nonsense'}),catalog);assert.equal(bad.stats.malformed,1);
});
test('reference catalog passes validation and frequency arithmetic',()=>{assert.equal(validateCatalog(catalog).records.length,100);for(const r of catalog.records){const f=r.frequency;if(!f)continue;assert.equal(f.allele,r.effectAllele);assert.ok(Math.abs(f.value-f.alleleCount/f.alleleNumber)<1e-9);assert.ok(r.mappings.GRCh37.position>0);}});
test('VCF heterozygote allele and dose are resolved',()=>{const r=hit(header+row());assert.equal(r.genotype,'G/A');assert.equal(r.copies,1);assert.equal(r.status,'Called');});

test('VCF sample inventory cannot change midstream or silently ignore extra/missing columns',()=>{
 const columns=header.trimEnd().split('\n').at(-1);
 for(const text of [header+columns+'\n'+row(),header+row()+'\n'+columns.replace('TEST','OTHER')+'\n'+row()])assert.throws(()=>analyzeText(text,catalog),/Duplicate VCF sample header/);
 assert.throws(()=>analyzeText(header+row()+'\n##reference=GRCh38\n'+row(),catalog),/metadata appears after/);
 assert.throws(()=>analyzeText(header+row()+'\t1/1:60:30',catalog),/column count differs/);
 assert.throws(()=>analyzeText(header+row().split('\t').slice(0,-1).join('\t'),catalog),/column count differs/);
 assert.throws(()=>analyzeText(header.replace('POS\tID','ID\tPOS')+row(),catalog),/column header/);
 const multi=header.trimEnd()+'\tOTHER\n'+row()+'\t1/1:60:30';assert.throws(()=>analyzeText(multi+'\n'+row(),catalog,{sample:'TEST'}),/column count differs/);
 const comment=header.replace('##reference','##source=23andMe and AncestryDNA comparison software\n##reference');assert.equal(hit(comment+row()).copies,1);
});

test('streamed concatenated VCFs fail rather than returning a mixed-sample partial report',async()=>{
 const text=header+row()+'\n'+header.replace('TEST','OTHER')+row();
 await assert.rejects(()=>analyzeFile(new File([gzipSync(text)],'synthetic-concatenated.vcf.gz'),catalog),/metadata appears after/);
});

test('ambiguous FORMAT, allele inventories, duplicate sample names and nonfinite qualities fail closed',()=>{
 for(const args of [{format:'GT:GT:GQ:DP',sample:'0/1:1/1:60:30'},{format:'GT:GQ:GQ:DP',sample:'0/1:60:2:30'},{format:'GT::DP',sample:'0/1:60:30'},{sample:'0/1:60:30:extra'},{alt:'A,A',gt:'0/2'},{alt:'G,A',gt:'0/2'}]){
  const r=hit(header+row(args));assert.equal(r.status,'Unsupported call');assert.equal(r.copies,null);
 }
 for(const sample of ['0/1:'+ '9'.repeat(400)+':30','0/1:60:'+ '9'.repeat(400)])assert.equal(hit(header+row({sample})).status,'Quality limited');
 const duplicate=header.trimEnd()+'\tTEST\n'+row()+'\t1/1:60:30';assert.throws(()=>analyzeText(duplicate,catalog,{sample:'TEST'}),/duplicated/);
});
test('explicit reference call is distinct from absent record',()=>{const report=analyzeText(header+row({gt:'0/0'}),catalog);assert.equal(report.results.find(r=>r.id===marker.id).copies,0);const absent=report.results.find(r=>r.id==='rs6025');assert.equal(absent.status,'Not observed');assert.equal(absent.copies,null);});
test('reference-only VCF record is usable when explicitly called',()=>assert.equal(hit(header+row({gt:'0/0',alt:'.'})).copies,0));
test('FORMAT order, phased calls, and chr prefix work',()=>{const r=hit(header+row({format:'DP:GT:GQ',sample:'30:1|0:60',chrom:'chr'+m.chrom}));assert.equal(r.copies,1);assert.equal(r.genotype,'A/G');});
test('ALT index 2 is resolved without collapsing multiallelic calls',()=>{assert.equal(hit(header+row({alt:'T,A',gt:'0/2'})).copies,1);assert.equal(hit(header+row({alt:'T,A',gt:'1/2'})).status,'Allele / ID mismatch');});
test('partial and complete missing GT stay no-call',()=>{for(const gt of ['./.','0/.','.|1']){const r=hit(header+row({gt}));assert.equal(r.status,'No call');assert.equal(r.copies,null);}});
test('invalid ALT index is withheld',()=>assert.equal(hit(header+row({gt:'0/3'})).status,'Unsupported call'));
test('site filters, GQ, DP, and unevaluated quality withhold interpretation',()=>{for(const args of [{filter:'LowQual'},{filter:'.'},{sample:'0/1:5:30'},{sample:'0/1:60:2'},{format:'GT',sample:'0/1'},{sample:'0/1:abc:30'}]){const r=hit(header+row(args));assert.equal(r.status,'Quality limited');assert.equal(r.copies,null);}});
test('wrong reference and reverse-complement calls are not rescued',()=>{assert.equal(hit(header+row({ref:'C'})).status,'Allele / ID mismatch');assert.equal(hit('# 23andMe genome build 38\n'+`${marker.id}\t${m.chrom}\t${m.position}\tCT`).status,'Allele / ID mismatch');});
test('gVCF symbolic blocks, indels and unexpected autosomal ploidy are excluded',()=>{for(const args of [{alt:'<NON_REF>',gt:'0/0'},{alt:'AT',gt:'0/1'},{gt:'1'},{gt:'0/1/1'}])assert.equal(hit(header+row(args)).status,'Unsupported call');});
test('multisample VCF requires exact selection',()=>{const multi=header.trimEnd()+'\tSECOND\n'+row()+'\t1/1:60:30';assert.throws(()=>analyzeText(multi,catalog),/exact sample name/);const r=analyzeText(multi,catalog,{sample:'SECOND'});assert.equal(r.sample,'SECOND');assert.equal(r.results.find(r=>r.id===marker.id).copies,2);});
test('missing build and conflicting build are blocked',()=>{const missing=header.replace('##reference=GRCh38\n','')+row();assert.throws(()=>analyzeText(missing,catalog),/No supported reference build/);assert.equal(analyzeText(missing,catalog,{build:'GRCh38'}).build,'GRCh38');assert.throws(()=>analyzeText(header+row(),catalog,{build:'GRCh37'}),/disagrees/);});
test('wrong coordinates never match by rsID alone',()=>{const r=hit(header+row({pos:1}));assert.equal(r.status,'Not observed');assert.equal(r.copies,null);});
test('consumer formats, reverse allele order, BOM and CRLF',()=>{const a=hit('\uFEFF# AncestryDNA raw data genome build 38\r\nrsid\tchromosome\tposition\tallele1\tallele2\r\n'+`${marker.id}\t${m.chrom}\t${m.position}\tA\tG`);assert.equal(a.copies,1);const b=hit('# 23andMe genome build 38\n'+`${marker.id}\t${m.chrom}\t${m.position}\tAG`);assert.equal(b.copies,1);});
test('consumer no calls preserve missingness',()=>{const a=hit('# AncestryDNA build 38\n'+`${marker.id}\t${m.chrom}\t${m.position}\t0\t0`);assert.equal(a.status,'No call');const b=hit('# 23andMe build 38\n'+`${marker.id}\t${m.chrom}\t${m.position}\t--`);assert.equal(b.status,'No call');});
test('duplicate discordant genotypes are withheld',()=>{const r=hit(header+row()+'\n'+row({gt:'1/1'}));assert.equal(r.status,'Conflicting records');assert.equal(r.copies,null);});
test('identical duplicates remain called',()=>assert.equal(hit(header+row()+'\n'+row()).copies,1));
test('no genotype and unsupported assembly fail clearly',()=>{assert.throws(()=>analyzeText('',catalog),/No genotype/);assert.throws(()=>analyzeText(header.replace('GRCh38','T2T')+row(),catalog),/not supported/);});
function bgzf(text){const gz=gzipSync(text),block=Buffer.concat([gz.subarray(0,10),Buffer.from([6,0,66,67,2,0,0,0]),gz.subarray(10)]);block[3]=4;block.writeUInt16LE(block.length-1,16);return block;}
test('gzip and multi-block BGZF stream correctly',async()=>{const text=header+row();const file=new File([gzipSync(text)],'test.vcf.gz');const r=await analyzeFile(file,catalog);assert.equal(r.results.find(x=>x.id===marker.id).copies,1);const concatenated=new File([bgzf(header),bgzf(row()),bgzf('')],'blocks.vcf.gz');assert.equal((await analyzeFile(concatenated,catalog)).stats.records,1);});
test('corrupt or truncated BGZF never returns a partial report',async()=>{const part=bgzf(row()),bad=Buffer.from(part);bad[bad.length-8]^=255;await assert.rejects(()=>analyzeFile(new File([bgzf(header),bad],'crc.vcf.gz'),catalog));await assert.rejects(()=>analyzeFile(new File([bgzf(header),part.subarray(0,part.length-1)],'short.vcf.gz'),catalog));});
test('truncated gzip produces failure, not a partial report',async()=>{const data=gzipSync(header+row());await assert.rejects(()=>analyzeFile(new File([data.subarray(0,data.length-6)],'bad.vcf.gz'),catalog));});
test('unknown frequency differs from zero and rarity boundaries',()=>{assert.equal(rarity(null),'Unknown');assert.equal(rarity(0),'Not observed in reference');assert.equal(rarity(0.001),'Rare (<1%)');assert.equal(rarity(.01),'Low frequency (1–5%)');assert.equal(rarity(.05),'Common (≥5%)');});
test('catalog refuses wrong frequency allele and duplicate IDs',()=>{const c=structuredClone(catalog);c.records[0].frequency.allele='C';assert.throws(()=>validateCatalog(c),/frequency/);c.records[0]=structuredClone(catalog.records[0]);c.records.push(c.records[0]);assert.throws(()=>validateCatalog(c),/unique/);});
