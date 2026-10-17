// Exact-source/locus exception only. Independent NCBI merges do not resolve strand.
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {THYROID_EXTRA_LOCI,loadExtraThyroidAliasProof} from './thyroid-extra-alias-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const THYROID_ALIAS_FILES=Object.freeze({
 'original.txt.gz':'3d9caddd9b3fd1cb9c4b676bff6345dfbbe99fb93d487faf3b880619357ae55f',
 'overlap.json':'d5eeda8163fe171524ee74b53d25b1b9b694f8dfcabf90e6d22ea18364a5bf17',
 'refsnp-3734854.json':'2931de5698ffcd4fd2c13f41e2b1da5190c2ba7e21a0635889dd02b50cad4778',
 'refsnp-2113381368.json':'4fddb20d28ea6f9d47cdf7dde92171f080174773f9c4011a0b1bd5b4388ad2c4',
 'refsnp-2113381375.json':'e2a462a48e64de31fd3d84fe32f70fbd99ed45f62c4e96f9e76c4213277b36fe',
 'refsnp-2113381392.json':'913f738b1010539d4230e3c9beb3910503e0d41741de65dd117f58b5d6c67bf2',
 'refsnp-2113381394.json':'99b90f3f41bf16933206d2cfcd95247d4dcffff57c66f4caaa6ab7ab88495f8a',
 'refsnp-2113381404.json':'c45ef2138a770c46c3bf32896b7a472a659caa49a8f6c6d04cd81fc763759f19',
 'refsnp-2113381410.json':'a6d72c938438d8ca3636a79540815e02b275c2337396370fff80d26af4ed1633'
});
const fixture=new URL('../test/fixtures/pgs/thyroid-alias/',import.meta.url);
const aliases=['2113381368','2113381375','2113381392','2113381394','2113381404','2113381410'],canonical='3734854';
export function verifyThyroidAliasData(data){
 const require=(ok,message)=>{if(!ok)throw Error('Thyroid alias proof: '+message);};
 for(const id of aliases){const r=data['refsnp-'+id+'.json'];require(r?.refsnp_id===id&&!r.primary_snapshot_data&&!r.withdrawn_snapshot_data&&!r.unsupported_snapshot_data&&JSON.stringify(r.merged_snapshot_data?.merged_into)===JSON.stringify([canonical]),'merge chain');}
 const primary=data['refsnp-'+canonical+'.json'];require(primary?.refsnp_id===canonical&&primary.primary_snapshot_data&&!primary.merged_snapshot_data&&!primary.withdrawn_snapshot_data&&!primary.unsupported_snapshot_data,'canonical identity');
 for(const [build,seq,pos] of [['GRCh37','NC_000006.11',31078835],['GRCh38','NC_000006.12',31111058]]){
  const p=primary.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  require(p.length===1&&p[0].seq_id===seq&&p[0].placement_annot.is_aln_opposite_orientation===false&&p[0].placement_annot.is_mismatch===false,'primary placement');
  const a=p[0].alleles.map(a=>a.allele.spdi);require(a.length===2&&a.every(a=>a.seq_id===seq&&a.position===pos&&a.deleted_sequence==='G')&&a.map(a=>a.inserted_sequence).sort().join('/')==='A/G','primary alleles');
 }
 const point=data['overlap.json'];require(Array.isArray(point),'overlap inventory');
 // Effect-only A can match A directly or T on the opposite strand. Count both.
 const exact=point.filter(r=>r.source==='dbSNP'&&r.assembly_name==='GRCh38'&&r.seq_region_name==='6'&&r.start===31111059&&r.end===31111059&&r.strand===1&&Array.isArray(r.alleles)&&(r.alleles.includes('A')||r.alleles.includes('T')));
 require(exact.length===7&&new Set(exact.map(r=>r.id)).size===7&&exact.map(r=>r.id).sort().join(',')===[canonical,...aliases].map(x=>'rs'+x).sort().join(','),'complete compatible identity set');
 require(exact.every(r=>r.alleles.slice().sort().join('/')==='A/G'),'overlap alleles');
 return {modelId:'PGS018695',sourceId:'coordinate:GRCh38:6:31111059',canonicalId:'rs'+canonical,aliases:aliases.map(x=>'rs'+x),originalSha256:THYROID_ALIAS_FILES['original.txt.gz'],overlapSha256:THYROID_ALIAS_FILES['overlap.json'],files:Object.entries(THYROID_ALIAS_FILES).map(([name,sha256])=>({name,sha256,...name.startsWith('refsnp-')?{url:'https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/'+name.slice(7,-5)}:{}})),scope:'Exact frozen source/locus only. Explicit NCBI merges and primary placements on both builds; no inferred strand or model admission.'};
}
export async function loadThyroidAliasProof(load=name=>readFile(new URL(name,fixture))){
 const data={};for(const [name,sha] of Object.entries(THYROID_ALIAS_FILES)){const bytes=await load(name);if(hash(bytes)!==sha)throw Error('Thyroid alias source hash changed: '+name);data[name]=name.endsWith('.gz')?bytes:JSON.parse(bytes);}
 const lines=gunzipSync(data['original.txt.gz']).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),header=lines.shift().split('\t');
 const rows=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[header[i],v]))),r=rows.filter(r=>r.chr_name==='6'&&r.chr_position==='31111059');
 if(rows.length!==171||r.length!==1||r[0].effect_allele!=='A'||r[0].other_allele||r[0].effect_weight!=='0.0014297611489797')throw Error('Wrong thyroid source term');
 return verifyThyroidAliasData(data);
}
export async function reviewedThyroidIdentity({modelId,originalSha256,row,build,overlapSha256}){
 const extra=THYROID_EXTRA_LOCI.find(l=>row.rsID===`coordinate:GRCh38:6:${l.position}`);
 if(extra){
  if(modelId!=='PGS018695'||originalSha256!==THYROID_ALIAS_FILES['original.txt.gz']||build!=='GRCh38'||row.coordinateSource!==true||row.chr_name!=='6'||row.chr_position!==String(extra.position)||row.effect_allele!==extra.effect||row.other_allele||row.effect_weight!==extra.weight)throw Error('Outside exact reviewed thyroid alias scope');
  const proof=await loadExtraThyroidAliasProof(extra.position);if(proof.overlapSha256!==overlapSha256)throw Error('Outside exact reviewed thyroid alias scope');return proof;
 }
 if(modelId!=='PGS018695'||originalSha256!==THYROID_ALIAS_FILES['original.txt.gz']||overlapSha256!==THYROID_ALIAS_FILES['overlap.json']||build!=='GRCh38'||row.rsID!=='coordinate:GRCh38:6:31111059'||row.coordinateSource!==true||row.chr_name!=='6'||row.chr_position!=='31111059'||row.effect_allele!=='A'||row.other_allele||row.effect_weight!=='0.0014297611489797')throw Error('Outside exact reviewed thyroid alias scope');
 return loadThyroidAliasProof();
}
export async function freezeThyroidAliasProof(){
 await mkdir(fixture,{recursive:true});
 for(const [name,expected] of Object.entries(THYROID_ALIAS_FILES)){
  const source=name==='original.txt.gz'?new URL('../work/pgs-source/PGS018695.txt.gz',import.meta.url):name==='overlap.json'?new URL('../work/pgs-source/PGS018695-GRCh38-6-31111059-identity.json',import.meta.url):new URL('../work/thyroid-refsnp-aliases/'+name,import.meta.url);
  if(hash(await readFile(source))!==expected)throw Error('Thyroid cache changed');
  try{if(hash(await readFile(new URL(name,fixture)))!==expected)throw Error('Frozen thyroid evidence changed');}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,new URL(name,fixture),1);}
 }
 return loadThyroidAliasProof();
}
