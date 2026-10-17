import {harmonizeModelAlleles} from './allele-harmonization.js';
import {effectAlleleCandidates,possibleEffectDosages} from './effect-only-pgs.js';
import {validateCatalog} from './catalog.js';
import {termForBuild,validateAssemblyReversal,complementAllele} from './pgs-build-alleles.js';
import {validatePGSWorkload} from './pgs-limits.js';
import {parsePGSDecimal,validatePGSNumericEnvelope} from './pgs-numeric.js';
import {validateReviewedPGSDeletionTerm} from './reviewed-pgs-deletion.js';
import {recordPresence} from './record-coverage.js';
import {withdrawnScoreReason} from './retired-scores.js';
export const isPalindromic=(a,b)=>['AT','CG'].includes([a,b].sort().join(''));
export function pgsCoverage(model){
 const usableMeasured=model.terms.filter(t=>t.contribution!==null).length;
 const excluded=model.terms.filter(t=>t.contribution===null);
 const notObserved=excluded.filter(t=>recordPresence(t)===false).length;
 const unassessed=excluded.filter(t=>recordPresence(t)===null).length;
 return {usableMeasured,presentButUnusable:excluded.length-notObserved-unassessed,notObserved,unassessed,total:model.terms.length};
}
export function validatePGSLibrary(library){
  if(!library||typeof library.version!=='string'||!Number.isFinite(Date.parse(library.retrievedAt))||!Array.isArray(library.models)||!library.models.length||!Array.isArray(library.targets))throw Error('Invalid PGS library');
  validatePGSWorkload(library.models,'variants');
  validateCatalog({version:library.version,retrievedAt:library.retrievedAt,records:library.targets});
  const targets=new Map(library.targets.map(t=>[t.id,t])),ids=new Set(),publishedPairs=new Map();
  for(const m of library.models){
    validatePGSNumericEnvelope(m.variants);
    if(!/^PGS\d{6}$/.test(m.id)||ids.has(m.id)||m.effectType!=='additive'||!m.variants.length||m.variantCount!==m.variants.length)throw Error('Invalid or unsupported PGS model');ids.add(m.id);
    for(const key of ['name','trait','family','license'])if(typeof m[key]!=='string'||!m[key])throw Error('Incomplete model metadata');
    if(m.catalogURL!==`https://www.pgscatalog.org/score/${m.id}/`)throw Error('Invalid model source');
    if(m.matchesPublication!==undefined&&typeof m.matchesPublication!=='boolean')throw Error('Invalid publication match status');
    if(m.matchesPublication===false&&(typeof m.publicationCaveat!=='string'||m.publicationCaveat.length<40))throw Error('Alternative score requires a publication caveat');
    if(m.pgcSource&&(!/^OpenMed\/pgc-[a-z-]+$/.test(m.pgcSource.dataset)||typeof m.pgcSource.config!=='string'||!m.pgcSource.config||!/^\d+$/.test(m.pgcSource.sourcePMID)||m.pgcSource.url!==`https://huggingface.co/datasets/${m.pgcSource.dataset}`))throw Error('Invalid PGC score lineage');
    const seen=new Set();
    for(const v of m.variants){
      const t=targets.get(v.id);if(!t||seen.has(v.id)||!Number.isFinite(v.weight)||!/^[ACGT]$/.test(v.effectAllele))throw Error('Invalid model term');seen.add(v.id);
      if(v.weightText!==undefined&&parsePGSDecimal(v.weightText)!==v.weight)throw Error('Model weight differs from original decimal text');
      if(t.variantKind==='reviewed-pgs-deletion'||v.kind==='reviewed-deletion'){
        validateReviewedPGSDeletionTerm({modelId:m.id,variantCount:m.variantCount,originalSha256:m.sourceFiles?.original?.sha256,term:v,target:t});continue;
      }
      if(v.alleleMode==='effect-only'){
        if(v.buildAlleles)throw Error('Build-specific effect-only alleles are not supported');
        if(v.otherAllele!==null||v.sourceOtherAllele!==null)throw Error('Effect-only model must not invent a comparison allele');
        for(const build of ['GRCh37','GRCh38']){const candidates=effectAlleleCandidates(v.sourceEffectAllele,t.mappings[build]?.alleles);if(JSON.stringify(candidates)!==JSON.stringify(v.effectAlleleCandidates)||v.effectAllele!==candidates[0]||v.reverseComplemented!==(candidates.length===1&&candidates[0]!==v.sourceEffectAllele))throw Error('Unverified effect-only orientations');}
      }else{
        if(!/^[ACGT]$/.test(v.otherAllele)||v.effectAllele===v.otherAllele)throw Error('Invalid model allele pair');
        if(v.buildAlleles){
          validateAssemblyReversal(v.assemblyReversalEvidence,t.mappings);
          if(isPalindromic(v.sourceEffectAllele,v.sourceOtherAllele)||v.effectAllele!==v.buildAlleles.GRCh37.effectAllele||v.otherAllele!==v.buildAlleles.GRCh37.otherAllele||v.reverseComplemented!==v.buildAlleles.GRCh37.reverseComplemented||v.buildAlleles.GRCh38.effectAllele!==complementAllele(v.effectAllele)||v.buildAlleles.GRCh38.otherAllele!==complementAllele(v.otherAllele))throw Error('Invalid build-specific source conversion');
        }
        for(const b of ['GRCh37','GRCh38']){
          const resolved=termForBuild(v,b),pair=[resolved.effectAllele,resolved.otherAllele].sort().join(''),key=v.id+':'+b;
          if(publishedPairs.has(key)&&publishedPairs.get(key)!==pair)throw Error('Cross-model allele-pair disagreement requires review: '+v.id);
          publishedPairs.set(key,pair);
          if(v.sourceEffectAllele!==undefined||v.sourceOtherAllele!==undefined){const h=harmonizeModelAlleles(v.sourceEffectAllele,v.sourceOtherAllele,t.mappings[b].alleles);if(h.effectAllele!==resolved.effectAllele||h.otherAllele!==resolved.otherAllele||h.reverseComplemented!==resolved.reverseComplemented)throw Error('Unverified source allele conversion');}
          if(!t.mappings[b]?.alleles.includes(resolved.effectAllele)||!t.mappings[b]?.alleles.includes(resolved.otherAllele))throw Error('Score alleles disagree with reference target');
        }
      }
    }
  }
  return library;
}
export function pgsTargetCatalog(library){return {version:`pgs-${library.version}`,retrievedAt:library.retrievedAt,records:library.targets.filter(t=>t.variantKind!=='reviewed-pgs-deletion')};}

