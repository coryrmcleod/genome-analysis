import {validateScoreReference,referenceDefinition} from '../public/pgs-reference.js';
import {validateSensitivityReference} from '../public/pgs-sensitivity.js';
// Exact references cover every model. Sensitivity references cover every model
// without an exact distribution, and may additionally describe exact models.
export function validateExpansionReferences(reference,sensitivity,library){
 validateScoreReference(reference);validateSensitivityReference(sensitivity);
 const ids=library.models.map(m=>m.id),models=new Map(library.models.map(m=>[m.id,m]));
 if(JSON.stringify(reference.models.map(m=>m.id))!==JSON.stringify(ids))throw Error('Reference model inventory mismatch');
 for(const ref of [reference,sensitivity]){
  if(ref.population!=='EUR'||ref.sampleCount!==503)throw Error('Unreviewed staged reference panel');
  for(const r of ref.models){
   const m=models.get(r.id);if(!m)throw Error('Unknown reference model');
   if(r.status==='Available'){
    if(m.variants.some(v=>v.kind==='reviewed-deletion'))throw Error('Certified deletion population references require a separate reviewed cohort verification');
    if(r.sampleCount!==ref.sampleCount)throw Error('Reference sample count mismatch: '+r.id);
    for(const b of ['GRCh37','GRCh38'])if(r.definitions[b]!==referenceDefinition(m,b,library.targets))throw Error('Reference definition mismatch: '+r.id);
   }
  }
 }
 if(reference.archiveSha256!==sensitivity.archiveSha256||!/^[a-f0-9]{64}$/.test(reference.archiveSha256||''))throw Error('Reference archive mismatch');
 for(const r of reference.models)if(r.status!=='Available'&&!sensitivity.models.some(s=>s.id===r.id))throw Error('Missing sensitivity status: '+r.id);
 return {reference,sensitivity};
}
