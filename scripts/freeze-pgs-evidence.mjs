// Preserve already-reviewed public evidence; never refresh or substitute a source.
import {readFile,copyFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadThyroidAliasProof} from './thyroid-alias-evidence.mjs';
import {THYROID_EXTRA_LOCI,loadExtraThyroidAliasProof} from './thyroid-extra-alias-evidence.mjs';
import {loadHeightAliasProof} from './height-alias-evidence.mjs';
import {verifyInstalledHDLAliases} from './hdl-alias-evidence.mjs';
import {importReviewedCervical,verifyInstalledCervical} from './import-reviewed-cervical.mjs';
export function modelEvidenceFiles(model){
 const files=[['metadata',model.id+'.json'],['GRCh37',model.id+'_GRCh37.txt.gz'],['GRCh38',model.id+'_GRCh38.txt.gz']].map(([kind,name])=>({kind,name,sha256:model.sourceFiles[kind].sha256}));
 if(model.additiveMethodEvidence?.sourceFile){const e=model.additiveMethodEvidence;if(!/^PGS\d{6}-methods\.(xml|pdf)$/.test(e.sourceFile)||!e.sourceFile.startsWith(model.id+'-'))throw Error('Invalid methods evidence filename');files.push({kind:'methods',name:e.sourceFile,sha256:e.sourceSha256});}
 const sources=new Map((model.sourceFiles.coordinateResolution||[]).map(s=>[s.url,s]));
 const coordinates=(model.variants||[]).filter(v=>v.sourceCoordinate);
 if(sources.size!==coordinates.length)throw Error('Coordinate proof inventory mismatch: '+model.id);
 for(const v of coordinates){
  const c=v.sourceCoordinate,host=c.build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
  const url=`https://${host}/overlap/region/human/${c.chrom}:${c.position}-${c.position}?feature=variation&content-type=application/json`;
  const source=sources.get(url);if(!source)throw Error('Coordinate proof source missing: '+v.id);
  files.push({kind:'coordinate',name:`${model.id}-${c.build}-${c.chrom}-${c.position}-identity.json`,sha256:source.sha256,variantId:v.id,sourceId:v.sourceId,build:c.build});
 }
 return files;
}
export async function freezePGSEvidence(library,cache,destination){
 const pending=[];
 for(const m of library.models){
  if(m.id==='PGS000660'||m.sourceFiles.reviewedIdentifierAliases!==undefined)await verifyInstalledHDLAliases(m);
  if(m.id==='PGS005165'){
   const selected=JSON.parse(await readFile(new URL('./cervical-selection.json',import.meta.url)))[0];
   const expected=await importReviewedCervical(selected);await verifyInstalledCervical(m,library.targets||expected.targets);
  }
  const aliases=m.sourceFiles.reviewedCoordinateAliases;
  if(aliases!==undefined){
   const proofs=(m.id==='PGS002980'?[await loadHeightAliasProof()]:[await loadThyroidAliasProof(),...await Promise.all(THYROID_EXTRA_LOCI.map(l=>loadExtraThyroidAliasProof(l.position)))]).sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
   if(JSON.stringify(aliases)!==JSON.stringify(proofs)||proofs.some(proof=>m.id!==proof.modelId||m.sourceFiles.original.sha256!==proof.originalSha256||m.variants.find(v=>v.sourceId===proof.sourceId)?.id!==proof.canonicalId))throw Error('Invalid reviewed coordinate alias proof: '+m.id);
  }
 }
 // Validate the entire input and any existing frozen files before copying.
 for(const m of library.models)for(const item of modelEvidenceFiles(m)){
  const source=new URL(item.name,cache),target=new URL(item.name,destination);
  const bytes=await readFile(source);
  if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Reviewed evidence hash mismatch: '+item.name);
  let exists=true;try{await access(target);}catch(e){if(e.code!=='ENOENT')throw e;exists=false;}
  if(exists){if(createHash('sha256').update(await readFile(target)).digest('hex')!==item.sha256)throw Error('Frozen evidence would be replaced: '+item.name);}
  else pending.push([source,target]);
 }
 await mkdir(destination,{recursive:true});
 for(const [source,target] of pending)await copyFile(source,target,1); // COPYFILE_EXCL
 return {verified:library.models.reduce((n,m)=>n+modelEvidenceFiles(m).length,0),copied:pending.length};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const root=new URL('../',import.meta.url),library=JSON.parse(await readFile(new URL('public/data/pgs-library.json',root)));
 console.log(await freezePGSEvidence(library,new URL('work/pgs-source/',root),new URL('test/fixtures/pgs/evidence/',root)));
}
