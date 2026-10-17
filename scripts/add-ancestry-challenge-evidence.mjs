// Attach verified public validation evidence without changing the ancestry model.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateAncestryReference} from '../public/ancestry.js';
import {validateAncestryChallenges} from '../public/ancestry-challenges.js';
const root=new URL('../',import.meta.url),target=new URL('public/data/ancestry-reference.json',root);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const original=await readFile(target),panel=validateAncestryReference(JSON.parse(original));
const stress=JSON.parse(await readFile(new URL('work/ancestry-stress-2026-10-01.json',root)));
const browserBytes=await readFile(new URL('work/ancestry-stress-browser-verification-2026-10-01.json',root)),browser=JSON.parse(browserBytes);
if(stress.referenceSha256!==hash(original)||browser.referenceSha256!==hash(original)||stress.frequencyReproductionExact!==true||browser.checks.length!==5||browser.checks.some(r=>r.maximumFractionDifference>2e-7||!r.passesGates))throw Error('Challenge evidence is not verified against the current reference');
const unchanged=JSON.stringify({groups:panel.groups,populations:panel.populations,markers:panel.markers,residualLimit:panel.residualLimit,minimumCoverage:panel.minimumCoverage,minimumMarkers:panel.minimumMarkers,minimumChromosomes:panel.minimumChromosomes,minimumReferenceHomozygoteFraction:panel.minimumReferenceHomozygoteFraction,sources:panel.sources});
panel.validation.referenceChallenges=validateAncestryChallenges({kind:'ancestry-reference-challenges',version:1,evaluatedAt:new Date().toISOString(),testedReferenceSha256:stress.referenceSha256,publicGenotypesSha256:stress.publicGenotypesSha256,browserVerificationSha256:hash(browserBytes),browserVerifiedCases:browser.checks.length,frequencyReproductionExact:true,heldOutSamples:stress.heldOutSamples,populationExcluded:stress.populationExcluded,populationExcludedByGroup:stress.populationExcludedByGroup,missingness:stress.missingness,limitations:stress.limitations});
panel.version='1.0.1';validateAncestryReference(panel);
if(unchanged!==JSON.stringify({groups:panel.groups,populations:panel.populations,markers:panel.markers,residualLimit:panel.residualLimit,minimumCoverage:panel.minimumCoverage,minimumMarkers:panel.minimumMarkers,minimumChromosomes:panel.minimumChromosomes,minimumReferenceHomozygoteFraction:panel.minimumReferenceHomozygoteFraction,sources:panel.sources}))throw Error('Challenge attachment changed model or admission gates');
await copyFile(target,new URL('work/ancestry-reference-before-challenges-2026-10-01.json',root));
await writeFile(target,JSON.stringify(panel)+'\n');
console.log(JSON.stringify({version:panel.version,referenceSha256:hash(await readFile(target)),modelAndGatesUnchanged:true,publicHeldOutIndividuals:stress.populationExcluded.count,browserVerifiedCases:browser.checks.length}));