export function calculatePGS(library,targetReport){
  for(const model of library.models)validatePGSNumericEnvelope(model.variants);
  const effectOnlyIds=new Set(library.models.flatMap(model=>model.variants.filter(term=>term.alleleMode==='effect-only').map(term=>term.id)));
  const ordered=value=>Array.isArray(value)?value.slice().sort():value;
  // Effect-only scoring consumes this assembly's reference allele inventory.
  // Conflicting duplicate context must not select a scoring direction by order.
  const calls=new Map(),signature=r=>JSON.stringify({status:r.status,explicitlyUnobserved:r.recordObserved===false,alleles:ordered(r.alleles),...(effectOnlyIds.has(r.id)?{referenceAlleles:ordered(r.mappings?.[targetReport.build]?.alleles)}:{})});
  for(const r of targetReport.results){
    const old=calls.get(r.id);
    if(!old)calls.set(r.id,r);
    else if(old.status==='Conflicting records'||signature(old)!==signature(r))calls.set(r.id,{...old,...((old.recordObserved===false)!==(r.recordObserved===false)?{recordObserved:null}:{}),status:'Conflicting records',alleles:null,genotype:'—',inputCall:null,phase:null});
  }
  return library.models.map(model=>{
    const sourceWithdrawal=withdrawnScoreReason(model);
    const terms=model.variants.map(original=>{
      const v=termForBuild(original,targetReport.build);
      const r=calls.get(v.id);let status=r?.status||'Not observed',dosage=null,note='',possibleDosages=null;
      if(sourceWithdrawal){status='Source definition withdrawn';note=sourceWithdrawal;}
      else if(targetReport.format!=='VCF'){status='Unsupported input';note='This scorer currently requires sequencing VCF with GT, GQ and DP.';}
      else if(status==='Called'&&r.recordObserved===false){status='Conflicting records';note='Call status and explicit record-presence evidence disagree; scoring and population substitution are withheld.';}
      else if(status==='Called'){
        if(!Array.isArray(r.alleles)||r.alleles.length!==2||[r.alleles[0],r.alleles[1]].some(a=>typeof a!=='string'||!a.length)){status='Model allele mismatch';note='Genotype requires two explicit allele calls.';}
        else if(v.alleleMode==='effect-only'){
          if(r.alleles?.length!==2||r.alleles.some(a=>!r.mappings?.[targetReport.build]?.alleles.includes(a))){status='Model allele mismatch';note='Genotype is outside the verified reference allele set.';}
          else{possibleDosages=possibleEffectDosages(r.alleles,v.effectAlleleCandidates);if(possibleDosages.length===1){dosage=possibleDosages[0];note=v.effectAlleleCandidates.length===1?'Weighted allele has one reference-compatible orientation; no comparison allele was invented.':'Every retained allele orientation gives the same dosage. Orientation itself remains unresolved.';}else{status='Effect orientation unresolved';note='The source omits the comparison allele and reference-compatible orientations give different dosages. The measured genotype is retained.';}}
        }
        else if(r.alleles?.length!==2 || r.alleles.some(a=>a!==v.effectAllele&&a!==v.otherAllele)){status='Model allele mismatch';note='Genotype contains alleles outside this published two-allele model.';}
        else if(isPalindromic(v.effectAllele,v.otherAllele)&&r.alleles[0]===r.alleles[1]){status='Strand ambiguous';note='A/T or C/G homozygote: effect-allele orientation requires additional evidence.';}
        else {dosage=r.alleles.filter(a=>a===v.effectAllele).length;note=isPalindromic(v.effectAllele,v.otherAllele)?'Heterozygote dosage is 1 in either strand orientation.':v.reverseComplemented?'Exact genomic matching after verified source-model reverse complementation; no input-strand guessing or proxies.':'Exact genomic allele matching; no input-strand guessing or proxy substitutions.';}
      }
      if(v.buildAlleles)note+=' Build-specific forward alleles are supported by unique reciprocal assembly-chain mappings and exact 201-base reverse-complement reference sequences. Published source alleles and weights are retained; this does not infer the input strand.';
      if(v.kind==='reviewed-deletion')note+=' This exact deletion is matched by full local reference/alternate haplotype equivalence on the declared build; canonical AGA/A and source-like AAG/A retain the original coefficient. No arbitrary indel, missing-reference or strand inference is allowed.';
      return {...v,genotype:r?.genotype||'—',recordObserved:r?recordPresence(r):false,status,dosage,possibleDosages,contribution:dosage===null?null:dosage*v.weight,note,mapping:r?.mappings?.[targetReport.build],...(v.kind==='reviewed-deletion'?{inputGenotype:r?.inputCall?.genotype??null,inputRepresentation:r?.inputCall?.representation??null,phase:r?.phase??null}:{})};
    });
    const included=terms.filter(v=>v.contribution!==null),complete=included.length===model.variantCount;
    // Compensated addition makes order-related rounding negligible for signed weights.
    let sum=0,correction=0;for(const v of included){const y=v.contribution-correction,t=sum+y;correction=(t-sum)-y;sum=t;}
    const totalWeight=terms.reduce((a,v)=>a+Math.abs(v.weight),0),usedWeight=included.reduce((a,v)=>a+Math.abs(v.weight),0);
    const reasons={};for(const v of terms)if(v.contribution===null)reasons[v.status]=(reasons[v.status]||0)+1;
    const {variants,...metadata}=model;
    // Catalog titles can contain simple typographic tags. Keep frozen metadata intact,
    // but store a plain title in reports; other markup remains rejected on reopening.
    const publication=metadata.publication&&typeof metadata.publication.title==='string'?{...metadata.publication,title:metadata.publication.title.replace(/<\/?(?:i|em|b|strong|sub|sup)>/gi,'')}:metadata.publication;
    return {...metadata,...publication?{publication}:{},libraryVersion:library.version,libraryRetrievedAt:library.retrievedAt,build:targetReport.build,inputFormat:targetReport.format,
      status:complete?'Complete raw sum':'Incomplete — full score withheld',rawSum:complete?sum:null,matchedSubtotal:included.length?sum:null,
      matched:included.length,total:model.variantCount,variantCoverage:included.length/model.variantCount,absoluteWeightCoverage:totalWeight?usedWeight/totalWeight:null,reasons,terms,
      percentile:null,percentileReason:'No compatible reference score distribution or ancestry calibration is installed.',
      calculation:'SUM(effect_weight × effect-allele count). No missing-genotype imputation, score rescaling, publication-specific normalization, or covariate adjustment.',
      interpretation:'A raw weighted sum is not a predicted trait measurement, disease probability, percentile, or clinical assessment. Incomplete subtotals cannot be compared with full scores or with each other. Model applicability to this individual has not been established.'};
  });
}

