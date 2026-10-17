import {scoreUncertainty} from '../public/score-insights.js';
import {validateAncestryReference} from '../public/ancestry.js';
import {validateSensitivityReference,percentileSensitivity} from '../public/pgs-sensitivity.js';
import {validateScoreReference,referencePercentile} from '../public/pgs-reference.js';
import {validateGeneDosage,geneDosageFor} from '../public/gene-dosage.js';
import {attachExpertAssertions} from '../public/expert-assertions.js';
import {validateGeneDrugs,geneDrugsFor} from '../public/gene-drugs.js';
import {validateGeneValidity,geneValidityFor} from '../public/gene-validity.js';
import {mergeResearchLibrary} from '../public/research-library.js';
// Same interpretation engine as the browser. Personal reports must stay outside this project.
import fs from 'node:fs';import path from 'node:path';import {readFile,writeFile} from 'node:fs/promises';import {createGunzip} from 'node:zlib';import {createInterface} from 'node:readline';import {fileURLToPath} from 'node:url';
import {createScanner} from '../public/engine.js';import {mergeClinicalLibrary} from '../public/clinical.js';import {mergePharmacogeneticLibrary} from '../public/pharmacogenetics.js';import {estimatePGS} from '../public/pgs-estimate.js';import {KEY_GENES,keyGeneSummary} from '../public/key-genes.js';
const [inputArg,outputArg]=process.argv.slice(2);if(!inputArg||!outputArg)throw Error('Supply local VCF(.GZ) and a new report JSON path outside the project.');
const input=path.resolve(inputArg),output=path.resolve(outputArg),root=fileURLToPath(new URL('../',import.meta.url));const relativeOutput=path.relative(root,output);if(!relativeOutput||!relativeOutput.startsWith('..'+path.sep)&&!path.isAbsolute(relativeOutput))throw Error('Personal reports cannot be written into the project or its served files.');
const data=async name=>JSON.parse(await readFile(new URL('../public/data/'+name+'.json',import.meta.url)));
const [base,clinical,cpic,pgsLibrary,rawShortVariantLibrary,populations,research,validity,drugPairs,expert,rawDosage]=await Promise.all(['catalog','clinical-library','cpic-library','pgs-library','short-variant-library','pgs-populations','research-library','gene-validity-library','gene-drug-library','expert-assertion-library','gene-dosage-library'].map(data));
const scoreReference=validateScoreReference(await data('pgs-score-reference'));
const sensitivityReference=validateSensitivityReference(await data('pgs-score-sensitivity'));
const dosage=validateGeneDosage(rawDosage);
const shortVariantLibrary=attachExpertAssertions(rawShortVariantLibrary,expert);
const ancestryReference=validateAncestryReference(await data('ancestry-reference'));
const catalog=mergeResearchLibrary(mergePharmacogeneticLibrary(mergeClinicalLibrary(base,attachExpertAssertions(clinical,expert)),cpic),research),scanner=createScanner(catalog,{pgsLibrary,shortVariantLibrary,ancestryReference});
const source=fs.createReadStream(input),stream=/\.gz$/i.test(input)?source.pipe(createGunzip()):source;let failure;source.on('error',e=>stream.destroy(e));stream.on('error',e=>failure=e);const lines=createInterface({input:stream,crlfDelay:Infinity});stream.on('error',()=>lines.close());let count=0;
for await(const line of lines){scanner.consume(line);if(++count%1000000===0)console.log('Local lines scanned',count);}
if(failure)throw failure;const report=scanner.finish();report.inputFile=path.basename(input);report.syntheticDemo=false;
report.keyGenes=KEY_GENES.map(e=>({...e,...keyGeneSummary(e,report.results),geneDiseaseValidity:geneValidityFor(e.genes,validateGeneValidity(validity)),geneDrugReferences:geneDrugsFor(e.genes,validateGeneDrugs(drugPairs)),geneCopyEvidence:geneDosageFor(e.genes,dosage)}));for(const m of report.polygenicScores){m.hypotheticalEstimate=estimatePGS(m,populations,'EUR');m.referenceComparison=referencePercentile(m,m.hypotheticalEstimate,scoreReference,'EUR');m.referenceSensitivity=percentileSensitivity(m,m.hypotheticalEstimate,sensitivityReference,'EUR');m.uncertainty=scoreUncertainty(m);m.percentile=m.referenceComparison.measured?m.referenceComparison.point:null;m.percentileReason=m.referenceComparison.reason;m.hypotheticalEstimate.percentile=m.referenceComparison.measured?null:m.referenceComparison.point;m.hypotheticalEstimate.percentileReason=m.referenceComparison.reason;}
report.geneContextLibraries={clingen:{version:validity.version,sourceURL:validity.sourceURL,sourceSha256:validity.sourceSha256,releaseDate:validity.releaseDate},cpic:{version:drugPairs.version,sourceURL:drugPairs.sourceURL,sourceSha256:drugPairs.sourceSha256,retrievedAt:drugPairs.retrievedAt},dosage:{version:dosage.version,sourceURL:dosage.sourceURL,sourceSha256:dosage.sourceSha256,releaseDate:dosage.releaseDate}};
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const indels=report.results.filter(r=>r.variantKind==='short-indel');console.log(JSON.stringify({report:output,recordsScanned:report.stats.records,interpretationEntries:report.results.length,called:report.results.filter(r=>r.status==='Called').length,shortIndelStatuses:indels.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),normalizationAccepted:report.shortVariantNormalizationAccepted,scoreModels:report.polygenicScores.length,completeScores:report.polygenicScores.filter(s=>s.rawSum!==null).length}));
