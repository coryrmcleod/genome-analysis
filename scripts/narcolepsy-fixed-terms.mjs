// Exact GRS4 definition: Table2 (five scored IDs), Table1 (their allele pairs
// and counted risk alleles), and additive-count methods, visually reviewed.
// This is NOT a proxy finder or an exemption for other annotated models.
export const NARCOLEPSY_FIXED_METHOD={
 id:'PGS000757',publicationPMID:'32175396',
 originalSha256:'40823c92d3ebb110fa5670a067c9783f2df42cc7da6f31084db0f6cc4db981eb',
 sourceURL:'https://cdn.amegroups.cn/journals/amepc/files/journals/16/articles/34291/public/34291-PB10-7819-R3.pdf',
 sourceSha256:'b3a53399597aa115f941e61c5685c54bdd21f078a623d685fb6bb4f8ce97b109',sourceFile:'PGS000757-methods.pdf',
 method:'Ouyang2020 Table2 GRS4 lists these exact five scored rsIDs; Table1 lists their allele pairs and counted alleles, and page4 specifies summing risk-allele copies. All original coefficients are1 and the Unweighted label is retained. The deposited rs2834188 term is itself the author-selected scored marker, explicitly listed in GRS4, not a substitute selected by GA. Its index-marker annotation is provenance only: GA never scores rs2252931 in its place. The separate32-term GRS3 deposit remains excluded because its inventory disagrees with Table2.'
};
const terms=[['rs2854536','7','T','C',''],['rs10995245','10','A','G',''],['rs1154155','14','T','G',''],['rs2834188','21','A','G','Proxy for rs2252931, r^2 = 0.999'],['rs9274477','6','A','G','']];
export function verifyNarcolepsyFixedRows(metadata,rows){
 if(metadata.pgs_id!=='PGS000757'||metadata.pgs_name!=='GRS4_Nar'||metadata.weight_type!=='Unweighted'||rows.length!==5)throw Error('Unreviewed fixed narcolepsy definition');
 for(const [id,chrom,effect,other,annotation] of terms){const matches=rows.filter(r=>r.rsID===id);if(matches.length!==1)throw Error('Missing or duplicate fixed narcolepsy term');const r=matches[0];if(r.chr_name!==chrom||r.effect_allele!==effect||r.other_allele!==other||r.effect_weight!=='1'||(r.variant_description||'')!==annotation)throw Error('Fixed narcolepsy term or annotation changed');}
 return true;
}
export function verifyNarcolepsyFixedMethod(meta,originalSha256,documentSha256){
 const e=NARCOLEPSY_FIXED_METHOD;
 if(meta.id!==e.id||meta.name!=='GRS4_Nar'||String(meta.publication?.PMID)!==e.publicationPMID||meta.weight_type!=='Unweighted'||meta.variants_number!==5||meta.matches_publication!==true||originalSha256!==e.originalSha256||documentSha256!==e.sourceSha256)throw Error('Unreviewed frozen narcolepsy method');
 return {...e};
}
