import {REVIEWED_LINEAR_METHODS,verifyReviewedLinearMethod} from './reviewed-linear-methods.mjs';
import {INSULIN_RESISTANCE_METHOD,verifyInsulinResistanceMethod,verifyInsulinResistanceRows} from './insulin-resistance-method.mjs';
import {effectAlleleCandidates} from '../public/effect-only-pgs.js';
import {parsePGSDecimal,validatePGSNumericEnvelope} from '../public/pgs-numeric.js';
import {verifyLogOddsWeights,verifyWeightTypeAgreement,ASD_ADDITIVE_METHOD,verifyASDAdditiveMethod,SICCA_ADDITIVE_METHOD,verifySiccaAdditiveMethod} from './pgs-weight-evidence.mjs';
import {harmonizeModelAlleles} from '../public/allele-harmonization.js';
import {mkdir,writeFile,rename,readFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validatePGSLibrary} from '../public/pgs.js';
import {verifyAssemblyReversal} from './verify-assembly-reversal.mjs';
import {retryPGSSource} from './pgs-source-request.mjs';
import {verifySourceDefinition} from './pgs-source-definition-exclusions.mjs';
import {JIA_ADDITIVE_METHOD,verifyJIAAdditiveMethod} from './pgs-weight-evidence.mjs';
import {HODGKIN_ADDITIVE_METHOD,verifyHodgkinAdditiveMethod} from './pgs-weight-evidence.mjs';
import {MYELOMA_ADDITIVE_METHOD,verifyMyelomaAdditiveMethod} from './pgs-weight-evidence.mjs';
import {NARCOLEPSY_FIXED_METHOD,verifyNarcolepsyFixedMethod,verifyNarcolepsyFixedRows} from './narcolepsy-fixed-terms.mjs';
import {mergePGSMappingEvidence} from './pgs-mapping-cache.mjs';
import {reviewedThyroidIdentity} from './thyroid-alias-evidence.mjs';
import {reviewedThyroidMapping} from './thyroid-extra-alias-evidence.mjs';
import {reviewedHeightIdentity,reviewedHeightMapping} from './height-alias-evidence.mjs';
import {isReviewedHDLAlias,reviewedHDLIdentity} from './hdl-alias-evidence.mjs';
import {importReviewedCervical} from './import-reviewed-cervical.mjs';
import {mergePGSLibraries} from './merge-pgs-libraries.mjs';

