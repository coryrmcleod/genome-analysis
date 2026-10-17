export function validateCandidateScreenIds(ids,installedLibrary){
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>!/^PGS\d{6}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Supply unique explicit candidate score IDs');
 const installed=new Set(installedLibrary.models.map(m=>m.id));
 for(const id of ids)if(installed.has(id))throw Error('Candidate screening cannot refresh installed source evidence: '+id);
 return ids;
}
