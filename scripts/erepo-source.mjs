export const EREPO_COLUMNS=['Variation','ClinVar Variation Id','Allele Registry Id','HGVS Expressions','HGNC Gene Symbol','Disease','Mondo Id','Mode of Inheritance','Assertion','Applied Evidence Codes (Met)','Applied Evidence Codes (Not Met)','Summary of interpretation','PubMed Articles','Expert Panel','Guideline','Approval Date','Published Date','Retracted','Evidence Repo Link','Uuid'];
export function parseAssemblyAccessions(text){
 if(!/^# Assembly name:  GRCh38\.p14$/m.test(text))throw Error('Expected GRCh38.p14 assembly report');const result={};
 for(const line of text.split(/\r?\n/)){if(!line||line.startsWith('#'))continue;const f=line.split('\t');if(f[1]==='assembled-molecule'&&/^(?:[1-9]|1\d|2[0-2])$/.test(f[2])){if(!/^NC_\d+\.\d+$/.test(f[6])||result[f[2]])throw Error('Invalid primary chromosome accession');result[f[2]]=f[6];}}
 if(Object.keys(result).length!==22)throw Error('Assembly report lacks autosomes');return result;
}
export function selectExpertAssertions(text,clinical,accessions){
 // Despite the endpoint's type=csv parameter, the published file is tab-delimited.
 const lines=text.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);if(JSON.stringify(lines.shift().split('\t'))!==JSON.stringify(EREPO_COLUMNS))throw Error('Unexpected Evidence Repository source columns');
 const targets=new Map();for(const r of clinical.records)for(const a of r.clinvar){if(targets.has(a.variationId))throw Error('Duplicate target variation ID');targets.set(a.variationId,{r,a});}
 const records=[],audit={sourceRows:lines.length,notSelected:0,retractedOrUnspecified:0,identityMismatch:[],retained:0};const seen=new Set();
 for(const line of lines){const f=line.split('\t');if(f.length!==EREPO_COLUMNS.length)throw Error('Malformed Evidence Repository row');if(seen.has(f[19]))throw Error('Duplicate source assertion UUID');seen.add(f[19]);
  const target=targets.get(f[1]);if(!target){audit.notSelected++;continue;}if(f[17]!=='false'){audit.retractedOrUnspecified++;continue;}
  const {r,a}=target,m=r.mappings.GRCh38,hgvs=`${accessions[m.chrom]}:g.${m.position}${m.ref}>${a.allele}`;
  if(!f[3].split(',').includes(hgvs)||!r.gene.split(/\s*\/\s*/).includes(f[4])){audit.identityMismatch.push({variationId:f[1],uuid:f[19]});continue;}
  const values=s=>[...new Set(s.split(',').map(v=>v.trim()).filter(Boolean))];
  records.push({uuid:f[19],variationId:f[1],alleleRegistryId:f[2]||null,gene:f[4],chrom:m.chrom,position:m.position,ref:m.ref,alt:a.allele,genomicHGVS:hgvs,disease:f[5],mondo:f[6],inheritance:f[7]||'Not specified',classification:f[8],evidenceMet:values(f[9]),evidenceNotMet:values(f[10]),pmids:values(f[12]),panel:f[13],guidelineURL:f[14],approvalDate:f[15],publishedDate:f[16],retracted:false,url:f[18]});
 }
 audit.retained=records.length;return {records,audit};
}
