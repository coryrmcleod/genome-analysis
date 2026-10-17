import test from 'node:test';
import assert from 'node:assert/strict';
import {screenUnevaluatedPreparationRecord as screen} from '../public/preparation-quality.js';
import fs from 'node:fs';
import {analyzeText} from '../public/engine.js';
import {ancestryTargetCatalog,estimateAncestry} from '../public/ancestry.js';
const row=(filter='.',gt='0|1',gq='30',dp='25',alt='G')=>`chr1\t10\t.\tA\t${alt}\t60\t${filter}\t.\tGT:GQ:DP\t${gt}:${gq}:${dp}`;
test('preparation explicitly screens unevaluated genotypes and retains phase and quality',()=>{
 const before=row(),after=screen(before);assert.equal(after.passed,true);assert.equal(after.line.split('\t')[6],'PASS');assert.equal(after.line.split('\t')[9],before.split('\t')[9]);assert.equal(after.line.split('\t')[5],'60');
 for(const record of [row('.', '0/1','19'),row('.','0/1','30','9'),row('.','./.'),row('.','0'),row('.','0/1','.')]){assert.equal(screen(record).passed,false);assert.equal(screen(record).line.split('\t')[6],'GA_PREPARATION_LOWQUAL');}
 for(const record of [row('PASS'),row('VQSRTranche'),row('GA_CALL_DISAGREEMENT'),row('.','0/1','30','25','<NON_REF>'),row('.','0/1','30','25','AG')])assert.deepEqual(screen(record),{line:record,screened:false});
});
test('unfiltered public genotypes recover ancestry through explicit preparation without weakening import gates',()=>{
 const panel=JSON.parse(fs.readFileSync(new URL('../public/data/ancestry-reference.json',import.meta.url)));
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ancestry/public-fixtures.json',import.meta.url)))[0];
 const lines=['##fileformat=VCFv4.2','##reference=GRCh38','#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t'+fixture.publicSample];
 for(const [i,m] of panel.markers.entries()){const p=m.mappings.GRCh38,d=fixture.dosages[i],gt=d===null?'./.':d===0?'0/0':d===1?'0/1':'1/1';lines.push([p.chrom,p.position,m.id,p.ref,m.alt,60,i%2?'.':'PASS','.','GT:GQ:DP',gt+':40:30'].join('\t'));}
 const catalog=ancestryTargetCatalog(panel),fit=text=>estimateAncestry(analyzeText(text,catalog),panel);
 assert.equal(fit(lines.join('\n')).status,'Unavailable');
 const result=fit(lines.map(line=>screen(line).line).join('\n'));
 assert.equal(result.status,'Estimated');assert.ok(result.coverage>=.9);
});
