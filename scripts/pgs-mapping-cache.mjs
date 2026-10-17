// Independent responses may be duplicated in different request batches. Ignore
// ordering and non-mapping annotations, but never silently choose a placement.
function signature(raw,build){
 if(!raw||typeof raw!=='object'||typeof raw.name!=='string'||!Array.isArray(raw.mappings))throw Error('Malformed independent mapping response');
 if(raw.synonyms!==undefined&&(!Array.isArray(raw.synonyms)||raw.synonyms.some(s=>typeof s!=='string')))throw Error('Malformed independent mapping aliases');
 const mappings=raw.mappings.filter(m=>m.assembly_name===build&&/^(?:[1-9]|1\d|2[0-2])$/.test(m.seq_region_name)).map(m=>[m.seq_region_name,m.start,m.end,m.strand,m.allele_string]);
 mappings.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return JSON.stringify({name:raw.name,mappings});
}
export function mergePGSMappingEvidence(reference,incoming,build,requiredIds){
 if(!['GRCh37','GRCh38'].includes(build)||!incoming||typeof incoming!=='object'||Array.isArray(incoming)||!(requiredIds instanceof Set))throw Error('Invalid mapping cache input');
 const pending=[];
 for(const [id,raw] of Object.entries(incoming)){
  if(!requiredIds.has(id))continue;
  if(!/^rs\d+$/.test(id))throw Error('Invalid mapping identifier');
  const next=signature(raw,build),previous=reference[id];
  if(previous&&signature(previous,build)!==next)throw Error(`Conflicting independent mapping responses: ${id} ${build}`);
  // An alias must be attested by every retained duplicate response, not just
  // whichever cache file happened to be read last.
  const merged=previous?{...previous,synonyms:(previous.synonyms||[]).filter(s=>(raw.synonyms||[]).includes(s))}:raw;
  pending.push([id,merged]);
 }
 for(const [id,raw] of pending)reference[id]=raw;
 return reference;
}
