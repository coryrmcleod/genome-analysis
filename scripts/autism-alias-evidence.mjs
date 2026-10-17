// Exact-locus identity proof, not a generic alias resolver or admission exception.
import {readFile,mkdir,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const AUTISM_ALIAS_FILES=Object.freeze({
 'original.txt.gz':'a342369195d6077e107c7d2b0673277489034b1d489250d36c155902dd43e112',
 'overlap.json':'54fa2a95bac590117d7bd929e96db015ad91aae1ee3d8df90e30190f6c3eabc9',
 'refsnp-2139454386.json':'839ca58cfeaf9ce41f05a537b64e7354a3c4dd642bc67a42e302cddffb29560c',
 'refsnp-73358778.json':'7f1b1a502c401f08895427642b80cce49190e3a85584bf901d6ac4cef28d6888',
 'refsnp-2139454379.json':'69e40ad095f2339306cd0953131980da887a36cc96dc131a1716db4fb549ef49',
 'refsnp-2139454381.json':'a8a18bb36d7166554179eacd2f13423742fe63fdb9af99e60b95d0336596d9dc'
});
const fixture=new URL('../test/fixtures/pgs/autism-alias/',import.meta.url);
const aliases=['2139454386','2139454379','2139454381'],canonical='73358778';
export function verifyAutismAliasData(data){
 const require=(ok,message)=>{if(!ok)throw Error('Autism alias proof: '+message);};
 for(const id of aliases){const r=data['refsnp-'+id+'.json'];require(r?.refsnp_id===id&&!r.primary_snapshot_data&&!r.withdrawn_snapshot_data&&!r.unsupported_snapshot_data&&JSON.stringify(r.merged_snapshot_data?.merged_into)===JSON.stringify([canonical]),'merge chain');}
 const primary=data['refsnp-'+canonical+'.json'];require(primary?.refsnp_id===canonical&&primary.primary_snapshot_data&&!primary.merged_snapshot_data&&!primary.withdrawn_snapshot_data,'canonical identity');
 for(const [build,seq,pos] of [['GRCh37','NC_000014.8',101159974],['GRCh38','NC_000014.9',100693637]]){
  const p=primary.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  require(p.length===1&&p[0].seq_id===seq&&p[0].placement_annot.is_aln_opposite_orientation===false&&p[0].placement_annot.is_mismatch===false,'primary placement');
  const a=p[0].alleles.map(a=>a.allele.spdi);require(a.length===2&&a.every(a=>a.seq_id===seq&&a.position===pos&&a.deleted_sequence==='C')&&a.map(a=>a.inserted_sequence).sort().join('/')==='C/T','primary alleles');
 }
 const point=data['overlap.json'];require(Array.isArray(point),'overlap inventory');
 const exact=point.filter(r=>r.source==='dbSNP'&&r.assembly_name==='GRCh37'&&r.seq_region_name==='14'&&r.start===101159975&&r.end===101159975&&r.strand===1&&Array.isArray(r.alleles)&&(r.alleles.includes('C')&&r.alleles.includes('T')||r.alleles.includes('A')&&r.alleles.includes('G')));
 require(exact.length===4&&new Set(exact.map(r=>r.id)).size===4&&exact.map(r=>r.id).sort().join(',')===[canonical,...aliases].map(x=>'rs'+x).sort().join(','),'complete compatible identity set');
 require(exact.every(r=>r.alleles.slice().sort().join('/')==='C/T'),'overlap alleles disagree with primary placement');
 return {canonicalId:'rs'+canonical,aliases:aliases.map(x=>'rs'+x),scope:'Exact frozen autism locus only; separate harmonization and missing-coordinate blockers remain. No score admission.'};
}
export async function loadAutismAliasProof(load=name=>readFile(new URL(name,fixture))){
 const data={};for(const [name,sha] of Object.entries(AUTISM_ALIAS_FILES)){const bytes=await load(name);if(hash(bytes)!==sha)throw Error('Autism alias source hash changed: '+name);data[name]=name.endsWith('.gz')?bytes:JSON.parse(bytes);}
 const lines=gunzipSync(data['original.txt.gz']).toString().split(/\r?\n/).filter(x=>x&&!x.startsWith('#')),header=lines.shift().split('\t');
 const rows=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[header[i],v]))),r=rows.filter(r=>r.chr_name==='14'&&r.chr_position==='101159975');
 if(rows.length!==35087||r.length!==1||r[0].effect_allele!=='T'||r[0].other_allele!=='C'||r[0].effect_weight!=='-0.037297')throw Error('Wrong autism source term');
 return verifyAutismAliasData(data);
}
export async function freezeAutismAliasProof(){
 await mkdir(fixture,{recursive:true});
 for(const [name,expected] of Object.entries(AUTISM_ALIAS_FILES)){
  const source=name==='original.txt.gz'?new URL('../work/pgs-source/PGS000327.txt.gz',import.meta.url):name==='overlap.json'?new URL('../work/pgs-source/PGS000327-GRCh37-14-101159975-identity.json',import.meta.url):new URL('../work/autism-refsnp-aliases/'+name,import.meta.url);
  if(hash(await readFile(source))!==expected)throw Error('Autism cache changed');
  try{if(hash(await readFile(new URL(name,fixture)))!==expected)throw Error('Frozen autism evidence changed');}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,new URL(name,fixture),1);}
 }
 return loadAutismAliasProof();
}
