import {createShortVariantScanner} from './short-variants.js';
import {clinicalFindings} from './clinical.js';
import {inputStream} from './compression.js';
import {effectDirection,personalDirection,clusterTraits} from './traits.js';
import {validatePGSLibrary,pgsTargetCatalog,calculatePGS} from './pgs.js';
import {createCertifiedPGSDeletionScanner} from './certified-pgs-deletion-scanner.js';
import {createPGSOverlapGuard} from './pgs-overlap-guard.js';
import {ANALYSIS_METHOD_VERSION} from './analysis-method.js';
import {validateAncestryReference,ancestryTargetCatalog,estimateAncestry} from './ancestry.js';
export const PRIORITIES={3:'Higher relevance',2:'Context-dependent',1:'Exploratory'};
export function rarity(f){if(f===null||f===undefined)return 'Unknown';if(f===0)return 'Not observed in reference';if(f<0.001)return 'Very rare (<0.1%)';if(f<0.01)return 'Rare (<1%)';if(f<0.05)return 'Low frequency (1–5%)';return 'Common (≥5%)';}
function chromosome(s,format){s=s.replace(/^chr/i,'').toUpperCase();if(s==='M')return 'MT';if(format==='Ancestry'){return ({23:'X',24:'Y',25:'PAR',26:'MT'})[s]||s;}return s;}
function buildFrom(s){if(/GRCh38|hg38|build\s*38|assembly\s*=\s*["']?38/i.test(s))return 'GRCh38';if(/GRCh37|hg19|build\s*37|assembly\s*=\s*["']?37/i.test(s))return 'GRCh37';if(/NCBI36|hg18|build\s*36|CHM13|T2T/i.test(s))return 'unsupported';return null;}

export function createScanner(catalog,options={}){
  const ancestryReference=options.ancestryReference?validateAncestryReference(options.ancestryReference):null;
  const ancestryScanner=ancestryReference?createScanner(ancestryTargetCatalog(ancestryReference),{build:options.build,sample:options.sample}):null;
  const scoreLibrary=options.pgsLibrary?validatePGSLibrary(options.pgsLibrary):null;
  const scoreScanner=scoreLibrary?createScanner(pgsTargetCatalog(scoreLibrary),{build:options.build,sample:options.sample}):null;
  const deletionTargets=scoreLibrary?.targets.filter(t=>t.variantKind==='reviewed-pgs-deletion')||[];
  let pgsDeletionScanner=null,pgsOverlapGuard=null;
  const shortScanner=options.shortVariantLibrary?createShortVariantScanner(options.shortVariantLibrary,[...catalog.records,...(scoreLibrary?.targets||[])]):null;
  const records=catalog.records;
  const byPosition=new Map();
  for(const r of records)for(const [b,m] of Object.entries(r.mappings)){const k=`${b}:${m.chrom}:${m.position}`;if(!byPosition.has(k))byPosition.set(k,[]);byPosition.get(k).push(r);}
  let format=null,build=options.build||null,headerBuild=null,sampleIndex=null,sampleName=null,sampleCount=null,vcfHeader=false;
  const calls=new Map(),stats={lines:0,records:0,noCalls:0,unsupported:0,malformed:0,unsupportedContigs:0,offPanel:0,duplicates:0},warnings=new Set();
  function save(record,call){
    const old=calls.get(record.id);
    if(old){stats.duplicates++;const signature=c=>JSON.stringify({alleles:c.alleles?.slice().sort(),status:c.status});if(signature(old)!==signature(call))calls.set(record.id,{status:'Conflicting records',alleles:null,notes:['Duplicate records disagree; interpretation withheld.']});}
    else calls.set(record.id,call);
  }
  function consume(raw){
    stats.lines++;const line=raw.replace(/^\uFEFF/,'').trim();if(!line)return;
    if(line.startsWith('#')){
      if(vcfHeader&&line.startsWith('#CHROM'))throw Error('Duplicate VCF sample header; concatenated sample inventories cannot be combined.');
      if(vcfHeader&&line.startsWith('##'))throw Error('VCF metadata appears after the sample header; input context must not change during scoring.');
      if(stats.records&&/^(?:##fileformat=VCF|#CHROM)/.test(line))throw Error('A new VCF header appears after genotype records; concatenated inputs are unsupported.');
      if(format!=='VCF'){if(/23andme/i.test(line))format='23andMe';if(/ancestrydna/i.test(line))format='Ancestry';}
      if(line.startsWith('##fileformat=VCF'))format='VCF';
      // Only reference/build metadata may establish assembly; arbitrary comments cannot.
      if(/reference|genome|assembly|build/i.test(line)){
        const found=buildFrom(line);
        if(found==='unsupported')throw Error('This reference genome is not supported. Use GRCh37 or GRCh38; no automatic liftover is performed.');
        if(found){if(headerBuild&&headerBuild!==found)throw Error('Conflicting reference builds in the file header.');headerBuild=found;if(build&&build!==found)throw Error('Selected build disagrees with the file header. Choose Auto or the correct build.');build=found;}
      }
      if(line.startsWith('#CHROM')){
        format='VCF';vcfHeader=true;const cols=line.split(/\s+/),samples=cols.slice(9);
        if(cols.slice(0,9).join('\t')!=='#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT')throw Error('Malformed VCF column header.');
        if(!samples.length)throw Error('VCF has no sample genotypes. A sites-only VCF cannot identify your genotype.');
        if(new Set(samples).size!==samples.length)throw Error('VCF sample names are duplicated; exact sample selection is ambiguous.');
        if(samples.length>1&&!options.sample)throw Error(`This VCF has ${samples.length} samples. Enter the exact sample name before analyzing.`);
        const chosen=options.sample?samples.indexOf(options.sample):0;
        if(chosen<0)throw Error('The selected sample name was not found in the VCF header.');sampleIndex=9+chosen;sampleName=samples[chosen];sampleCount=samples.length;
      }
      return;
    }
    if(/^rsid\s+chromosome\s+position/i.test(line)){
      if(/allele1\s+allele2/i.test(line))format='Ancestry';else if(/genotype/i.test(line))format=format||'23andMe';return;
    }
    if(!format)throw Error('Unrecognized file format. Use an original 23andMe/Ancestry text export or a VCF with its header. ZIP archives must be extracted first.');
    if(!build)throw Error('No supported reference build found in the header. Select the known build (GRCh37 or GRCh38) before analyzing. Do not guess.');
    if(format==='VCF'&&!vcfHeader)throw Error('VCF sample header (#CHROM) is missing.');
    stats.records++;
    const cols=line.split(/\s+/);let chrom,pos,id,alleles=null,notes=[],status='Called',ref=null;
    if(format==='VCF'){
      if(cols.length!==9+sampleCount)throw Error('VCF record column count differs from its sample header; no partial report is returned.');
      if(!pgsOverlapGuard)pgsOverlapGuard=createPGSOverlapGuard(records.filter(r=>r.mappings?.[build]?.ref?.length===1),{build,sampleCount,sampleIndex:sampleIndex-9});
      pgsOverlapGuard.consume(cols);
      if(deletionTargets.length){
        if(!pgsDeletionScanner)pgsDeletionScanner=createCertifiedPGSDeletionScanner(deletionTargets,{build,sampleCount,sampleIndex:sampleIndex-9});
        pgsDeletionScanner.consume(cols);
      }
      [chrom,pos,id,ref]=cols;chrom=chromosome(chrom,format);pos=Number(pos);
    }else{
      if(cols.length!==(format==='Ancestry'?5:4)){stats.malformed++;return;}
      [id,chrom,pos]=cols;chrom=chromosome(chrom,format);pos=Number(pos);
    }
    if(!Number.isSafeInteger(pos)||pos<1){stats.malformed++;return;}
    if(!/^(?:[1-9]|1\d|2[0-2]|X|Y|MT|PAR)$/.test(chrom)){stats.unsupportedContigs++;return;}
    const shortConsidered=shortScanner?.consume(cols,{format,build,sampleIndex,chrom,pos});
    const candidates=byPosition.get(`${build}:${chrom}:${pos}`)||[];
    if(!candidates.length){if(!shortConsidered)stats.offPanel++;return;}
    if(format==='VCF'){
      const alts=cols[4].split(','),all=[ref,...alts],fields=cols[8].split(':'),sample=cols[sampleIndex].split(':');
      const gtIndex=fields.indexOf('GT'),gt=gtIndex<0?'.':sample[gtIndex]||'.';
      if(new Set(fields).size!==fields.length||fields.some(f=>!f)||sample.length>fields.length||new Set(all).size!==all.length){status='Unsupported call';stats.malformed++;notes.push('Duplicate allele/FORMAT keys or inconsistent sample fields; interpretation withheld.');}
      else if(gt.split(/[|/]/).some(a=>a==='.')||gt===''){status='No call';stats.noCalls++;}
      else if(!/^\d+(?:[|/]\d+)?$/.test(gt)){status='Unsupported call';stats.unsupported++;notes.push('Unsupported or malformed genotype ploidy.');}
      else{
        const indexes=gt.split(/[|/]/).map(Number);
        if(indexes.some(i=>i>=all.length)){status='Unsupported call';stats.malformed++;notes.push('Genotype references an absent ALT allele.');}
        else if(indexes.some(i=>!/^[ACGT]$/.test(all[i]))||!/^[ACGT]$/.test(ref)||alts.some(a=>a!=='.'&&!/^[ACGT]$/.test(a))){status='Unsupported call';stats.unsupported++;notes.push('Only single-nucleotide alleles are interpreted; symbolic alleles and gVCF blocks are excluded.');}
        else alleles=indexes.map(i=>all[i]);
      }
      if(status==='Called'){
        if(cols[6]!=='PASS'){notes.push(cols[6]==='.'?'Site FILTER was not evaluated.':`Site failed FILTER: ${cols[6]}.`);status='Quality limited';}
        for(const [field,threshold] of [['GQ',20],['DP',10]]){
          const index=fields.indexOf(field),value=index>=0?sample[index]:null;
          if(value===null||value===undefined||value==='.'){notes.push(`${field} unavailable; quality incomplete.`);status='Quality limited';}
          else if(!/^\d+(?:\.\d+)?$/.test(value)||!Number.isFinite(Number(value))||Number(value)<threshold){notes.push(`${field} below screening threshold ${threshold} or invalid.`);status='Quality limited';}
        }
      }
      if(chrom.match(/^\d+$/)&&alleles?.length===1){status='Unsupported call';notes.push('Haploid call on an autosome; interpretation withheld.');}
    }else{
      const genotype=format==='Ancestry'?cols[3]+cols[4]:cols[3];
      if(/[-0.N]/i.test(genotype)){status='No call';stats.noCalls++;}
      else if(!/^[ACGT]{1,2}$/.test(genotype)){status='Unsupported call';stats.unsupported++;notes.push('Non-SNV or unsupported consumer genotype.');}
      else alleles=genotype.split('');
      if(chrom.match(/^\d+$/)&&alleles?.length!==2&&alleles){status='Unsupported call';notes.push('Unexpected autosomal ploidy.');}
      notes.push('Consumer-array call: no sequencing quality metrics; clinically consequential results need confirmation.');
    }
    for(const r of candidates){
      const mapping=r.mappings[build];let candidateStatus=status;const candidateNotes=[...notes];
      // rsID alone never rescues a coordinate/build mismatch. Internal consumer IDs are allowed at exact verified loci.
      if(format!=='VCF'&&/^rs\d+$/.test(id)&&id!==r.id){candidateStatus='Allele / ID mismatch';candidateNotes.push('rsID disagrees with the catalog at this coordinate.');}
      if((ref&&ref!==mapping.ref)||(alleles&&alleles.some(a=>!mapping.alleles.includes(a)))){candidateStatus='Allele / ID mismatch';candidateNotes.push('Reference or called alleles disagree; no strand flipping is attempted.');}
      save(r,{status:candidateStatus,alleles,notes:candidateNotes});
    }
  }
  function finish(){
    if(!stats.records)throw Error('No genotype records were found. Check the file and format.');
    if(!calls.size&&!shortScanner)warnings.add('No panel loci matched. This can reflect limited coverage, the wrong assembly, or an unsupported file; it does not indicate low genetic risk.');
    if(stats.unsupportedContigs)warnings.add(`${stats.unsupportedContigs} records on unsupported contigs were left unassessed.`);
    if(stats.malformed)warnings.add(`${stats.malformed} malformed records were skipped.`);
    if(stats.unsupported)warnings.add(`${stats.unsupported} panel calls could not be interpreted.`);
    if(format!=='VCF')warnings.add('Forward-strand consumer exports only. Chip coverage varies; untested loci and missing calls are not negative results.');
    warnings.add('Only this reference panel is assessed. Off-panel records are counted, not interpreted or quality-screened.');
    if(records.some(r=>r.association))warnings.add('API-linked GWAS entries are research associations pending scientific review. Reported alleles are not necessarily harmful, and linked variants may represent the same underlying signal. Do not add their effects together.');
    warnings.add('Relevance tiers are editorial review priorities, not penetrance, effect sizes, or probabilities. Rarity does not imply harm.');
    const results=records.map(r=>{
      const mapped=Boolean(r.mappings[build]);
      const call=calls.get(r.id)||(mapped?{status:'Not observed',alleles:null,notes:['No record at this panel locus; not a confirmed reference genotype.']}:{status:'Unsupported build',alleles:null,notes:['This catalog entry has no verified coordinates on the selected build; record presence and genotype were not assessed.']});
      const effectAllele=r.buildEffectAlleles?.[build]||r.effectAllele;
      const copies=call.status==='Called'?call.alleles.filter(a=>a===effectAllele).length:null;
      return {...r,...call,recordObserved:mapped?calls.has(r.id):null,effectAllele,copies,genotype:call.alleles?.join('/')||'—',rarity:rarity(r.frequency?.value),priorityLabel:PRIORITIES[r.priority],interpretation:copies===null?'Interpretation withheld: '+call.status+'.':copies===0?'Tracked allele not present in this call. This does not exclude other variants or disease.':r.summary};
    });
    const shortReport=shortScanner?.finish({format,build}),scoreReport=scoreScanner?.finish();
    if(scoreReport&&deletionTargets.length){
      const deletionReport=pgsDeletionScanner?.finish();
      scoreReport.results.push(...(deletionReport?.results||deletionTargets.map(t=>({...t,status:format==='VCF'?'Not observed':'Unsupported input',alleles:null,genotype:'—',copies:null,notes:['No usable certified sequencing deletion call; no reference genotype inferred.']}))));
    }
    const blocked=pgsOverlapGuard?.finish()||new Set();
    for(const r of results)if(blocked.has(r.id)&&['Called','Not observed','No call','Quality limited'].includes(r.status)){r.status='Overlapping records';r.copies=null;(r.notes||=[]).push('A passing non-reference or unresolved indel/structural record can overlap this SNP. No haplotype reconstruction or harmless-reference assumption is made.');r.interpretation='Interpretation withheld: overlapping variant representations.';}
    if(shortReport){const block=rows=>{for(const r of rows)if(r.status==='Called'&&shortReport.blockedSNVIds.has(r.id)){r.status='Overlapping records';r.copies=null;r.notes.push('A non-reference or FORMAT-ambiguous indel/structural record overlaps this SNP. Interpretation is withheld without haplotype reconstruction.');r.interpretation='Interpretation withheld: overlapping variant representations.';}};block(results);if(scoreReport)block(scoreReport.results);results.push(...shortReport.results);warnings.add(shortReport.normalizationAccepted?'Short-indel matching uses normalized GRCh38 allele representations. Screening thresholds are not a clinically validated indel assay; overlapping calls are withheld.':'Short-indel matching is unavailable for this input: use the local normalized, unsplit GRCh38 workflow. SNP results remain separate.');}
    for (const r of results) {if(r.clinvar){r.clinicalFindings=clinicalFindings(r,format);if(r.category==='ClinVar review'){r.interpretation='Review the separate allele-specific ClinVar citations below. These selected variants do not constitute a gene screen.';}}r.effectDirection=effectDirection(r);r.directionInterpretation=personalDirection(r,r.effectDirection);}
    const traits=clusterTraits(results).map(({variants,...g})=>({...g,variantIds:variants.map(r=>r.id)}));
    const polygenicScores=scoreReport?calculatePGS(scoreLibrary,scoreReport):[];
    const ancestry=ancestryScanner?estimateAncestry(ancestryScanner.finish(),ancestryReference):null;
    return {ancestry,analysisMethodVersion:ANALYSIS_METHOD_VERSION,shortVariantLibraryVersion:shortReport?.libraryVersion||null,shortVariantNormalizationAccepted:shortReport?.normalizationAccepted??null,format,build,sample:sampleName,catalogVersion:catalog.version,expertAssertionProvenance:catalog.expertAssertionProvenance||null,clinicalLibraryVersion:catalog.clinicalVersion||null,clinicalReleaseDate:catalog.clinicalReleaseDate||null,pharmacogeneticLibraryVersion:catalog.pharmacogeneticVersion||null,researchLibraryVersion:catalog.researchLibraryVersion||null,referenceRetrievedAt:catalog.retrievedAt,analyzedAt:new Date().toISOString(),stats,warnings:[...warnings],results,traits,polygenicScores,scoringTargetCount:scoreLibrary?.targets.length||0};
  }
  return {consume(line){ancestryScanner?.consume(line);scoreScanner?.consume(line);shortScanner?.header(line);consume(line);},finish,stats};
}

export function analyzeText(text,catalog,options={}){const scanner=createScanner(catalog,options);for(const line of text.split(/\r?\n/))scanner.consume(line);return scanner.finish();}
export async function analyzeFile(file,catalog,options={},progress=()=>{}){
  const scanner=createScanner(catalog,options);const stream=await inputStream(file);
  const reader=stream.pipeThrough(new TextDecoderStream()).getReader();let pending='',processed=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;pending+=value;const lines=pending.split('\n');pending=lines.pop();for(const line of lines)scanner.consume(line);processed+=value.length;progress({lines:scanner.stats.lines,processed});if(pending.length>2_000_000)throw Error('A line exceeds the supported size. Check that this is a text genotype file.');}if(pending)scanner.consume(pending);}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  return scanner.finish();
}
