import {readFile,mkdir,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {proveEquivalentDeletion} from './pgs-deletion-equivalence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const CERVICAL_DELETION_FILES={
 'metadata.json':'e34af55b8f878194f1d03840427efbce8884a61750a96c9fffd6d939e87d068b',
 'original.txt.gz':'84a2cfad847d064798f08adfa6a1fb4ac8aedd601726d0fc150720765ef254ac',
 'refsnp-558000791.json':'209df94ec1ae948cb83ad636e1e678c162251830e28e2f6cfbd33f9fd7753644',
 'refsnp-67426997.json':'acfa6cf6e6f08f04c10880481c87a756f04706eb606e43c2bb480fda3b2dbd5b',
 'refsnp-9279333.json':'c433b21f077ba6661acb6248d6d3c4885b45f7615e02d06775ce1d28fa7b2f1e',
 'GRCh37.txt.gz':'96eed05a2aaf4c3bf02ec512d3eec115799a9496639ece638bb1c06bb83d12f8',
 'GRCh38.txt.gz':'c6bc96c1530e31e409a7926d47e847b444ca45a0c9929dc9dab22b1c5faa5fd5',
 'GRCh37-variation.json':'d5f5762acace7c7c1cf607ed7b35ef5dd355887537c274ab41afedca0092d250',
 'GRCh38-variation.json':'26222e177caa74c0ffd22df1c36a9429bf0fc15510b307455686f4ae0eff4e39',
 'GRCh37-sequence.json':'df6323130a6a66464e6db51b7b7f194bd6f618e537fa0d777fa81481ccef42d4',
 'GRCh38-sequence.json':'35c2525685697e40eea6d79bce23ee83467522c5d8fa0edf4963bc595f9db295'
};
const fixture=new URL('../test/fixtures/pgs/cervical-deletion/',import.meta.url);
function rows(bytes){const lines=gunzipSync(bytes).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),keys=lines.shift().split('\t');return lines.map(l=>{const values=l.split('\t');if(values.length!==keys.length)throw Error('Malformed complete scoring file');return Object.fromEntries(keys.map((k,i)=>[k,values[i]]));});}
export async function loadCervicalDeletionProof(load=name=>readFile(new URL(name,fixture))){
 const data={};for(const [name,sha256] of Object.entries(CERVICAL_DELETION_FILES)){const bytes=await load(name);if(hash(bytes)!==sha256)throw Error('Frozen deletion evidence hash mismatch: '+name);data[name]=bytes;}
 const json=name=>JSON.parse(data[name]),source=rows(data['original.txt.gz']),term=source.find(r=>r.rsID==='rs558000791');
 const metadata=json('metadata.json');if(metadata.id!=='PGS005165'||metadata.name!=='PRS-CC'||metadata.variants_number!==15||metadata.variants_interactions!==0||metadata.weight_type!=='beta'||metadata.matches_publication!==true||String(metadata.publication?.PMID)!=='40019942')throw Error('Unreviewed cervical metadata');
 if(source.length!==15||new Set(source.map(r=>r.rsID)).size!==15||!term||term.chr_name!=='6'||term.chr_position!=='31495508'||term.effect_allele!=='A'||term.other_allele!=='AAG'||term.effect_weight!=='-0.318')throw Error('Wrong complete published source');
 const chain=['558000791','67426997','9279333'];
 for(let i=0;i<chain.length;i++){const raw=json('refsnp-'+chain[i]+'.json');if(raw.refsnp_id!==chain[i]||i<2&&JSON.stringify(raw.merged_snapshot_data?.merged_into)!==JSON.stringify([chain[i+1]])||i===2&&!raw.primary_snapshot_data)throw Error('Unproven RefSNP merge chain');}
 const ncbi=json('refsnp-9279333.json'),proofs={};let referenceSequence;
 for(const [build,position,accession] of [['GRCh37',31495509,'NC_000006.11'],['GRCh38',31527732,'NC_000006.12']]){
  const hm=rows(data[build+'.txt.gz']);if(hm.length!==15||new Set(hm.map(r=>r.rsID)).size!==15)throw Error('Incomplete harmonized model');
  for(const r of source){const h=hm.find(h=>h.rsID===r.rsID);if(!h||['effect_allele','other_allele','effect_weight'].some(k=>h[k]!==r[k]))throw Error('Source terms changed');}
  const h=hm.find(r=>r.rsID===term.rsID);if(h.hm_rsID!=='rs9279333'||h.hm_chr!=='6'||Number(h.hm_pos)!==position||build==='GRCh37'&&h.hm_match_pos!=='False')throw Error('Unexpected harmonization annotation');
  const variation=json(build+'-variation.json'),maps=variation.mappings.filter(m=>m.assembly_name===build&&/^(?:[1-9]|1\d|2[0-2])$/.test(m.seq_region_name));
  if(variation.name!=='rs9279333'||maps.length!==1||maps[0].seq_region_name!=='6'||maps[0].start!==position||maps[0].end!==position+2||maps[0].strand!==1||maps[0].allele_string!=='AGA/A')throw Error('Independent Ensembl placement disagrees');
  const placements=ncbi.primary_snapshot_data.placements_with_allele.filter(p=>p.seq_id===accession&&p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  if(placements.length!==1||placements[0].placement_annot.is_aln_opposite_orientation||placements[0].placement_annot.is_mismatch)throw Error('Unproven RefSNP primary placement');
  const spdi=placements[0].alleles.map(a=>a.allele.spdi);if(spdi.length!==2||spdi.some(s=>s.seq_id!==accession||s.position!==position-1||s.deleted_sequence!=='AGA')||JSON.stringify(spdi.map(s=>s.inserted_sequence).sort())!==JSON.stringify(['A','AGA']))throw Error('Independent RefSNP allele pair disagrees');
  const sequence=json(build+'-sequence.json'),start=position-100;
  if(sequence.id!==`chromosome:${build}:6:${start}:${position+102}:1`||sequence.query!==`6:${start}..${position+102}:1`||sequence.molecule!=='dna'||sequence.seq.length!==203)throw Error('Wrong reference sequence interval');
  if(referenceSequence&&referenceSequence!==sequence.seq)throw Error('Reference haplotypes differ between builds');referenceSequence=sequence.seq;
  const window={build,chrom:'6',start,sequence:sequence.seq},first={build,chrom:'6',strand:1,position:position-1,ref:'AAG',alt:'A'},second={...first,position,ref:'AGA'};
  proofs[build]=proveEquivalentDeletion(window,first,second);
 }
 return {id:'PGS005165',sourceId:term.rsID,canonicalId:'rs9279333',mergeChain:chain,sourceWeight:term.effect_weight,sourceAlleles:[term.effect_allele,term.other_allele],sourceBuild:'GRCh37',proofs,scope:'Exact two-representation identity; GRCh38 first representation is aligned by identical full windows, not an original source coordinate. This proof alone does not verify the other 14 SNVs or authorize a partial model. No Catalog-file modification.'};
}
export async function freezeCervicalDeletionProof(){
 await mkdir(fixture,{recursive:true});
 for(const [name,expected] of Object.entries(CERVICAL_DELETION_FILES)){
  const source=name==='metadata.json'?new URL('../work/pgs-source/PGS005165.json',import.meta.url):name==='original.txt.gz'?new URL('../work/pgs-source/PGS005165.txt.gz',import.meta.url):new URL('../work/cervical-indel-evidence/'+name+'-'+expected,import.meta.url);
  if(hash(await readFile(source))!==expected)throw Error('Public cache changed');
  const dest=new URL(name,fixture);try{if(hash(await readFile(dest))!==expected)throw Error('Refusing to replace frozen evidence');}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,dest);}
 }
 return loadCervicalDeletionProof();
}
