# Public edition scope

The first open-source preview is based on application version 0.14.104. Its public release tag is `v0.14.104-open.1`. It uses a separate Windows application identity so it does not replace the earlier full-data engineering preview.

## Available

- Existing VCF/VCF.GZ and 23andMe/AncestryDNA TXT import, assembly handling and genotype quality screens.
- Variant exploration using the included catalog, ClinVar, CPIC, ClinGen and research association snapshots.
- Short-indel interpretation when input normalization and provenance satisfy the existing checks. Unprepared VCFs retain SNP analysis and explicit indel limitations.
- Source links, explanatory evidence, synthetic demo, saved analyses, exports and report views supported by the available data.
- All project-authored scoring, ancestry, preparation and import implementation source for inspection and further development.

## Unavailable until the required data rights/dependencies are resolved

- Polygenic score calculation and score reference percentiles/scenarios from the full library.
- Broad ancestry mixture and sampled-population similarity estimation.
- Guided CRAM/BAM preparation. Its target definitions and proof fixtures are not all included. Existing normalized VCFs and consumer TXT files are the supported public workflows.
- Rebuilding the exact withheld libraries using only this public repository. Some import/reference tools expect excluded original evidence, source caches, alignment data, large reference panels and additional software. Publishing their code is not a claim that their inputs have been cleared or that the full research pipeline is reproducible from this release alone.

The public app names unavailable reference-based features explicitly. It does not fabricate a replacement panel, relabel partial scores as complete, or alter the owner's original working installation.

## Release checks

`npm test` runs the selected public regression suite. `node scripts/check-public-release.mjs` verifies all nine included data hashes, rejects withheld dataset files and personal-input extensions outside the synthetic demo, and checks required notices. The Windows smoke test opens the packaged UI without a visible window and verifies successful rendering. These checks do not establish clinical accuracy or replace testing on a clean Windows computer.

The preview is unsigned. Clean-machine installer/OS coverage and comprehensive clinical/scientific validation remain incomplete.
