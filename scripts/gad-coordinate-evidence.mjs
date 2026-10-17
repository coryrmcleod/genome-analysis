// Exact, independently reviewed missing-coordinate evidence. Never a general repair rule.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const GAD_REVIEW=Object.freeze({id:'PGS018943',variant:'rs7256902',count:21630,
 original:'1ffc3fd44803d59351df1dabdaa3d555a291e221c4226cc97f6eaab627dc0bf5',
 GRCh37:'ef86bd45fd24b7ef0bba7b7a9772af2cfd73d5cd4a74d62f9ccfc1c9498f0c81',
 GRCh38:'dcd33c70e27debe014a83a5abc9aae3dbf69b36a883333396420893df1f24b42'});
export const GAD_PROOF_FILES=Object.freeze({
 'GRCh37-variation.json':'89097a0b769cfd858f0b6d674f438ea8001262224e3dd2e3a640fd92d71152aa',
 'GRCh38-variation.json':'5db2cc6c43b3b0c110ae4307ea55380e554e502e5ebdc2f2daa2e1a937cc49ce',
 'GRCh37-sequence.json':'6887369280f100ba0a5489bf95b48f795f29c1f9f16dba92b9afb7591026ea5d',
 'GRCh38-sequence.json':'4a9883ae263baf3029814d83a619f33c933148e03fb53f83c454f488a5e3d3aa',
 'GRCh37-overlap.json':'df20dbdd58dc7e6557cbb68e4182c8c8088f1389ed7fb9d4c13a5f66d84c275c',
 'GRCh38-overlap.json':'a8328c5ad884292c41c4ef07560539bca39d9dcc818849852c253f299fd3be0b',
 'GRCh37-map-0.json':'655fc58f1e0e7c2837b0207c12b3588f02a0102404d2a157056515330c60aa04',
 'GRCh37-map-100.json':'6e05670f94f20df4243f9b9533e356c0d442ea4a6e8511a34cbe7c1d73554f2e',
 'GRCh38-map-0.json':'1e74214e7bc0a72ab4261852c388a67523e78d32db806da5ddc5f805860e0584',
 'GRCh38-map-100.json':'e493e849a36d2f77dd8a219d050211b8c06add62b0c196dc4e655f89864373c0',
 'refsnp.json':'ffb164346c2a72db4a25163ff11f44466fd57c34768dc0bbd385af16485d3228'
});
const positions={GRCh37:40413482,GRCh38:39907575};
const requireProof=(ok,message)=>{if(!ok)throw Error('GAD coordinate proof: '+message);};
export function verifyGADPublicMappingEvidence(data){
 const db=data['refsnp.json'];requireProof(db?.refsnp_id==='7256902','wrong RefSNP');
 for(const [build,pos] of Object.entries(positions)){
  const other=build==='GRCh37'?'GRCh38':'GRCh37',target=positions[other],v=data[build+'-variation.json'];
  requireProof(v?.name==='rs7256902'&&v.var_class==='SNP','wrong canonical variant');
  const primary=v.mappings.filter(m=>m.assembly_name===build&&m.seq_region_name==='19');
  requireProof(primary.length===1&&primary[0].start===pos&&primary[0].end===pos&&primary[0].strand===1&&primary[0].allele_string==='C/A','primary variation placement');
  const overlap=data[build+'-overlap.json'];requireProof(Array.isArray(overlap)&&overlap.length===1,'coordinate identity is not unique');
  const o=overlap[0];requireProof(o.id==='rs7256902'&&o.source==='dbSNP'&&o.assembly_name===build&&o.seq_region_name==='19'&&o.start===pos&&o.end===pos&&o.strand===1&&JSON.stringify(o.alleles)===JSON.stringify(['C','A']),'coordinate identity disagrees');
  const seq=data[build+'-sequence.json'];requireProof(seq?.id===`chromosome:${build}:19:${pos-100}:${pos+100}:1`&&/^[ACGT]{201}$/.test(seq.seq)&&seq.seq[100]==='C','reference sequence identity');
  for(const flank of [0,100]){
   const maps=data[build+'-map-'+flank+'.json']?.mappings;requireProof(Array.isArray(maps)&&maps.length===1,'assembly converter is not unique');
   for(const [key,assembly,p] of [['original',build,pos],['mapped',other,target]]){const m=maps[0][key];requireProof(m?.assembly===assembly&&m.seq_region_name==='19'&&m.coord_system==='chromosome'&&m.strand===1&&m.start===p-flank&&m.end===p+flank,'assembly converter is not exactly reciprocal');}
  }
  const accession=build==='GRCh37'?'NC_000019.9':'NC_000019.10';
  const placements=db.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(t=>t.assembly_name.startsWith(build+'.')&&t.is_chromosome&&t.is_top_level&&!t.is_alt&&!t.is_patch));
  requireProof(placements.length===1&&placements[0].seq_id===accession&&placements[0].placement_annot.is_aln_opposite_orientation===false,'NCBI primary placement');
  const alleles=placements[0].alleles.map(a=>a.allele.spdi);requireProof(alleles.length===2&&alleles.every(a=>a.seq_id===accession&&a.position===pos-1&&a.deleted_sequence==='C')&&alleles.map(a=>a.inserted_sequence).sort().join('/')==='A/C','NCBI reference/alternate alleles');
 }
 requireProof(data['GRCh37-sequence.json'].seq===data['GRCh38-sequence.json'].seq,'flanks differ');
 return true;
}
export async function loadGADPublicMappingEvidence(directory=new URL('../test/fixtures/pgs/gad-coordinate/',import.meta.url)){
 const data={};for(const [name,expected] of Object.entries(GAD_PROOF_FILES)){const bytes=await readFile(new URL(name,directory));requireProof(hash(bytes)===expected,'source hash changed: '+name);data[name]=JSON.parse(bytes);}
 verifyGADPublicMappingEvidence(data);return data;
}
