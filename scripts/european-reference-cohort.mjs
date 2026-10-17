import fs from 'node:fs';
import path from 'node:path';

export const EUROPEAN_GROUPS={GBR:91,FIN:99,IBS:107,CEU:99,TSI:107};
const rows=text=>text.split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#')).map(line=>line.trim().split(/\s+/));
export function validateEuropeanSampleIds(ids,expected){
 if(expected.length!==503||new Set(expected).size!==503||ids.length!==503||new Set(ids).size!==503)throw Error('EUR sample identities are incomplete or duplicated');
 const keep=new Set(expected);if(ids.some(id=>!keep.has(id)))throw Error('Reference VCF contains individuals outside the selected EUR cohort');
}
export function europeanCohortIds(sampleText,excludedText){
 const lines=sampleText.trim().split(/\r?\n/),columns=lines.shift().replace(/^#/,'').trim().split(/\s+/);
 const iid=columns.indexOf('IID'),superpop=columns.indexOf('SuperPop'),population=columns.indexOf('Population');
 if([iid,superpop,population].some(i=>i<0))throw Error('Unreviewed public population metadata columns');
 const excluded=new Set(rows(excludedText).map(r=>r.at(-1))),seen=new Set(),selected=[],groups={};
 for(const line of lines){if(!line.trim())continue;const row=line.trim().split(/\s+/);if(row.length!==columns.length||seen.has(row[iid]))throw Error('Incomplete or duplicated public sample metadata');seen.add(row[iid]);
  if(row[superpop]!=='EUR'||excluded.has(row[iid]))continue;
  selected.push(row[iid]);groups[row[population]]=(groups[row[population]]||0)+1;
 }
 if(selected.length!==503||JSON.stringify(Object.entries(groups).sort())!==JSON.stringify(Object.entries(EUROPEAN_GROUPS).sort()))throw Error('Unreviewed EUR reference cohort');
 return selected;
}
export function readEuropeanCohort(root){
 const expected=europeanCohortIds(fs.readFileSync(path.join(root,'extracted','GRCh37_1000G_ALL.psam'),'utf8'),fs.readFileSync(path.join(root,'extracted','GRCh37_1000G.king.cutoff.out.id'),'utf8'));
 const keep=rows(fs.readFileSync(path.join(root,'eur.keep'),'utf8')).map(r=>r.at(-1));validateEuropeanSampleIds(keep,expected);
 return expected;
}
