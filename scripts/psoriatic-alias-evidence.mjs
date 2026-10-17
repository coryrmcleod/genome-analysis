// Evidence-only exact locus. Not an importer exception or model admission.
import {readFile,mkdir,copyFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex'),fixture=new URL('../test/fixtures/pgs/psoriatic-alias/',import.meta.url);
export const PSORIATIC_ALIAS_FILES=Object.freeze({
 'original.txt.gz':'1168587bc26a51c2f15a0eb83d3b1766c8fa56749ff4cffc12405ee61cb6497c',
 'overlap.json':'57306b1b39d14f6c4091f273fedd7472b41d9eb70f539bc0a1c56bdf96abaf95',
 'refsnp-2073004.json':'7febcd11cc6944001d8561ce05a80d8fc24b692437af4eb546e33c71ed10eb66',
 'refsnp-2113330529.json':'039f2accf139f8aac3a817c6506e0b79ea1f9cdd79c8c43dcbdfe11b0df4a000',
 'refsnp-2113330532.json':'a13d5ef87d70c08731f5bcc6a78a77b7fc9c2e05375cfc79ed3985dfaba62f17',
 'refsnp-2113330536.json':'1814232f037b2e6b6ee29aeae22fe8cfc7234b8771928fc994db1f3622f76126',
 'refsnp-2113330543.json':'cd2ac9a4c47bb5c72df100d337268d3c5509481e80d3f1569e7129de344f20d9'
});
const aliases=['2113330529','2113330532','2113330536','2113330543'];
export function verifyPsoriaticAliasData(data){
 const require=(ok,message)=>{if(!ok)throw Error('Psoriatic exact alias proof: '+message);};
 for(const id of aliases){const d=data['refsnp-'+id+'.json'];require(d?.refsnp_id===id&&!d.primary_snapshot_data&&!d.withdrawn_snapshot_data&&!d.unsupported_snapshot_data&&JSON.stringify(d.merged_snapshot_data?.merged_into)==='["2073004"]','explicit merge');}
 const d=data['refsnp-2073004.json'];require(d?.refsnp_id==='2073004'&&d.primary_snapshot_data&&!d.merged_snapshot_data&&!d.withdrawn_snapshot_data&&!d.unsupported_snapshot_data,'canonical identity');
 for(const [build,seq,pos] of [['GRCh37','NC_000006.11',2435177],['GRCh38','NC_000006.12',2434943]]){
  const p=d.primary_snapshot_data.placements_with_allele.filter(p=>p.placement_annot.seq_id_traits_by_assembly.some(a=>a.assembly_name.startsWith(build+'.')&&a.is_top_level&&a.is_chromosome&&!a.is_alt&&!a.is_patch));
  require(p.length===1&&p[0].seq_id===seq&&p[0].placement_annot.is_aln_opposite_orientation===false&&p[0].placement_annot.is_mismatch===false,'primary placement');
  const a=p[0].alleles.map(a=>a.allele.spdi);require(a.length===2&&a.every(a=>a.seq_id===seq&&a.position===pos&&a.deleted_sequence==='T')&&a.map(a=>a.inserted_sequence).sort().join('/')==='C/T','primary alleles');
 }
 const point=data['overlap.json'];require(Array.isArray(point),'overlap inventory');
 // Effect-only C also permits complementary G. Include all compatible names.
 const exact=point.filter(r=>r.source==='dbSNP'&&r.assembly_name==='GRCh38'&&r.seq_region_name==='6'&&r.start===2434944&&r.end===2434944&&r.strand===1&&Array.isArray(r.alleles)&&(r.alleles.includes('C')||r.alleles.includes('G')));
 require(exact.length===5&&new Set(exact.map(r=>r.id)).size===5&&exact.map(r=>r.id).sort().join(',')===['2073004',...aliases].map(id=>'rs'+id).sort().join(','),'complete compatible identity set');
 require(exact.every(r=>r.alleles.slice().sort().join('/')==='C/T'),'overlap alleles');
 return {modelId:'PGS019623',sourceId:'coordinate:GRCh38:6:2434944',canonicalId:'rs2073004',aliases:aliases.map(id=>'rs'+id),originalSha256:PSORIATIC_ALIAS_FILES['original.txt.gz'],overlapSha256:PSORIATIC_ALIAS_FILES['overlap.json'],files:PSORIATIC_ALIAS_FILES,scope:'Exact frozen identity proof only. Does not admit the1224-term model, resolve other loci or authorize strand/weight inference.'};
}
export async function loadPsoriaticAliasProof(load=name=>readFile(new URL(name,fixture))){
 const data={};for(const [name,sha] of Object.entries(PSORIATIC_ALIAS_FILES)){const bytes=await load(name);if(hash(bytes)!==sha)throw Error('Psoriatic evidence hash changed: '+name);data[name]=name.endsWith('.gz')?bytes:JSON.parse(bytes);}
 const lines=gunzipSync(data['original.txt.gz']).toString().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')),keys=lines.shift().split('\t'),rows=lines.map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[keys[i],v]))),found=rows.filter(r=>r.chr_name==='6'&&r.chr_position==='2434944');
 if(rows.length!==1224||found.length!==1||found[0].effect_allele!=='C'||found[0].other_allele||found[0].effect_weight!=='-0.0117245835538977')throw Error('Unreviewed original term');return verifyPsoriaticAliasData(data);
}
export async function freezePsoriaticAliasProof(){
 await mkdir(fixture,{recursive:true});for(const [name,sha] of Object.entries(PSORIATIC_ALIAS_FILES)){
  const source=name==='original.txt.gz'?new URL('../work/pgs-source/PGS019623.txt.gz',import.meta.url):name==='overlap.json'?new URL('../work/pgs-source/PGS019623-GRCh38-6-2434944-identity.json',import.meta.url):new URL('../work/psoriatic-identity-evidence/'+name,import.meta.url);
  if(hash(await readFile(source))!==sha)throw Error('Changed public cache');try{if(hash(await readFile(new URL(name,fixture)))!==sha)throw Error('Frozen evidence changed');}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,new URL(name,fixture),1);}
 }return loadPsoriaticAliasProof();
}
