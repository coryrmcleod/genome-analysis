// One immutable, complete model. This is not a general permission to import indels.
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadCervicalResearchDefinition} from './cervical-research-score.mjs';
import {CERVICAL_DELETION_FILES,loadCervicalDeletionProof} from './cervical-deletion-proof.mjs';
import {validatePGSLibrary} from '../public/pgs.js';
const root=new URL('../',import.meta.url),fixture=new URL('test/fixtures/pgs/',root),hash=b=>createHash('sha256').update(b).digest('hex');
const reviewed=JSON.parse(await readFile(new URL('./cervical-selection.json',import.meta.url)))[0];
async function preserve(source,target,expected){
 const bytes=await readFile(source);if(hash(bytes)!==expected)throw Error('Cervical evidence hash mismatch');
 try{if(hash(await readFile(target))!==expected)throw Error('Refusing to replace changed cervical cache evidence');}
 catch(e){if(e.code!=='ENOENT')throw e;await copyFile(source,target,1);}
}
export async function importReviewedCervical(selected,{cache=null,version='reviewed-cervical'}={}){
 if(JSON.stringify(selected)!==JSON.stringify(reviewed))throw Error('Cervical selection requires exact reviewed model and caveats');
 const d=await loadCervicalResearchDefinition(),meta=JSON.parse(await readFile(new URL('cervical-deletion/metadata.json',fixture))),sourceFiles={},referenceSources={};
 for(const [kind,name,filename,url] of [['metadata','metadata.json','PGS005165.json','https://www.pgscatalog.org/rest/score/PGS005165'],['original','original.txt.gz','PGS005165.txt.gz',meta.ftp_scoring_file],...['GRCh37','GRCh38'].map(b=>[b,b+'.txt.gz','PGS005165_'+b+'.txt.gz',meta.ftp_harmonized_scoring_files[b].positions])]){
  sourceFiles[kind]={url,sha256:CERVICAL_DELETION_FILES[name]};
  if(cache){await mkdir(cache,{recursive:true});await preserve(new URL('cervical-deletion/'+name,fixture),new URL(filename,cache),sourceFiles[kind].sha256);}
 }
 for(const build of ['GRCh37','GRCh38']){
  const source=new URL('cervical-snv/'+build+'-variation.json',fixture),sha256=hash(await readFile(source));
  referenceSources[build]=[{url:'https://'+(build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org')+'/variation/human',sha256}];
  if(cache)await preserve(source,new URL('pgs-ensembl-'+build+'-'+sha256.slice(0,12)+'.json',cache),sha256);
 }
 const model={id:meta.id,name:meta.name,trait:meta.trait_reported,family:reviewed.family,coverageContext:reviewed.coverageContext,variantCount:15,weightType:meta.weight_type,sourceWeightType:meta.weight_type,effectType:'additive',method:meta.method_name,methodParameters:meta.method_params,publication:meta.publication,ancestry:meta.ancestry_distribution,studySamples:{variantAssociation:meta.samples_variants,training:meta.samples_training},license:meta.license,catalogURL:'https://www.pgscatalog.org/score/PGS005165/',matchesPublication:true,sourceFiles,variants:d.model.variants,reviewedDeletionEvidence:await loadCervicalDeletionProof()};
 const common={gene:'Published component',label:'Published PGS component',trait:meta.trait_reported,category:'Cancer',priority:1,evidence:'Complete frozen score and independently verified both-build mappings',frequency:null,summary:'Interpreted only as part of the complete 15-term published score.',caution:reviewed.coverageContext,sources:[{label:'PGS Catalog PGS005165',url:model.catalogURL}]};
 const targets=[...d.targets.map(t=>({...t,...common})),{...common,...d.deletionTarget}];
 return validatePGSLibrary({version,retrievedAt:new Date().toISOString(),source:'PGS Catalog',selection:'Complete additive model with an exact, independently certified deletion; not generic indel support.',models:[model],targets,referenceSources});
}
export async function verifyInstalledCervical(model,targets){
 const expected=await importReviewedCervical(reviewed);
 if(JSON.stringify(model)!==JSON.stringify(expected.models[0]))throw Error('Cervical complete model differs from frozen reviewed definition');
 for(const t of expected.targets){const actual=targets.find(x=>x.id===t.id);if(!actual||JSON.stringify(actual.mappings)!==JSON.stringify(t.mappings))throw Error('Cervical target differs from independent both-build proof');if(t.variantKind&&JSON.stringify(actual.reviewedDeletion)!==JSON.stringify(t.reviewedDeletion))throw Error('Cervical deletion certificate changed');}
 return true;
}
