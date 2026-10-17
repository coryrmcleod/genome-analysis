// Parse only the bounded germline SNV evidence layer. Never interprets user genotypes.
export const CLINICAL_GENES = new Set('LDLR APOB PCSK9 LDLRAP1 HFE HJV HAMP TFR2 SLC40A1 CFTR PAH GALT ATP7B SERPINA1 G6PC GCK HNF1A HNF4A KCNJ11 ABCC8 RYR1 CACNA1S KCNQ1 KCNH2 SCN5A MYBPC3 MYH7 LMNA FBN1 COL3A1 TGFBR1 TGFBR2 SMAD3 ACTA2 TTR BRCA1 BRCA2 PALB2 CHEK2 ATM MLH1 MSH2 MSH6 PMS2 APC MUTYH TP53 PTEN STK11 CDH1 VHL MEN1 RET SDHB SDHD BTD ALPL SLC2A1 OTC GLA DICER1 RUNX1 BMPR2 SERPINC1 VWF HBB GAA ACADVL IDUA MYOC ITGA2B ITGB3 DYSF CAPN3 SGCA RPE65 ABCA4 CYP1B1 GUCY2D CEP290 USH2A MYO7A GJB2 SLC26A4 ENG ACVRL1 ADA RAG1 RAG2 IL7R'.split(' '));
export function parseClinVarRow(line,genes=CLINICAL_GENES){
 if(!line||line.startsWith('#'))return null;
 const f=line.split('\t');
 if(f.length<8||!/^(?:[1-9]|1\d|2[0-2])$/.test(f[0])||!/^\d+$/.test(f[2])||!/^[ACGT]$/.test(f[3])||!/^[ACGT]$/.test(f[4])||f[3]===f[4]||!Number.isSafeInteger(Number(f[1]))||Number(f[1])<1)return null;
 const info=Object.fromEntries(f[7].split(';').map(x=>{const i=x.indexOf('=');return i<0?[x,true]:[x.slice(0,i),x.slice(i+1)];}));
 if(!/^\d+$/.test(info.RS||'')||!['reviewed_by_expert_panel','practice_guideline'].includes(info.CLNREVSTAT)||!['Pathogenic','Likely_pathogenic','Pathogenic/Likely_pathogenic'].includes(info.CLNSIG)||info.CLNSIGINCL||info.CLNSIGCONF)return null;
 const matching=(info.GENEINFO||'').split('|').map(s=>s.split(':')[0]).filter(g=>genes.has(g));
 if(!matching.length)return null;
 return {variationId:f[2],id:'rs'+info.RS,genes:matching,chrom:f[0],position:Number(f[1]),ref:f[3],alt:f[4],classification:info.CLNSIG,reviewStatus:info.CLNREVSTAT,conditions:info.CLNDN||'Not supplied',conditionIdentifiers:info.CLNDISDB||'Not supplied'};
}
export function pairClinVarBuilds(grch37,grch38){
 const result=[];
 for(const [id,v] of grch38){const old=grch37.get(id);if(old&&old.id===v.id&&old.ref===v.ref&&old.alt===v.alt)result.push({...v,mappings:{GRCh37:{chrom:old.chrom,position:old.position,ref:old.ref,alleles:[old.ref,old.alt]},GRCh38:{chrom:v.chrom,position:v.position,ref:v.ref,alleles:[v.ref,v.alt]}}});}
 return result;
}