// Deliberate, reproducible starter selection, not a ranking of predictive accuracy.
export const SELECTED_SCORES = JSON.parse(await readFile(new URL('./pgs-selection.json',import.meta.url)));
export function parseScoringFile(text,{allowEffectOnly=false,allowCoordinateIds=false,reviewedNarcolepsyFixedTerms=false}={}) {
  const metadata={},lines=[];
  for(const line of text.split(/\r?\n/).filter(line=>line.length)) {
    if(line.startsWith('#')) {const m=line.match(/^#([^#=]+)=(.*)$/);if(m)metadata[m[1]]=m[2];}
    else lines.push(line);
  }
  // PGS sources also use UCSC assembly names; retain the reported label while
  // resolving coordinates through the same independently checked human builds.
  const sourceBuild=metadata.genome_build,canonicalBuild=sourceBuild==='hg19'?'GRCh37':sourceBuild==='hg38'?'GRCh38':null;
  if(canonicalBuild){metadata.reported_genome_build=sourceBuild;metadata.genome_build=canonicalBuild;}
  const columns=lines.shift()?.split('\t');
  if(!columns?.includes('effect_weight') || !columns.includes('effect_allele') || !allowEffectOnly&&!columns.includes('other_allele')) throw Error('Explicit effect, other allele, and weight columns are required.');
  if(new Set(columns).size!==columns.length||columns.some(c=>!c))throw Error('Duplicate or empty scoring columns');
  const rows=lines.map(line=>{const fields=line.split('\t');if(fields.length!==columns.length)throw Error('Malformed PGS row');return Object.fromEntries(columns.map((k,i)=>[k,fields[i]]));});
  if(rows.length!==Number(metadata.variants_number))throw Error('PGS row count differs from declared model size.');
  if(reviewedNarcolepsyFixedTerms)verifyNarcolepsyFixedRows(metadata,rows);
  const ids=new Set();
  for(const r of rows){
    r.coordinateSource=false;
    if(!r.rsID&&allowCoordinateIds&&['GRCh37','GRCh38'].includes(metadata.genome_build)&&/^(?:[1-9]|1\d|2[0-2])$/.test(r.chr_name)&&/^[1-9]\d*$/.test(r.chr_position)){
      r.coordinateSource=true;r.rsID=`coordinate:${metadata.genome_build}:${r.chr_name}:${r.chr_position}`;
    }
    if(!(/^rs\d+$/.test(r.rsID)||r.coordinateSource)||ids.has(r.rsID))throw Error('Non-rsID or duplicate score term');ids.add(r.rsID);
    if(!/^[ACGT]$/.test(r.effect_allele)||(!allowEffectOnly||r.other_allele)&&!/^[ACGT]$/.test(r.other_allele)||r.effect_allele===r.other_allele)throw Error('Only explicit single-base additive score terms are supported.');
    parsePGSDecimal(r.effect_weight);
    for(const key of ['is_interaction','is_dominant','is_recessive','is_haplotype','is_diplotype'])if(r[key]&&!/^(false|0)$/i.test(r[key]))throw Error(`Unsupported ${key} term`);
    if(r.effect_type&&!/^additive$/i.test(r.effect_type))throw Error('Unsupported nonadditive effect type');
    for(const key of ['dosage_0_weight','dosage_1_weight','dosage_2_weight'])if(r[key])throw Error('Unsupported dosage-specific weighting');
    // PGS000086's reviewed UKB identifiers annotate coordinates, not scoring conditions.
    // Keep source alleles authoritative; matching a complementary label does not resolve strand.
    if(r.variant_description){const label=r.variant_description.match(/^Variant info \(UK Biobank\) = (\d+):(\d+)-([ACGT])$/),complement={A:'T',T:'A',C:'G',G:'C'};
      const discoveryLabel=metadata.pgs_id==='PGS000297'&&['lead SNPs','secondary'].includes(r.variant_description)||metadata.pgs_id==='PGS000300'&&['GWAS lead SNPs','exome lead SNPs','GWAS secondary','exome secondary'].includes(r.variant_description);
      const asdAlias=r.variant_description.match(/^variant_id = (?:(rs\d+)m{1,2}|chr(\d+):(\d+)m{0,2})$/);
      const reviewedASDAlias=metadata.pgs_id==='PGS000327'&&asdAlias&&(asdAlias[1]?asdAlias[1]===r.rsID:asdAlias[2]===r.chr_name&&asdAlias[3]===r.chr_position);
      if(!reviewedNarcolepsyFixedTerms&&!reviewedASDAlias&&!discoveryLabel&&(!['PGS000086','PGS000079','PGS000071'].includes(metadata.pgs_id)||!label||label[1]!==r.chr_name||label[2]!==r.chr_position||![r.effect_allele,complement[r.effect_allele]].includes(label[3])))throw Error('Unreviewed term condition: variant_description');}
    for(const key of ['inclusion_criteria','imputation_method'])if(r[key])throw Error(`Unreviewed term condition: ${key}`);
    if(r.hm_match_chr==='False'||r.hm_match_pos==='False')throw Error('Harmonization conflict');
  }
  validatePGSNumericEnvelope(rows.map(row=>({weight:parsePGSDecimal(row.effect_weight)})));
  return {metadata,rows};
}
const root=new URL('../',import.meta.url),cache=new URL('work/pgs-source/',root);
const sha=b=>createHash('sha256').update(b).digest('hex');
export function publicationEvidence(meta,selected,originalSha256){
  verifySourceDefinition(meta,originalSha256);
  if(meta.matches_publication===true)return {matchesPublication:true};
  const review=selected.catalogAlternative;
  if(meta.matches_publication!==false||!review||review.originalSha256!==originalSha256||String(meta.publication?.PMID)!==review.publicationPMID||typeof review.reason!=='string'||review.reason.length<40)throw Error('Unreviewed alternative-to-publication scoring file');
  return {matchesPublication:false,publicationCaveat:review.reason};
}
export function verifyHarmonizedRow(original,harmonized){
  if(!harmonized||harmonized.effect_allele!==original.effect_allele||(original.other_allele&&harmonized.other_allele!==original.other_allele)||Number(harmonized.effect_weight)!==Number(original.effect_weight))throw Error('Harmonization changed source ID, allele, or weight; review required.');
  // Some official harmonized rows retain an original rsID but omit hm_rsID.
  // Keep that original identity only provisionally: both assembly positions and
  // canonical Ensembl identity are still independently verified below.
  const id=harmonized.hm_rsID||original.rsID;
  if(!/^rs\d+$/.test(id))throw Error('No verifiable rsID in original or harmonized scoring row');
  return id;
}
export function coordinateVariantIdentity(row,build,records){
  const ids=new Set();
  for(const r of records){
    if(r.source!=='dbSNP'||r.assembly_name!==build||r.strand!==1||r.seq_region_name!==row.chr_name||r.start!==Number(row.chr_position)||r.end!==r.start||!/^rs\d+$/.test(r.id)||!Array.isArray(r.alleles))continue;
    try{const alleles=r.alleles.filter(a=>/^[ACGT]$/.test(a));if(row.other_allele)harmonizeModelAlleles(row.effect_allele,row.other_allele,alleles);else effectAlleleCandidates(row.effect_allele,alleles);ids.add(r.id);}catch{}
  }
  if(ids.size!==1){
    const candidates=[...ids].sort();
    throw Error('Coordinate-only term has no unique compatible dbSNP identity: '+row.rsID+'; compatible IDs: '+(candidates.join(', ')||'none'));
  }
  return [...ids][0];
}
export function preflightHarmonizedRows(original,parsed,build){
  if(parsed.metadata.pgs_id!==original.metadata.pgs_id||parsed.metadata.HmPOS_build!==build||parsed.rows.length!==original.rows.length)throw Error('Harmonized model/build mismatch');
  const byId=new Map(parsed.rows.map(r=>[r.rsID,r]));
  if(byId.size!==original.rows.length)throw Error('Duplicate harmonized source identities');
  for(const r of original.rows){
    const h=byId.get(r.rsID);
    if(!h||h.effect_allele!==r.effect_allele||(r.other_allele&&h.other_allele!==r.other_allele)||Number(h.effect_weight)!==Number(r.effect_weight))throw Error('Harmonization changed source ID, allele, or weight; review required.');
    if(!/^(?:[1-9]|1\d|2[0-2])$/.test(h.hm_chr)||!/^[1-9]\d*$/.test(h.hm_pos)||!Number.isSafeInteger(Number(h.hm_pos)))throw Error('Missing or invalid '+build+' harmonized coordinate: '+r.rsID);
    if(r.coordinateSource&&original.metadata.genome_build===build&&(h.hm_chr!==r.chr_name||Number(h.hm_pos)!==Number(r.chr_position)))throw Error('Source coordinate changed on its declared build: '+r.rsID);
  }
  return byId;
}
async function download(url,filename,body){
  const u=new URL(url);if(u.protocol!=='https:'||!['www.pgscatalog.org','ftp.ebi.ac.uk','rest.ensembl.org','grch37.rest.ensembl.org','eprints.gla.ac.uk','hgdownload.soe.ucsc.edu'].includes(u.hostname)&&![...Object.values(REVIEWED_LINEAR_METHODS).map(e=>e.sourceURL),SICCA_ADDITIVE_METHOD.sourceURL,JIA_ADDITIVE_METHOD.sourceURL,HODGKIN_ADDITIVE_METHOD.sourceURL,NARCOLEPSY_FIXED_METHOD.sourceURL,INSULIN_RESISTANCE_METHOD.sourceURL].includes(url))throw Error('Unexpected public source host');
  if(!process.argv.includes('--fresh')){try{const info=await stat(new URL(filename,cache));if(Date.now()-info.mtimeMs<86400000){const bytes=await readFile(new URL(filename,cache));if(!body||JSON.stringify(Object.keys(JSON.parse(bytes)).sort())===JSON.stringify(body.ids.slice().sort()))return {bytes,url,sha256:sha(bytes)};}}catch{}}
  let response;for(let attempt=0;attempt<4;attempt++){
    response=await retryPGSSource(url,()=>({...(body?{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)}));
    if(response.ok)break;
    if(![500,502,503,504].includes(response.status)||attempt===3)throw Error(`${u.href}: HTTP ${response.status}${body?' (public identifier request SHA-256 '+sha(JSON.stringify(body))+', '+body.ids.length+' IDs)':''}`);
    await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));
  }
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20_000_000)throw Error('Source larger than compact-library limit');
  await writeFile(new URL(filename,cache),bytes);return {bytes,url,sha256:sha(bytes)};
}
export async function importLibrary({selection=SELECTED_SCORES,publish=true}={}){
  if(publish!==false)throw Error('Direct score-library publication is disabled. Use stage-pgs-refresh.mjs or expand-reviewed-pgs.mjs, rebuild matching reference artifacts, then publish-pgs-expansion.mjs.');
  if(selection.some(s=>s.reviewedCervicalDeletion!==undefined)){
    const ordinary=selection.filter(s=>s.reviewedCervicalDeletion===undefined),special=selection.filter(s=>s.reviewedCervicalDeletion!==undefined);
    let combined=ordinary.length?await importLibrary({selection:ordinary,publish:false}):null;
    for(const selected of special){const addition=await importReviewedCervical(selected,{cache});combined=combined?mergePGSLibraries(combined,addition,combined.version):addition;}
    // Full refresh retains the reviewed selection order, including the special model.
    combined.models.sort((a,b)=>selection.findIndex(s=>s.id===a.id)-selection.findIndex(s=>s.id===b.id));return validatePGSLibrary(combined);
  }
  await mkdir(cache,{recursive:true});const models=[],allIDs=new Set();
  for(const selected of selection){
    const metaFile=await download(`https://www.pgscatalog.org/rest/score/${selected.id}`,`${selected.id}.json`),meta=JSON.parse(metaFile.bytes);
    const reviewedUnit=meta.weight_type==='NR'&&(meta.id==='PGS000034'||selected.reviewedLinearMethod===true&&Object.hasOwn(REVIEWED_LINEAR_METHODS,meta.id)||selected.reviewedAdditiveMethod===true&&meta.id==='PGS000327'||selected.reviewedSiccaMethod===true&&meta.id==='PGS001308'||selected.reviewedJIAMethod===true&&meta.id==='PGS000114'||selected.reviewedHodgkinMethod===true&&meta.id==='PGS000638'||selected.reviewedMyelomaMethod===true&&meta.id==='PGS000653'||selected.verifyLogOdds===true)||selected.reviewedNarcolepsyFixedTerms===true&&meta.id==='PGS000757'&&meta.weight_type==='Unweighted'||selected.reviewedInsulinResistanceMethod===true&&meta.id==='PGS000877'&&meta.weight_type==='Unweighted';
    if(meta.id!==selected.id||meta.variants_number!==selected.count||meta.variants_interactions!==0||meta.matches_publication!==true&&!selected.catalogAlternative||!reviewedUnit&&!(/^(beta|log\(OR\)|ln\(OR\)|log\(HR\)|Beta \(corrected for sample overlap\))$/i.test(meta.weight_type)))throw Error('Selected score metadata changed; review required.');
    const originalFile=await download(meta.ftp_scoring_file,`${meta.id}.txt.gz`),original=parseScoringFile(gunzipSync(originalFile.bytes).toString(),{allowEffectOnly:selected.allowEffectOnly===true,allowCoordinateIds:selected.allowCoordinateIds===true,reviewedNarcolepsyFixedTerms:selected.reviewedNarcolepsyFixedTerms===true});
    if(original.metadata.pgs_id!==meta.id)throw Error('Original score ID mismatch');
    verifyWeightTypeAgreement(meta.weight_type,original.metadata.weight_type);
    const publicationStatus=publicationEvidence(meta,selected,originalFile.sha256);
    let additiveMethodEvidence=null;
    if(selected.reviewedLinearMethod){const e=REVIEWED_LINEAR_METHODS[meta.id];if(!e)throw Error('Unreviewed linear-method evidence');const doc=await download(e.sourceURL,e.sourceFile);additiveMethodEvidence=verifyReviewedLinearMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedAdditiveMethod){const doc=await download(ASD_ADDITIVE_METHOD.sourceURL,meta.id+'-methods.pdf');additiveMethodEvidence=verifyASDAdditiveMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedSiccaMethod){const doc=await download(SICCA_ADDITIVE_METHOD.sourceURL,SICCA_ADDITIVE_METHOD.sourceFile);additiveMethodEvidence=verifySiccaAdditiveMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedJIAMethod){const doc=await download(JIA_ADDITIVE_METHOD.sourceURL,JIA_ADDITIVE_METHOD.sourceFile);additiveMethodEvidence=verifyJIAAdditiveMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedHodgkinMethod){const doc=await download(HODGKIN_ADDITIVE_METHOD.sourceURL,HODGKIN_ADDITIVE_METHOD.sourceFile);additiveMethodEvidence=verifyHodgkinAdditiveMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedMyelomaMethod){const doc=await download(MYELOMA_ADDITIVE_METHOD.sourceURL,MYELOMA_ADDITIVE_METHOD.sourceFile);additiveMethodEvidence=verifyMyelomaAdditiveMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedNarcolepsyFixedTerms){const doc=await download(NARCOLEPSY_FIXED_METHOD.sourceURL,NARCOLEPSY_FIXED_METHOD.sourceFile);additiveMethodEvidence=verifyNarcolepsyFixedMethod(meta,originalFile.sha256,doc.sha256);}
    if(selected.reviewedInsulinResistanceMethod){const doc=await download(INSULIN_RESISTANCE_METHOD.sourceURL,INSULIN_RESISTANCE_METHOD.sourceFile);additiveMethodEvidence=verifyInsulinResistanceMethod(meta,originalFile.sha256,doc.sha256);verifyInsulinResistanceRows(original.metadata,original.rows);}
    const weightEvidence=selected.verifyLogOdds?verifyLogOddsWeights(original.rows):null;
    const builds={},sources={metadata:{url:metaFile.url,sha256:metaFile.sha256},original:{url:originalFile.url,sha256:originalFile.sha256}},coordinateIDs=new Map();
    // Fail on incomplete/conflicting harmonization before expensive coordinate
    // resolution. A missing term is never repaired by truncating the model.
    for(const build of ['GRCh37','GRCh38']){
      const file=await download(meta.ftp_harmonized_scoring_files[build].positions,`${meta.id}_${build}.txt.gz`),parsed=parseScoringFile(gunzipSync(file.bytes).toString(),{allowEffectOnly:selected.allowEffectOnly===true,allowCoordinateIds:selected.allowCoordinateIds===true,reviewedNarcolepsyFixedTerms:selected.reviewedNarcolepsyFixedTerms===true});
      verifyWeightTypeAgreement(meta.weight_type,parsed.metadata.weight_type);
      builds[build]=preflightHarmonizedRows(original,parsed,build);
      sources[build]={url:file.url,sha256:file.sha256,harmonizedAt:parsed.metadata.HmPOS_date};
    }
    const coordinateRows=original.rows.filter(r=>r.coordinateSource);let coordinateNext=0,coordinateDone=0,coordinateFailure=null;
    await Promise.all(Array.from({length:Math.min(4,coordinateRows.length)},async()=>{while(coordinateNext<coordinateRows.length&&!coordinateFailure){const r=coordinateRows[coordinateNext++];try{
      const build=original.metadata.genome_build,host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
      const file=await download(`https://${host}/overlap/region/human/${r.chr_name}:${r.chr_position}-${r.chr_position}?feature=variation&content-type=application/json`,`${meta.id}-${build}-${r.chr_name}-${r.chr_position}-identity.json`);
      let identity;
      try{identity=coordinateVariantIdentity(r,build,JSON.parse(file.bytes));}
      catch(e){
        const verify=selected.reviewedHeightAliases===true&&r.rsID==='coordinate:GRCh37:3:9975386'?reviewedHeightIdentity:selected.reviewedThyroidAliases===true&&['coordinate:GRCh38:6:31111059','coordinate:GRCh38:6:31112941','coordinate:GRCh38:6:31113122','coordinate:GRCh38:6:31272702'].includes(r.rsID)?reviewedThyroidIdentity:null;
        if(!verify)throw e;
        const proof=await verify({modelId:meta.id,originalSha256:originalFile.sha256,row:r,build,overlapSha256:file.sha256});
        identity=proof.canonicalId;(sources.reviewedCoordinateAliases||=[]).push(proof);
      }
      coordinateIDs.set(r.rsID,identity);
      (sources.coordinateResolution||=[]).push({url:file.url,sha256:file.sha256});
      if(++coordinateDone%200===0)console.log(meta.id+' independently resolved coordinates: '+coordinateDone+'/'+coordinateRows.length);
    }catch(e){coordinateFailure=e;}}}));
    if(coordinateFailure)throw coordinateFailure;
    sources.coordinateResolution?.sort((a,b)=>a.url.localeCompare(b.url));
    sources.reviewedCoordinateAliases?.sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
    if(selected.reviewedHDLAliases===true){
      if(meta.id!=='PGS000660')throw Error('HDL alias review requires its exact source model');
      for(const build of ['GRCh37','GRCh38'])for(const r of original.rows.filter(r=>isReviewedHDLAlias(r.rsID))){
        const h=builds[build].get(r.rsID),proof=await reviewedHDLIdentity({modelId:meta.id,originalSha256:originalFile.sha256,harmonizedSha256:sources[build].sha256,row:r,harmonized:h,build});
        h.hm_rsID=proof.canonicalId;(sources.reviewedIdentifierAliases||=[]).push(proof);
      }
      if(sources.reviewedIdentifierAliases?.length!==6)throw Error('Incomplete HDL alias reconciliation');
    }
    for(const build of ['GRCh37','GRCh38']){
      const byId=builds[build];
      for(const r of original.rows){const h=byId.get(r.rsID);if(h&&r.coordinateSource&&!h.hm_rsID)h.hm_rsID=coordinateIDs.get(r.rsID);const id=verifyHarmonizedRow(r,h);if(r.coordinateSource&&id!==coordinateIDs.get(r.rsID))throw Error('Harmonized and coordinate-resolved rsIDs disagree');h.hm_rsID=id;}
    }
    const variants=original.rows.map(r=>{const id=builds.GRCh38.get(r.rsID).hm_rsID;if(id!==builds.GRCh37.get(r.rsID).hm_rsID)throw Error('Builds disagree on merged rsID');allIDs.add(id);return {id,sourceId:r.rsID,...(r.coordinateSource?{sourceCoordinate:{build:original.metadata.genome_build,chrom:r.chr_name,position:Number(r.chr_position)}}:{}),effectAllele:r.effect_allele,otherAllele:r.other_allele||null,alleleMode:r.other_allele?'explicit-pair':'effect-only',weight:Number(r.effect_weight),weightText:r.effect_weight,locus:r.locus_name||r.rsID};});
    if(selected.pgcSource){
      const matchingSource=meta.samples_variants?.some(s=>String(s.source_PMID)===selected.pgcSource.sourcePMID);
      if(!matchingSource)throw Error(`${meta.id} no longer identifies the reviewed PGC source publication`);
    }
    models.push({coordinateSource:selected.allowCoordinateIds===true,...selected.coverageContext?{coverageContext:selected.coverageContext}:{},...selected.pgcSource?{pgcSource:selected.pgcSource}:{},id:meta.id,name:meta.name,trait:meta.trait_reported,family:selected.family,variantCount:selected.count,weightType:weightEvidence?.type||meta.weight_type,sourceWeightType:meta.weight_type,weightEvidence,effectType:'additive',method:meta.method_name,methodParameters:meta.method_params,publication:meta.publication,ancestry:meta.ancestry_distribution,studySamples:{variantAssociation:meta.samples_variants,training:meta.samples_training},license:meta.license,catalogURL:`https://www.pgscatalog.org/score/${meta.id}/`,sourceFiles:sources,variants,_builds:builds});
    Object.assign(models.at(-1),publicationStatus);
    if(selected.reviewedAssemblyReversals===true){
      if(original.metadata.genome_build!=='GRCh37')throw Error('Assembly reversal review currently requires a GRCh37 source');
      models.at(-1).reviewedAssemblyReversals=true;
    }
    if(additiveMethodEvidence)models.at(-1).additiveMethodEvidence=additiveMethodEvidence;
    console.log(`Downloaded ${meta.id}: ${selected.count} complete scoring terms`);
  }
  const reference={},referenceSources={};
  for(const build of ['GRCh37','GRCh38']){
    const host=build==='GRCh38'?'rest.ensembl.org':'grch37.rest.ensembl.org';
    reference[build]={};referenceSources[build]=[];for(const filename of (await readdir(cache)).filter(n=>n.startsWith('pgs-ensembl-'+build+'-'))){const file=await readFile(new URL(filename,cache));if(Date.now()-(await stat(new URL(filename,cache))).mtimeMs<86400000){mergePGSMappingEvidence(reference[build],JSON.parse(file),build,allIDs);referenceSources[build].push({url:'https://'+host+'/variation/human',sha256:sha(file)});}}
    const ids=[...allIDs].filter(id=>!reference[build][id]),batches=[];for(let i=0;i<ids.length;i+=200)batches.push(ids.slice(i,i+200));
    let next=0,completed=0,failure=null;
    // Independent public identifier requests; four in flight limits latency
    // without approaching Ensembl's request-rate limit. Never publish partial data.
    await Promise.all(Array.from({length:4},async()=>{while(next<batches.length&&!failure){const batch=batches[next++];try{
      const file=await download(`https://${host}/variation/human`,`pgs-ensembl-${build}-${sha(JSON.stringify(batch)).slice(0,12)}.json`,{ids:batch});
      mergePGSMappingEvidence(reference[build],JSON.parse(file.bytes),build,allIDs);referenceSources[build].push({url:file.url,sha256:file.sha256});
      if(++completed%20===0)console.log(build+' public mapping batches: '+completed+'/'+batches.length);
    }catch(e){failure=e;}}}));
    if(failure)throw failure;referenceSources[build].sort((a,b)=>a.sha256.localeCompare(b.sha256));
  }
  const targets=new Map();
  for(const model of models){for(const v of model.variants){
    const mappings={},harmonizations=[];
    for(const build of ['GRCh37','GRCh38']){
      const h=model._builds[build].get(v.sourceId),raw=reference[build][v.id];
      const hits=raw?.mappings?.filter(m=>m.assembly_name===build&&m.strand===1&&m.seq_region_name===h.hm_chr&&m.start===Number(h.hm_pos)&&m.start===m.end);
      if(raw?.name!==v.id||hits?.length!==1||(!v.sourceCoordinate&&v.id!==v.sourceId&&!raw.synonyms?.includes(v.sourceId)))throw Error(`Unverified reference position: ${model.id} ${v.id} ${build}`);
      if(v.sourceCoordinate?.build===build&&(v.sourceCoordinate.chrom!==h.hm_chr||v.sourceCoordinate.position!==Number(h.hm_pos)))throw Error('Source coordinate changed on its declared build: '+v.sourceId);
      const m=hits[0],depositedAlleles=m.allele_string.split('/');
      let mapping={chrom:h.hm_chr,position:Number(h.hm_pos),ref:depositedAlleles[0],alleles:depositedAlleles.filter(a=>/^[ACGT]$/.test(a)),unsupportedReferenceAlleles:depositedAlleles.filter(a=>!/^[ACGT]$/.test(a))};
      if(model.id==='PGS002980'&&v.id==='rs2270894'){
        const supplement=await reviewedHeightMapping({modelId:model.id,originalSha256:model.sourceFiles.original.sha256,id:v.id,build,mapping});
        mapping=supplement.mapping;(v.supplementalMappingEvidence||={})[build]=supplement.evidence;
      }
      if(model.id==='PGS018695'&&v.id==='rs2233965'){
        const supplement=await reviewedThyroidMapping({modelId:model.id,originalSha256:model.sourceFiles.original.sha256,id:v.id,build,mapping});
        mapping=supplement.mapping;(v.supplementalMappingEvidence||={})[build]=supplement.evidence;
      }
      const alleles=mapping.alleles,allAlleles=[...alleles,...mapping.unsupportedReferenceAlleles];
      if(!/^(?:[1-9]|1\d|2[0-2])$/.test(h.hm_chr)||!/^[ACGT]$/.test(allAlleles[0]))throw Error(`Unsupported or mismatched alleles: ${v.id}`);
      try{harmonizations.push(v.alleleMode==='effect-only'?effectAlleleCandidates(v.effectAllele,alleles):harmonizeModelAlleles(v.effectAllele,v.otherAllele,alleles));}catch(e){throw Error(model.id+' '+v.id+' '+build+': '+e.message);}
      mappings[build]=mapping;
    }
    if(JSON.stringify(harmonizations[0])!==JSON.stringify(harmonizations[1])){
      if(!model.reviewedAssemblyReversals||v.alleleMode==='effect-only'||harmonizations[0].reverseComplemented||!harmonizations[1].reverseComplemented)throw Error(model.id+' allele harmonization differs between builds: '+v.id);
      try{v.assemblyReversalEvidence=await verifyAssemblyReversal(v.id,mappings,download);}catch(e){throw Error(model.id+' '+v.id+': '+e.message);}
      v.buildAlleles={GRCh37:harmonizations[0],GRCh38:harmonizations[1]};
    }
    v.sourceEffectAllele=v.effectAllele;v.sourceOtherAllele=v.otherAllele;if(v.alleleMode==='effect-only'){v.effectAlleleCandidates=harmonizations[0];v.effectAllele=v.effectAlleleCandidates[0];v.reverseComplemented=v.effectAlleleCandidates.length===1&&v.effectAllele!==v.sourceEffectAllele;}else Object.assign(v,harmonizations[0]);
    if(targets.has(v.id)) {if(JSON.stringify(targets.get(v.id).mappings)!==JSON.stringify(mappings))throw Error('Models disagree on target mapping');continue;}
    targets.set(v.id,{id:v.id,gene:v.locus,label:'Published PGS component',trait:model.trait,category:'Metabolic',priority:1,evidence:'Published score component',effectAllele:v.effectAllele,...(v.supplementalMappingEvidence?{supplementalMappingEvidence:v.supplementalMappingEvidence}:{}),...(v.buildAlleles?{buildEffectAlleles:{GRCh37:v.buildAlleles.GRCh37.effectAllele,GRCh38:v.buildAlleles.GRCh38.effectAllele},assemblyReversalEvidence:v.assemblyReversalEvidence}:{}),frequency:null,mappings,summary:'This component is interpreted only with its complete published score model.',caution:'An individual model weight is not a causal finding or clinical interpretation.',sources:[{label:`PGS Catalog ${model.id}`,url:model.catalogURL}]});
  }delete model._builds;}
  const installedVersion=JSON.parse(await readFile(new URL('public/data/pgs-library.json',root))).version;
  const library={version:installedVersion,retrievedAt:new Date().toISOString(),source:'PGS Catalog',selection:'Catalog additive SNV models with complete source weights and independently verified reference mappings; reviewed author-supplied alternatives are labeled. European reference comparisons require evaluation-population review. Not a ranking of predictive accuracy.',referenceSources,models,targets:[...targets.values()]};
  validatePGSLibrary(library);if(publish){const next=new URL('public/data/pgs-library.next.json',root),dest=new URL('public/data/pgs-library.json',root);await writeFile(next,JSON.stringify(library,null,2)+'\n');await rename(next,dest);}
  console.log(`${publish?'Installed':'Validated'} ${models.length} models, ${targets.size} distinct scoring variants. No personal file was accessed.`);return library;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))importLibrary().catch(e=>{console.error(e.message);process.exitCode=1;});
