import {verifyReviewedLinearMethod} from '../scripts/reviewed-linear-methods.mjs';
import {verifyInsulinResistanceMethod,verifyInsulinResistanceRows} from '../scripts/insulin-resistance-method.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {modelEvidenceFiles,freezePGSEvidence} from '../scripts/freeze-pgs-evidence.mjs';
import {parseScoringFile,preflightHarmonizedRows,coordinateVariantIdentity} from '../scripts/import-pgs-library.mjs';
import {verifySiccaAdditiveMethod,verifyJIAAdditiveMethod,verifyHodgkinAdditiveMethod,verifyWeightTypeAgreement} from '../scripts/pgs-weight-evidence.mjs';
import {verifyNarcolepsyFixedMethod} from '../scripts/narcolepsy-fixed-terms.mjs';
import {reviewedThyroidIdentity} from '../scripts/thyroid-alias-evidence.mjs';
import {reviewedHeightIdentity} from '../scripts/height-alias-evidence.mjs';
import {verifyMyelomaAdditiveMethod} from '../scripts/pgs-weight-evidence.mjs';
import {verifyInstalledCervical} from '../scripts/import-reviewed-cervical.mjs';
import {verifyInstalledHDLAliases} from '../scripts/hdl-alias-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('every installed model has immutable offline metadata and both harmonized source files',async()=>{
 const library=JSON.parse(await readFile(new URL('../public/data/pgs-library.json',import.meta.url))),targets=new Map(library.targets.map(t=>[t.id,t]));
 for(const m of library.models){
  if(m.id==='PGS000660'||m.sourceFiles.reviewedIdentifierAliases!==undefined)assert.equal(await verifyInstalledHDLAliases(m),true);
  if(m.id==='PGS005165'){
   assert.equal(await verifyInstalledCervical(m,library.targets),true);
   for(const file of modelEvidenceFiles(m))assert.equal(hash(await readFile(new URL('./fixtures/pgs/evidence/'+file.name,import.meta.url))),file.sha256,file.name);
   assert.equal(hash(await readFile(new URL('./fixtures/pgs/'+m.id+'.txt.gz',import.meta.url))),m.sourceFiles.original.sha256);
   continue; // Exact frozen full15-term verifier above includes metadata and both builds.
  }
  const options={allowEffectOnly:m.variants.some(v=>v.alleleMode==='effect-only'),allowCoordinateIds:m.coordinateSource===true,reviewedNarcolepsyFixedTerms:m.id==='PGS000757'};
  const original=parseScoringFile(gunzipSync(await readFile(new URL('./fixtures/pgs/'+m.id+'.txt.gz',import.meta.url))).toString(),options);
  assert.equal(verifyWeightTypeAgreement(m.sourceWeightType,original.metadata.weight_type),true);
  if(m.id==='PGS000877')assert.equal(verifyInsulinResistanceRows(original.metadata,original.rows),true);
  for(const file of modelEvidenceFiles(m)){
   const bytes=await readFile(new URL('./fixtures/pgs/evidence/'+file.name,import.meta.url));
   assert.equal(hash(bytes),file.sha256,file.name);
   if(file.kind==='metadata'){
    const meta=JSON.parse(bytes);assert.equal(meta.id,m.id);assert.equal(meta.variants_number,m.variantCount);
    assert.deepEqual(meta.publication,m.publication);assert.deepEqual(meta.ancestry_distribution,m.ancestry);
   }else if(file.kind==='methods'){
    assert.equal(m.additiveMethodEvidence.originalSha256,m.sourceFiles.original.sha256);
    const metadata=JSON.parse(await readFile(new URL('./fixtures/pgs/evidence/'+m.id+'.json',import.meta.url)));
    const methodReviews={PGS000043:[verifyReviewedLinearMethod,/^%PDF-/],PGS000137:[verifyReviewedLinearMethod,/^%PDF-/],PGS000040:[verifyReviewedLinearMethod,/SparSNP/],PGS000877:[verifyInsulinResistanceMethod,/^%PDF-/],PGS000653:[verifyMyelomaAdditiveMethod,/PRS Structure/],PGS000638:[verifyHodgkinAdditiveMethod,/PRS Structure/],PGS001308:[verifySiccaAdditiveMethod,/Construction of sparse PRS models/],PGS000114:[verifyJIAAdditiveMethod,/Development and validation of the genomic risk score/],PGS000757:[verifyNarcolepsyFixedMethod,/^%PDF-/]};
    assert.ok(methodReviews[m.id],'Every methods exception needs independent frozen verification');const [verify,heading]=methodReviews[m.id];assert.match(bytes.toString(),heading);
    assert.deepEqual(verify(metadata,m.sourceFiles.original.sha256,hash(bytes)),m.additiveMethodEvidence);assert.equal(m.weightType,['PGS000757','PGS000877'].includes(m.id)?'Unweighted':'NR');
   }else if(file.kind==='coordinate'){
    const row=original.rows.find(r=>r.rsID===file.sourceId);assert.ok(row);
    const alias=m.sourceFiles.reviewedCoordinateAliases?.find(p=>p.sourceId===file.sourceId);
    if(alias){
     const verify=m.id==='PGS002980'?reviewedHeightIdentity:reviewedThyroidIdentity,proof=await verify({modelId:m.id,originalSha256:m.sourceFiles.original.sha256,row,build:file.build,overlapSha256:hash(bytes)});
     assert.deepEqual(alias,proof);assert.equal(proof.canonicalId,file.variantId);
    }else assert.equal(coordinateVariantIdentity(row,file.build,JSON.parse(bytes)),file.variantId);
   }else{
    const parsed=parseScoringFile(gunzipSync(bytes).toString(),options),rows=preflightHarmonizedRows(original,parsed,file.kind);
    assert.equal(verifyWeightTypeAgreement(m.sourceWeightType,parsed.metadata.weight_type),true);
    for(const v of m.variants){const h=rows.get(v.sourceId),mapping=targets.get(v.id).mappings[file.kind];assert.equal(h.hm_chr,mapping.chrom);assert.equal(Number(h.hm_pos),mapping.position);if(h.hm_rsID)assert.equal(h.hm_rsID,v.id);}
   }
  }
 }
});
test('freezing rejects changed cache or frozen bytes and never replaces evidence',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ga-public-evidence-test-')),root=pathToFileURL(directory+path.sep);
 try{
  const model={id:'PGS999999',sourceFiles:Object.fromEntries(['metadata','GRCh37','GRCh38'].map(k=>[k,{sha256:hash(k)}]))};
  for(const f of modelEvidenceFiles(model))await writeFile(new URL(f.name,root),f.kind);
  const dest=new URL('frozen/',root),library={models:[model]};
  assert.deepEqual(await freezePGSEvidence(library,root,dest),{verified:3,copied:3});
  assert.equal((await freezePGSEvidence(library,root,dest)).copied,0);
  await writeFile(new URL('PGS999999.json',root),'changed');
  await assert.rejects(()=>freezePGSEvidence(library,root,dest),/hash mismatch/);
  assert.equal((await readFile(new URL('PGS999999.json',dest))).toString(),'metadata');
  await writeFile(new URL('PGS999999.json',root),'metadata');
  await writeFile(new URL('PGS999999.json',dest),'do not overwrite');
  await assert.rejects(()=>freezePGSEvidence(library,root,dest),/would be replaced/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
