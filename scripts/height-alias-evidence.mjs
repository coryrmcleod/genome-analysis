// Exact frozen source/locus reconciliation; no general preference among identifiers.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const HEIGHT_ALIAS_MANIFEST_SHA='5cab1758e5026e3622c7ba23546bfd1cea148f2176a57e0cce541932cf187a78';
export const HEIGHT_ORIGINAL_SHA='4e8c3ec9624ebe2438241c0f5be310d008420f37fa7639de06a94bf5876e96e6';
const aliases=['2125138490','2125138509','2125138525','2125138561'],canonical='2270894';
const root=new URL('../test/fixtures/pgs/height-alias/',import.meta.url);
export function verifyHeightAliasData(data){
 const require=(ok,message)=>{if(!ok)throw Error('Height alias proof: '+message);};
 for(const id of aliases){const row=data['refsnp-'+id+'.json'];require(row?.refsnp_id===id&&!row.primary_snapshot_data&&!row.withdrawn_snapshot_data&&!row.unsupported_snapshot_data&&JSON.stringify(row.merged_snapshot_data?.merged_into)===JSON.stringify([canonical]),'merge chain');}
 const row=data['refsnp-'+canonical+'.json'];require(row?.refsnp_id===canonical&&row.primary_snapshot_data&&!row.merged_snapshot_data&&!row.withdrawn_snapshot_data&&!row.unsupported_snapshot_data,'canonical identity');
 for(const [build,seq,position] of [['GRCh37','NC_000003.11',9975385],['GRCh38','NC_000003.12',9933701]]){
  const placements=row.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  require(placements.length===1&&placements[0].seq_id===seq&&placements[0].placement_annot.is_aln_opposite_orientation===false&&placements[0].placement_annot.is_mismatch===false,'primary placement');
  const alleles=placements[0].alleles.map(a=>a.allele.spdi);require(alleles.length===3&&alleles.every(a=>a.seq_id===seq&&a.position===position&&a.deleted_sequence==='C')&&alleles.map(a=>a.inserted_sequence).sort().join('')==='CGT','primary alleles');
 }
 const overlap=data['overlap.json'];require(Array.isArray(overlap),'overlap inventory');
 const compatible=overlap.filter(r=>r.source==='dbSNP'&&r.assembly_name==='GRCh37'&&r.seq_region_name==='3'&&r.start===9975386&&r.end===9975386&&r.strand===1&&Array.isArray(r.alleles)&&r.alleles.includes('G')&&r.alleles.includes('C'));
 const expected=[canonical,...aliases].map(id=>'rs'+id).sort();require(compatible.length===expected.length&&new Set(compatible.map(r=>r.id)).size===expected.length&&compatible.map(r=>r.id).sort().join(',')===expected.join(','),'complete compatible identity set');
 require(compatible.every(r=>r.alleles.length>=2&&new Set(r.alleles).size===r.alleles.length&&r.alleles.every(a=>a.length===1&&'CGT'.includes(a))),'overlap alleles');
 return true;
}
export async function loadHeightAliasProof(load=name=>readFile(new URL(name,root))){
 const manifestBytes=await load('manifest.json');if(hash(manifestBytes)!==HEIGHT_ALIAS_MANIFEST_SHA)throw Error('Height alias manifest changed');
 const manifest=JSON.parse(manifestBytes),data={};
 for(const file of manifest.files){const bytes=await load(file.name);if(hash(bytes)!==file.sha256)throw Error('Height alias source hash changed: '+file.name);data[file.name]=file.name.endsWith('.gz')?bytes:JSON.parse(bytes);}
 if(hash(data['original.txt.gz'])!==HEIGHT_ORIGINAL_SHA)throw Error('Height original changed');
 const text=gunzipSync(data['original.txt.gz']).toString(),lines=text.split(/\r?\n/).filter(line=>line&&!line.startsWith('#')),columns=lines.shift().split('\t'),rows=lines.map(line=>Object.fromEntries(line.split('\t').map((v,i)=>[columns[i],v]))),term=rows.filter(r=>r.chr_name==='3'&&r.chr_position==='9975386');
 if(!/^#pgs_id=PGS002980$/m.test(text)||!/^#genome_build=GRCh37$/m.test(text)||rows.length!==2469||term.length!==1||term[0].effect_allele!=='G'||term[0].other_allele!=='C'||term[0].effect_weight!=='-0.031')throw Error('Wrong height source term');
 verifyHeightAliasData(data);
 return {modelId:'PGS002980',sourceId:'coordinate:GRCh37:3:9975386',canonicalId:'rs'+canonical,aliases:aliases.map(id=>'rs'+id),originalSha256:HEIGHT_ORIGINAL_SHA,overlapSha256:manifest.files.find(f=>f.name==='overlap.json').sha256,fixtureDirectory:'height-alias',manifestSha256:HEIGHT_ALIAS_MANIFEST_SHA,files:manifest.files,scope:'Exact frozen source/locus only. Explicit NCBI merges and primary placements on both builds; full C/G/T allele inventory retained. No inferred palindromic strand, coefficient replacement or model admission.'};
}
export async function reviewedHeightIdentity({modelId,originalSha256,row,build,overlapSha256}){
 if(modelId!=='PGS002980'||originalSha256!==HEIGHT_ORIGINAL_SHA||build!=='GRCh37'||row.rsID!=='coordinate:GRCh37:3:9975386'||row.coordinateSource!==true||row.chr_name!=='3'||row.chr_position!=='9975386'||row.effect_allele!=='G'||row.other_allele!=='C'||row.effect_weight!=='-0.031')throw Error('Outside exact reviewed height alias scope');
 const proof=await loadHeightAliasProof();if(proof.overlapSha256!==overlapSha256)throw Error('Outside exact reviewed height alias scope');return proof;
}
export async function reviewedHeightMapping({modelId,originalSha256,id,build,mapping}){
 const position=build==='GRCh37'?9975386:build==='GRCh38'?9933702:null,expected={chrom:'3',position,ref:'C',alleles:['C','G'],unsupportedReferenceAlleles:[]};
 if(modelId!=='PGS002980'||originalSha256!==HEIGHT_ORIGINAL_SHA||id!=='rs2270894'||position===null||JSON.stringify(mapping)!==JSON.stringify(expected))throw Error('Outside exact height mapping reconciliation scope');
 const proof=await loadHeightAliasProof(),source=proof.files.find(f=>f.name==='refsnp-2270894.json');
 return {mapping:{...expected,alleles:['C','G','T']},evidence:{type:'Exact NCBI primary allele inventory supplement',source,manifestSha256:HEIGHT_ALIAS_MANIFEST_SHA,ensemblMapping:expected,reason:'Ensembl retains C/G; frozen NCBI primary placements retain C/G/T on both builds. Preserve T and unresolved C/G palindromic orientation without changing original G/C weight -0.031.'}};
}
