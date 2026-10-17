export const PGS_OSA_DISCOVERY_REVIEWS = [
  {
    "id": "PGS012520",
    "completeModel": {
      "coordinateSource": false,
      "id": "PGS012520",
      "name": "OSA_bmi_unadj",
      "trait": "Obstructive sleep apnea",
      "family": "Obstructive sleep apnea",
      "variantCount": 17,
      "weightType": "log(OR)",
      "sourceWeightType": "log(OR)",
      "weightEvidence": null,
      "effectType": "additive",
      "method": "Pruning and Thresholding (P+T)",
      "methodParameters": "Polygenic score constructed using clumping and thresholding (P+T) with genome-wide significant variants derived from Million Veteran Program GWAS summary statistics for obstructive sleep apnea",
      "publication": {
        "id": "PGP000786",
        "title": "Admixture-informed polygenic risk reporting using the ePRS framework.",
        "doi": "10.1038/s41467-026-72457-x",
        "PMID": 42062286,
        "journal": "Nat Commun",
        "firstauthor": "Huang YJ",
        "date_publication": "2026-04-30"
      },
      "ancestry": {
        "eval": {
          "dist": {
            "MAE": 100
          },
          "count": 1,
          "multi": [
            "MAE_EUR",
            "MAE_AFR",
            "MAE_AMR",
            "MAE_ASN"
          ]
        },
        "gwas": {
          "dist": {
            "NR": 0.1,
            "AFR": 11.8,
            "AMR": 5,
            "ASN": 0.9,
            "EUR": 82.1
          },
          "count": 916696
        }
      },
      "studySamples": {
        "variantAssociation": [
          {
            "sample_number": 108468,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "African unspecified",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274865",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              },
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 8081,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Asian unspecified",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274865",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              },
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 752959,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "European",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274865",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              },
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 45896,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Hispanic or Latin American",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274865",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              },
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 1292,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Not reported",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274865",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              },
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          }
        ],
        "training": []
      },
      "license": "PGS obtained from the Catalog should be cited appropriately, and used in accordance with any licensing restrictions set by the authors. See EBI Terms of Use (https://www.ebi.ac.uk/about/terms-of-use/) for additional details.",
      "catalogURL": "https://www.pgscatalog.org/score/PGS012520/",
      "sourceFiles": {
        "metadata": {
          "url": "https://www.pgscatalog.org/rest/score/PGS012520",
          "sha256": "2f9fcc5ea0a8cb98a41aa2f6f1edce482c83eb8f282c181fd17992e1b76ca5d4"
        },
        "original": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012520/ScoringFiles/PGS012520.txt.gz",
          "sha256": "fb7bc96be7bd9cf168f86968037281701eab11198e0f00cfa0f2f00c1508fb49"
        },
        "GRCh37": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012520/ScoringFiles/Harmonized/PGS012520_hmPOS_GRCh37.txt.gz",
          "sha256": "5a8c1499f140a9daaf1d23213535b30278202abe457f5fec2b4a6a98839cb9e7",
          "harmonizedAt": "2026-06-14"
        },
        "GRCh38": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012520/ScoringFiles/Harmonized/PGS012520_hmPOS_GRCh38.txt.gz",
          "sha256": "21888b82894afc314f966d52c323b8e1de8b24f39e96f1faa0643152b608edaf",
          "harmonizedAt": "2026-06-14"
        }
      },
      "variants": [
        {
          "id": "rs17367240",
          "sourceId": "rs17367240",
          "effectAllele": "A",
          "otherAllele": "G",
          "alleleMode": "explicit-pair",
          "weight": -0.03307293,
          "weightText": "-0.03307293",
          "locus": "rs17367240",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "G",
          "reverseComplemented": false
        },
        {
          "id": "rs11691026",
          "sourceId": "rs11691026",
          "effectAllele": "A",
          "otherAllele": "G",
          "alleleMode": "explicit-pair",
          "weight": 0.031254451,
          "weightText": "0.031254451",
          "locus": "rs11691026",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "G",
          "reverseComplemented": false
        },
        {
          "id": "rs77881454",
          "sourceId": "rs77881454",
          "effectAllele": "T",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": 0.05298042,
          "weightText": "0.05298042",
          "locus": "rs77881454",
          "sourceEffectAllele": "T",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        },
        {
          "id": "rs540606",
          "sourceId": "rs540606",
          "effectAllele": "A",
          "otherAllele": "G",
          "alleleMode": "explicit-pair",
          "weight": 0.034080602,
          "weightText": "0.034080602",
          "locus": "rs540606",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "G",
          "reverseComplemented": false
        },
        {
          "id": "rs58857776",
          "sourceId": "rs58857776",
          "effectAllele": "T",
          "otherAllele": "C",
          "alleleMode": "explicit-pair",
          "weight": -0.038112128,
          "weightText": "-0.038112128",
          "locus": "rs58857776",
          "sourceEffectAllele": "T",
          "sourceOtherAllele": "C",
          "reverseComplemented": false
        },
        {
          "id": "rs181355045",
          "sourceId": "rs181355045",
          "effectAllele": "A",
          "otherAllele": "C",
          "alleleMode": "explicit-pair",
          "weight": 0.045176022,
          "weightText": "0.045176022",
          "locus": "rs181355045",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "C",
          "reverseComplemented": false
        },
        {
          "id": "rs869400",
          "sourceId": "rs869400",
          "effectAllele": "T",
          "otherAllele": "G",
          "alleleMode": "explicit-pair",
          "weight": -0.051310137,
          "weightText": "-0.051310137",
          "locus": "rs869400",
          "sourceEffectAllele": "T",
          "sourceOtherAllele": "G",
          "reverseComplemented": false
        },
        {
          "id": "rs10938397",
          "sourceId": "rs10938397",
          "effectAllele": "G",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": 0.031435681,
          "weightText": "0.031435681",
          "locus": "rs10938397",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        },
        {
          "id": "rs13107325",
          "sourceId": "rs13107325",
          "effectAllele": "T",
          "otherAllele": "C",
          "alleleMode": "explicit-pair",
          "weight": 0.081887774,
          "weightText": "0.081887774",
          "locus": "rs13107325",
          "sourceEffectAllele": "T",
          "sourceOtherAllele": "C",
          "reverseComplemented": false
        },
        {
          "id": "rs5015933",
          "sourceId": "rs5015933",
          "effectAllele": "C",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": -0.030804628,
          "weightText": "-0.030804628",
          "locus": "rs5015933",
          "sourceEffectAllele": "C",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs34872471",
          "sourceId": "rs34872471",
          "effectAllele": "C",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": -0.033575398,
          "weightText": "-0.033575398",
          "locus": "rs34872471",
          "sourceEffectAllele": "C",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs2277339",
          "sourceId": "rs2277339",
          "effectAllele": "G",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": -0.046917618,
          "weightText": "-0.046917618",
          "locus": "rs2277339",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs201770",
          "sourceId": "rs201770",
          "effectAllele": "G",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": -0.035589873,
          "weightText": "-0.035589873",
          "locus": "rs201770",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        },
        {
          "id": "rs283789",
          "sourceId": "rs283789",
          "effectAllele": "G",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": -0.030027342,
          "weightText": "-0.030027342",
          "locus": "rs283789",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        },
        {
          "id": "rs1558902",
          "sourceId": "rs1558902",
          "effectAllele": "A",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": 0.079966705,
          "weightText": "0.079966705",
          "locus": "rs1558902",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs58879558",
          "sourceId": "rs58879558",
          "effectAllele": "C",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": 0.039584109,
          "weightText": "0.039584109",
          "locus": "rs58879558",
          "sourceEffectAllele": "C",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs429358",
          "sourceId": "rs429358",
          "effectAllele": "C",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": -0.04654773,
          "weightText": "-0.04654773",
          "locus": "rs429358",
          "sourceEffectAllele": "C",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        }
      ]
    },
    "development": {
      "metadataSource": {
        "url": "https://www.pgscatalog.org/rest/score/PGS012520",
        "sha256": "2f9fcc5ea0a8cb98a41aa2f6f1edce482c83eb8f282c181fd17992e1b76ca5d4"
      },
      "phenotypes": []
    },
    "originalSha256": "fb7bc96be7bd9cf168f86968037281701eab11198e0f00cfa0f2f00c1508fb49",
    "MVPStudyN": 568576,
    "depositedDiscoveryN": 916696,
    "allTermsCompatibleAtPublishedORPrecision": true,
    "unresolvedSupplementaryDirectionDifferences": []
  },
  {
    "id": "PGS012521",
    "completeModel": {
      "coordinateSource": false,
      "coverageContext": "Complete six-variant obstructive-sleep-apnea research score derived from a BMI-adjusted Million Veteran Program GWAS. It is the deposited base genetic score used in the ePRS paper, not that paper's ancestry-conditioned expected score, residual score, or admixture-calibrated reporting framework. Study outcomes included measured moderate/severe apnea and self-reported diagnosis across cohorts. This raw sum is not a sleep study, symptom assessment, apnea diagnosis, or personal disease probability.",
      "id": "PGS012521",
      "name": "OSA_bmi_adj",
      "trait": "Obstructive sleep apnea (adjusted for BMI)",
      "family": "Obstructive sleep apnea",
      "variantCount": 6,
      "weightType": "log(OR)",
      "sourceWeightType": "log(OR)",
      "weightEvidence": null,
      "effectType": "additive",
      "method": "Pruning and Thresholding (P+T)",
      "methodParameters": "Polygenic score constructed using clumping and thresholding (P+T) with genome-wide significant variants derived from Million Veteran Program GWAS summary statistics for obstructive sleep apnea The underlying GWAS analysis included body mass index (BMI) as an adjustment covariate.",
      "publication": {
        "id": "PGP000786",
        "title": "Admixture-informed polygenic risk reporting using the ePRS framework.",
        "doi": "10.1038/s41467-026-72457-x",
        "PMID": 42062286,
        "journal": "Nat Commun",
        "firstauthor": "Huang YJ",
        "date_publication": "2026-04-30"
      },
      "ancestry": {
        "eval": {
          "dist": {
            "MAE": 100
          },
          "count": 1,
          "multi": [
            "MAE_EUR",
            "MAE_AFR",
            "MAE_AMR",
            "MAE_ASN"
          ]
        },
        "gwas": {
          "dist": {
            "NR": 0.1,
            "AFR": 11.8,
            "AMR": 5,
            "ASN": 0.9,
            "EUR": 82.1
          },
          "count": 916696
        }
      },
      "studySamples": {
        "variantAssociation": [
          {
            "sample_number": 108468,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "African unspecified",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274866",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              },
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 8081,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Asian unspecified",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274866",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              },
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 752959,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "European",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274866",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              },
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 45896,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Hispanic or Latin American",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274866",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              },
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          },
          {
            "sample_number": 1292,
            "sample_cases": null,
            "sample_controls": null,
            "sample_percent_male": null,
            "sample_age": null,
            "phenotyping_free": null,
            "followup_time": null,
            "ancestry_broad": "Not reported",
            "ancestry_free": null,
            "ancestry_country": "U.S.",
            "ancestry_additional": null,
            "source_GWAS_catalog": "GCST90274866",
            "source_PMID": 36989840,
            "source_DOI": null,
            "cohorts": [
              {
                "name_short": "MGBB",
                "name_full": "Mass General Brigham Biobank",
                "name_others": null
              },
              {
                "name_short": "MVP",
                "name_full": "Million Veteran Program",
                "name_others": null
              },
              {
                "name_short": "FinnGen",
                "name_full": "FinnGen Biobank",
                "name_others": null
              }
            ],
            "cohorts_additional": null
          }
        ],
        "training": []
      },
      "license": "PGS obtained from the Catalog should be cited appropriately, and used in accordance with any licensing restrictions set by the authors. See EBI Terms of Use (https://www.ebi.ac.uk/about/terms-of-use/) for additional details.",
      "catalogURL": "https://www.pgscatalog.org/score/PGS012521/",
      "sourceFiles": {
        "metadata": {
          "url": "https://www.pgscatalog.org/rest/score/PGS012521",
          "sha256": "84f6d215f1167cd9c67a4a5741102508c84f736116264b1deeb1a7c028b1b24c"
        },
        "original": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012521/ScoringFiles/PGS012521.txt.gz",
          "sha256": "43ecb6c3ab00dae1847ac082b300c1e11cd8473388545cf3e763c9df892c5318"
        },
        "GRCh37": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012521/ScoringFiles/Harmonized/PGS012521_hmPOS_GRCh37.txt.gz",
          "sha256": "48ec4cf18b00383ce503c8e75a3d5bf10905699ef551a68cdc2b42f5a45b7ea0",
          "harmonizedAt": "2026-06-14"
        },
        "GRCh38": {
          "url": "https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/PGS012521/ScoringFiles/Harmonized/PGS012521_hmPOS_GRCh38.txt.gz",
          "sha256": "59dd8a1303fa680f4ff734b62ae4ea041d58d7bca0bb6f3ceb2fa33223ac20ec",
          "harmonizedAt": "2026-06-14"
        }
      },
      "variants": [
        {
          "id": "rs79950770",
          "sourceId": "rs79950770",
          "effectAllele": "T",
          "otherAllele": "C",
          "alleleMode": "explicit-pair",
          "weight": 0.059833721,
          "weightText": "0.059833721",
          "locus": "rs79950770",
          "sourceEffectAllele": "T",
          "sourceOtherAllele": "C",
          "reverseComplemented": false
        },
        {
          "id": "rs72618639",
          "sourceId": "rs72618639",
          "effectAllele": "G",
          "otherAllele": "C",
          "alleleMode": "explicit-pair",
          "weight": -0.126023646,
          "weightText": "-0.126023646",
          "locus": "rs72618639",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "C",
          "reverseComplemented": false
        },
        {
          "id": "rs34179442",
          "sourceId": "rs34179442",
          "effectAllele": "A",
          "otherAllele": "G",
          "alleleMode": "explicit-pair",
          "weight": -0.034156757,
          "weightText": "-0.034156757",
          "locus": "rs34179442",
          "sourceEffectAllele": "A",
          "sourceOtherAllele": "G",
          "reverseComplemented": false
        },
        {
          "id": "rs2277339",
          "sourceId": "rs2277339",
          "effectAllele": "G",
          "otherAllele": "T",
          "alleleMode": "explicit-pair",
          "weight": -0.045438886,
          "weightText": "-0.045438886",
          "locus": "rs2277339",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "T",
          "reverseComplemented": false
        },
        {
          "id": "rs592333",
          "sourceId": "rs592333",
          "effectAllele": "G",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": 0.032509784,
          "weightText": "0.032509784",
          "locus": "rs592333",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        },
        {
          "id": "rs4886823",
          "sourceId": "rs4886823",
          "effectAllele": "G",
          "otherAllele": "A",
          "alleleMode": "explicit-pair",
          "weight": -0.036267797,
          "weightText": "-0.036267797",
          "locus": "rs4886823",
          "sourceEffectAllele": "G",
          "sourceOtherAllele": "A",
          "reverseComplemented": false
        }
      ],
      "matchesPublication": true
    },
    "development": {
      "metadataSource": {
        "url": "https://www.pgscatalog.org/rest/score/PGS012521",
        "sha256": "84f6d215f1167cd9c67a4a5741102508c84f736116264b1deeb1a7c028b1b24c"
      },
      "phenotypes": []
    },
    "originalSha256": "43ecb6c3ab00dae1847ac082b300c1e11cd8473388545cf3e763c9df892c5318",
    "MVPStudyN": 568576,
    "depositedDiscoveryN": 916696,
    "allTermsCompatibleAtPublishedORPrecision": false,
    "unresolvedSupplementaryDirectionDifferences": [
      "rs34179442",
      "rs592333"
    ]
  }
];
