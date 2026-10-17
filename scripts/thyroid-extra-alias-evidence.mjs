// Three additional explicitly reviewed loci, not an arbitrary alias resolver.
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const THYROID_EXTRA_LOCI=Object.freeze([
 {position:31112941,position37:31080718,effect:'C',weight:'0.0004779436555957',ref:'T',alleles:'CT',canonical:'4495304',aliases:['2113340297','2113340313','2113340318','2113340346','2113340359','2113340365','2113340369','2113340378','2113340385','2113340398']},
 {position:31113122,position37:31080899,effect:'G',weight:'0.0164797051565541',ref:'T',alleles:'ACGT',canonical:'2233965',aliases:['2113340570','2113340589','2113340596','2113340627','2113340635','2113340639','2113340653','2113340665','2113340675','2113340682']},
 {position:31272702,position37:31240479,effect:'G',weight:'0.002603580625266',ref:'T',alleles:'GT',canonical:'9357121',aliases:['2113396252','2113396258','2113396287','2113396297','2113396302']}
]);
export const THYROID_EXTRA_MANIFEST_SHA='ed5b8a003667fad774ff95e3ace64540706a531a7734da482876c45d65df4fe5';
const originalSha='3d9caddd9b3fd1cb9c4b676bff6345dfbbe99fb93d487faf3b880619357ae55f';
const root=new URL('../test/fixtures/pgs/thyroid-extra-alias/',import.meta.url);
export function verifyExtraThyroidAliasData(locus,data){
 const require=(ok,message)=>{if(!ok)throw Error('Additional thyroid alias proof: '+message);};
 require(THYROID_EXTRA_LOCI.some(l=>JSON.stringify(l)===JSON.stringify(locus)),'unreviewed locus');
 for(const id of locus.aliases){const r=data['refsnp-'+id+'.json'];require(r?.refsnp_id===id&&!r.primary_snapshot_data&&!r.withdrawn_snapshot_data&&!r.unsupported_snapshot_data&&JSON.stringify(r.merged_snapshot_data?.merged_into)===JSON.stringify([locus.canonical]),'merge chain');}
 const r=data['refsnp-'+locus.canonical+'.json'];require(r?.refsnp_id===locus.canonical&&r.primary_snapshot_data&&!r.merged_snapshot_data&&!r.withdrawn_snapshot_data&&!r.unsupported_snapshot_data,'canonical identity');
 for(const [build,seq,pos] of [['GRCh37','NC_000006.11',locus.position37-1],['GRCh38','NC_000006.12',locus.position-1]]){
  const placements=r.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  require(placements.length===1&&placements[0].seq_id===seq&&placements[0].placement_annot.is_aln_opposite_orientation===false&&placements[0].placement_annot.is_mismatch===false,'primary placement');
  const alleles=placements[0].alleles.map(a=>a.allele.spdi);require(alleles.length===locus.alleles.length&&alleles.every(a=>a.seq_id===seq&&a.position===pos&&a.deleted_sequence===locus.ref)&&alleles.map(a=>a.inserted_sequence).sort().join('')===locus.alleles,'primary alleles');
 }
 const point=data[`overlap-${locus.position}.json`],complement={A:'T',C:'G',G:'C',T:'A'};require(Array.isArray(point),'overlap inventory');
 const compatible=point.filter(r=>r.source==='dbSNP'&&r.assembly_name==='GRCh38'&&r.seq_region_name==='6'&&r.start===locus.position&&r.end===locus.position&&r.strand===1&&Array.isArray(r.alleles)&&(r.alleles.includes(locus.effect)||r.alleles.includes(complement[locus.effect])));
 const expected=[locus.canonical,...locus.aliases].map(id=>'rs'+id).sort();
 require(compatible.length===expected.length&&new Set(compatible.map(r=>r.id)).size===expected.length&&compatible.map(r=>r.id).sort().join(',')===expected.join(','),'complete compatible identity set');
 require(compatible.every(r=>r.alleles.length>=2&&new Set(r.alleles).size===r.alleles.length&&r.alleles.every(a=>a.length===1&&locus.alleles.includes(a))),'overlap alleles');
 return true;
}
export async function loadExtraThyroidAliasProof(position,load=name=>readFile(new URL(name,root))){
 const locus=THYROID_EXTRA_LOCI.find(l=>l.position===position);if(!locus)throw Error('Outside extra thyroid alias scope');
 const manifestBytes=await load('manifest.json');if(hash(manifestBytes)!==THYROID_EXTRA_MANIFEST_SHA)throw Error('Additional thyroid manifest changed');
 const manifest=JSON.parse(manifestBytes),data={};
 for(const file of manifest.files){const bytes=await load(file.name);if(hash(bytes)!==file.sha256)throw Error('Additional thyroid source hash changed: '+file.name);data[file.name]=JSON.parse(bytes);}
 const original=await readFile(new URL('../test/fixtures/pgs/thyroid-alias/original.txt.gz',import.meta.url));if(hash(original)!==originalSha)throw Error('Thyroid original changed');
 const lines=gunzipSync(original).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),header=lines.shift().split('\t'),rows=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[header[i],v]))),row=rows.filter(r=>r.chr_name==='6'&&r.chr_position===String(position));
 if(rows.length!==171||row.length!==1||row[0].effect_allele!==locus.effect||row[0].other_allele||row[0].effect_weight!==locus.weight)throw Error('Wrong additional thyroid source term');
 verifyExtraThyroidAliasData(locus,data);
 const ids=[locus.canonical,...locus.aliases],files=manifest.files.filter(f=>f.name===`overlap-${position}.json`||ids.some(id=>f.name===`refsnp-${id}.json`));
 return {modelId:'PGS018695',sourceId:`coordinate:GRCh38:6:${position}`,canonicalId:'rs'+locus.canonical,aliases:locus.aliases.map(x=>'rs'+x),originalSha256:originalSha,overlapSha256:files.find(f=>f.name.startsWith('overlap-')).sha256,fixtureDirectory:'thyroid-extra-alias',manifestSha256:THYROID_EXTRA_MANIFEST_SHA,files,scope:'Exact frozen source/locus only. Explicit NCBI merges and primary placements on both builds; multiallelic/effect-only orientation uncertainty remains. No model admission.'};
}
export async function reviewedThyroidMapping({modelId,originalSha256,id,build,mapping}){
 const position=build==='GRCh37'?31080899:build==='GRCh38'?31113122:null;
 const expected={chrom:'6',position,ref:'T',alleles:['T','G'],unsupportedReferenceAlleles:[]};
 if(modelId!=='PGS018695'||originalSha256!==originalSha||id!=='rs2233965'||position===null||JSON.stringify(mapping)!==JSON.stringify(expected))throw Error('Outside exact thyroid mapping reconciliation scope');
 const proof=await loadExtraThyroidAliasProof(31113122),source=proof.files.find(f=>f.name==='refsnp-2233965.json');
 return {mapping:{...expected,alleles:['T','A','C','G']},evidence:{type:'Exact NCBI primary allele inventory supplement',source,manifestSha256:THYROID_EXTRA_MANIFEST_SHA,ensemblMapping:expected,reason:'Ensembl retains T/G; frozen NCBI primary placements retain T/A/C/G on both builds. Preserve all documented SNP alleles and G/C effect-only orientation uncertainty, without changing the original G coefficient.'}};
}
