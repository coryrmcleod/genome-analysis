// Narrow offline certificate for one independently reviewed PGS deletion.
// This module does not activate a model or relax the ordinary SNV catalog.
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const CERVICAL_PGS_DELETION=freeze({
 modelId:'PGS005165',id:'rs9279333',sourceId:'rs558000791',sourceBuild:'GRCh37',sourcePosition:31495508,sourceEffectAllele:'A',sourceOtherAllele:'AAG',weightText:'-0.318',variantCount:15,
 originalSha256:'84a2cfad847d064798f08adfa6a1fb4ac8aedd601726d0fc150720765ef254ac',
 mergeChain:['558000791','67426997','9279333'],
 files:{
  'metadata.json':'e34af55b8f878194f1d03840427efbce8884a61750a96c9fffd6d939e87d068b',
  'refsnp-558000791.json':'209df94ec1ae948cb83ad636e1e678c162251830e28e2f6cfbd33f9fd7753644',
  'refsnp-67426997.json':'acfa6cf6e6f08f04c10880481c87a756f04706eb606e43c2bb480fda3b2dbd5b',
  'refsnp-9279333.json':'c433b21f077ba6661acb6248d6d3c4885b45f7615e02d06775ce1d28fa7b2f1e',
  'GRCh37.txt.gz':'96eed05a2aaf4c3bf02ec512d3eec115799a9496639ece638bb1c06bb83d12f8',
  'GRCh38.txt.gz':'c6bc96c1530e31e409a7926d47e847b444ca45a0c9929dc9dab22b1c5faa5fd5',
  'GRCh37-variation.json':'d5f5762acace7c7c1cf607ed7b35ef5dd355887537c274ab41afedca0092d250',
  'GRCh38-variation.json':'26222e177caa74c0ffd22df1c36a9429bf0fc15510b307455686f4ae0eff4e39',
  'GRCh37-sequence.json':'df6323130a6a66464e6db51b7b7f194bd6f618e537fa0d777fa81481ccef42d4',
  'GRCh38-sequence.json':'35c2525685697e40eea6d79bce23ee83467522c5d8fa0edf4963bc595f9db295'
 },
 sequence:'CAGACACTTCCCCAGTGAATGCTGAATGAAACCATCTGAGCCAGTTTCCTCAGGTGCAAACCAGTGAGGTAATTCCTACCTTGCAGAGTGAAGTGAGAAAAGACAGTGTTAAGAAATGCCGGGTGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGGGAGGCCAAGACGGGCGGATCATGAGGTCAGGAGATCGAGACCACC',
 builds:{GRCh37:{windowStart:31495409,position:31495509},GRCh38:{windowStart:31527632,position:31527732}},
 scope:'Exact complete-source deletion identity and equivalent full local haplotypes only. No imputation, proxy, strand inference, clinical validation or model admission.'
});
export function reviewedPGSDeletionMappings(){return Object.fromEntries(Object.entries(CERVICAL_PGS_DELETION.builds).map(([build,b])=>[build,{chrom:'6',position:b.position,ref:'AGA',alleles:['AGA','A']} ]));}
export function validateReviewedPGSDeletionTarget(target){
 if(target?.id!==CERVICAL_PGS_DELETION.id||target.variantKind!=='reviewed-pgs-deletion'||target.effectAllele!=='A'||JSON.stringify(target.reviewedDeletion)!==JSON.stringify(CERVICAL_PGS_DELETION)||JSON.stringify(target.mappings)!==JSON.stringify(reviewedPGSDeletionMappings()))throw Error('Unreviewed PGS deletion target');
 return target;
}
export function validateReviewedPGSDeletionTerm({modelId,variantCount,originalSha256,term,target}){
 validateReviewedPGSDeletionTarget(target);const e=CERVICAL_PGS_DELETION;
 if(modelId!==e.modelId||variantCount!==e.variantCount||originalSha256!==e.originalSha256||term?.id!==e.id||term.sourceId!==e.sourceId||term.kind!=='reviewed-deletion'||term.sourceEffectAllele!==e.sourceEffectAllele||term.sourceOtherAllele!==e.sourceOtherAllele||term.effectAllele!=='A'||term.otherAllele!=='AGA'||term.weightText!==e.weightText||term.weight!==-0.318||term.reverseComplemented!==false||term.buildAlleles||term.alleleMode==='effect-only')throw Error('Unreviewed PGS deletion source term');
 return term;
}
