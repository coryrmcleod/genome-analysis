# Data terms and source attribution

Provider terms checked on October 17, 2026. This is a release inventory, not a guarantee about all future upstream data or an author-by-author permissions clearance. The project's MIT license does not apply to third-party data.

## Included snapshots

| Files in `public/data/` | Source and terms | Attribution |
| --- | --- | --- |
| `catalog.json` | Project-authored explanatory catalog with cited variant facts and Ensembl reference annotations. Ensembl-generated data have no use restrictions; upstream third-party constraints remain applicable. [Ensembl policy](https://www.ensembl.org/info/about/legal/disclaimer.html), [Ensembl export guidance](https://static.ensembl.org/info/data/export.html). | Preserve per-record source citations, frequency provenance and snapshot date. No GeneReviews/article full text is bundled. |
| `clinical-library.json`, `short-variant-library.json` | ClinVar variant-level data. ClinVar states that submitted data are available for unrestricted distribution. [ClinVar submission policy](https://www.ncbi.nlm.nih.gov/clinvar/docs/submit/), [NCBI policies](https://www.ncbi.nlm.nih.gov/home/about/policies/). Normalization metadata are locally derived; the source FASTA is not bundled. | ClinVar variation URLs, source releases and hashes remain in the files. |
| `cpic-library.json`, `gene-drug-library.json` | CPIC curated data, CC0 1.0. [CPIC data license and terms](https://github.com/cpicpgx/cpic-data/blob/main/LICENSE.md). | CPIC; primary source [ClinPGx](https://www.clinpgx.org/). Preserve each API URL, downloaded version, access date and relevant publication. CPIC content changes; consult current guidelines. No CPIC logo is bundled. |
| `gene-validity-library.json`, `gene-dosage-library.json`, `expert-assertion-library.json` | ClinGen curated content, CC0 1.0. [ClinGen terms](https://clinicalgenome.org/docs/terms-of-use/). | The gene-disease validity, gene dosage and expert assertions were obtained from the Clinical Genome Resource. Preserve access dates and URLs recorded in the snapshots. No ClinGen logo is bundled. |
| `research-library.json` | NHGRI-EBI GWAS Catalog association metadata through Ensembl and PubMed bibliographic metadata. [GWAS Catalog terms](https://www.ebi.ac.uk/gwas/docs/faq/), [NCBI policies](https://www.ncbi.nlm.nih.gov/home/about/policies/). This snapshot contains association records and citations, not full summary-statistics files or article full text. | NHGRI-EBI GWAS Catalog, Ensembl and original papers identified in the records. Preserve PMID/DOI links, harmonization caveats, access dates and hashes. |

Each dataset's precise version, retrieved timestamp, file hash and release decision is listed in [data-rights-audit.json](data-rights-audit.json). The JSON files retain more detailed per-record provenance. No blanket claim that all third-party content is MIT licensed is made.

## Data withheld from the public edition

- **All 354 PGS models and their supporting score/population/evaluation snapshots.** The local inventory has three explicit CC BY-NC-ND 4.0 notices: PGS000824, PGS000827 and PGS000828. Another 351 carry the Catalog's notice requiring compliance with original authors' restrictions. A generic Catalog notice is not author-specific redistribution permission. See the [PGS Catalog policy](https://www.pgscatalog.org/about/) and the per-model inventory in `data-rights-audit.json`.
- **Ancestry reference and associated numerical-verification snapshot.** These combine HGDP, 1000 Genomes and assembly mapping evidence; source-specific terms and downstream aggregation/redistribution need a separate completed review.
- **Original scoring files, article XML/PDF/full text, and population genotype/proof fixtures.** These are not automatically covered by the software license. The public regression suite uses independently authored synthetic examples and the included public variant metadata.

Withholding a file is a release decision while review remains incomplete, not a claim that its provider prohibits all use. The original full-data desktop package is not offered as a public download because it includes these materials.

Restoring a feature requires verifying all of its exact source datasets and dependencies, keeping citations and license notices, and rerunning the relevant complete-model/reference tests. Do not replace a complete score with a subset or infer missing genotype calls to work around missing data.
