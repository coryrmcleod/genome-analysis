// Verified primary discrepancies, bound to exact score and complete frozen record.
export const PGS_METRIC_REVIEWS=Object.freeze({
  "PGS004285": {
    "id": "PGS004285",
    "fold": 0,
    "terms": 20,
    "evaluation": "PPM020353",
    "AUROC": 0.833604804388662,
    "depositedAUPRC": 0.833604804388662,
    "primaryAUPRC": 0.0416733103250011,
    "primaryAUPRCCell": "Supplementary Figure 4c!E152",
    "conflict": true,
    "originalSha256": "f3b6be57065b05d3f2d0133ddcd0140fb5a723f39521cad76c77efba795cadbc",
    "evaluationSourceSha256": "e1a859a349ea92089e6e9322364190ae063aed6b9926b58b9cbe7bfc8a0a723e",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020353",
      "sampleSet": "PSS011336",
      "endpoint": "Alzheimer's disease",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 437,
          "controls": 66991,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.833604804388662,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.0420988165670099,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.833604804388662,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_alzheimer_s_disease_0",
    "publicationPMID": 38811555
  },
  "PGS004281": {
    "id": "PGS004281",
    "fold": 1,
    "terms": 110,
    "evaluation": "PPM020349",
    "AUROC": 0.818965564821918,
    "depositedAUPRC": 0.818965564821918,
    "primaryAUPRC": 0.075262359411221,
    "primaryAUPRCCell": "Supplementary Figure 4c!E148",
    "conflict": true,
    "originalSha256": "7390385912031a9b16fbefc94e25b5b92b14a98cb094acd6b0855886b1fc0e8d",
    "evaluationSourceSha256": "d32e9c3b83a03e059dcfd055307c73dd0a4b01da9f56397463d90f228b0f1386",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020349",
      "sampleSet": "PSS011345",
      "endpoint": "All-cause dementia",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 1001,
          "controls": 66427,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.818965564821918,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.0341767843321088,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.818965564821918,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_all-cause_dementia_1",
    "publicationPMID": 38811555
  },
  "PGS004282": {
    "id": "PGS004282",
    "fold": 2,
    "terms": 40,
    "evaluation": "PPM020350",
    "AUROC": 0.818370039793557,
    "depositedAUPRC": 0.818370039793557,
    "primaryAUPRC": 0.0748910322494389,
    "primaryAUPRCCell": "Supplementary Figure 4c!E149",
    "conflict": true,
    "originalSha256": "3df4a378aac8c00c6f6ad2f2679ea9bd8bb92e490242bf79d66bf36438c7d22b",
    "evaluationSourceSha256": "010384b510e2c6141446105dcfd24f1bef45a3c902159cf7139cb9385d8781ab",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020350",
      "sampleSet": "PSS011345",
      "endpoint": "All-cause dementia",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 1001,
          "controls": 66427,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.818370039793557,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.033227904739866,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.818370039793557,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_all-cause_dementia_2",
    "publicationPMID": 38811555
  },
  "PGS004284": {
    "id": "PGS004284",
    "fold": 4,
    "terms": 50,
    "evaluation": "PPM020352",
    "AUROC": 0.818864171341326,
    "depositedAUPRC": 0.818864171341326,
    "primaryAUPRC": 0.0767469347904766,
    "primaryAUPRCCell": "Supplementary Figure 4c!E151",
    "conflict": true,
    "originalSha256": "f0b1effde3297a02af69ae3be1e31a6cae548b42a46de56555b2c8be9a224872",
    "evaluationSourceSha256": "bb574f5fcfe83392523105667bc2afc21d8ad72dda0e11c5990f8888a2c77ce2",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020352",
      "sampleSet": "PSS011345",
      "endpoint": "All-cause dementia",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 1001,
          "controls": 66427,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.818864171341326,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.0341516519974033,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.818864171341326,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_all-cause_dementia_4",
    "publicationPMID": 38811555
  },
  "PGS004286": {
    "id": "PGS004286",
    "fold": 1,
    "terms": 10,
    "evaluation": "PPM020354",
    "AUROC": 0.832096831751059,
    "depositedAUPRC": 0.832096831751059,
    "primaryAUPRC": 0.0420020965736942,
    "primaryAUPRCCell": "Supplementary Figure 4c!E153",
    "conflict": true,
    "originalSha256": "42654285c5ffcf76da594683759d7a0578248eda66444cc15fc4a03d740bbcd6",
    "evaluationSourceSha256": "e6a859ff90682e59cd76feba7c5214efe6baecf88c57787e6346c81a271b1186",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020354",
      "sampleSet": "PSS011336",
      "endpoint": "Alzheimer's disease",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 437,
          "controls": 66991,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.832096831751059,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.0401870533697199,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.832096831751059,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_alzheimer_s_disease_1",
    "publicationPMID": 38811555
  },
  "PGS004287": {
    "id": "PGS004287",
    "fold": 2,
    "terms": 30,
    "evaluation": "PPM020355",
    "AUROC": 0.831790820495816,
    "depositedAUPRC": 0.831790820495816,
    "primaryAUPRC": 0.0432237551066991,
    "primaryAUPRCCell": "Supplementary Figure 4c!E154",
    "conflict": true,
    "originalSha256": "f4ec3649508c83377e8651b5000fa5048aab70ae5ee4b627e80ef588ded59d59",
    "evaluationSourceSha256": "e7a0b0b4b8bafa190ee5da526e9d181a72c3241857c0ccf4288349e9ea5eae8f",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020355",
      "sampleSet": "PSS011336",
      "endpoint": "Alzheimer's disease",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 437,
          "controls": 66991,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.831790820495816,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.041820587946436,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.831790820495816,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_alzheimer_s_disease_2",
    "publicationPMID": 38811555
  },
  "PGS004289": {
    "id": "PGS004289",
    "fold": 4,
    "terms": 40,
    "evaluation": "PPM020357",
    "AUROC": 0.831624672285122,
    "depositedAUPRC": 0.831624672285122,
    "primaryAUPRC": 0.0436261449293891,
    "primaryAUPRCCell": "Supplementary Figure 4c!E156",
    "conflict": true,
    "originalSha256": "f07f65bef385c80f47aca283cd7dddb1243676246fb4f077dac11aad471b90a4",
    "evaluationSourceSha256": "b38ba3a9445cb11e393521c043e5af961f0791fd7c50003a3771ccf184d7ba32",
    "primaryWorkbookSha256": "900ce80860129882a4569397f8713fdd7960f46534c3c3e94c3cc89ec52037f1",
    "primaryURL": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11522481/",
    "record": {
      "id": "PPM020357",
      "sampleSet": "PSS011336",
      "endpoint": "Alzheimer's disease",
      "publication": "Ohta R · Nat Commun · 2024-05-29 · PMID 38811555",
      "covariates": "age, sex, PC1-10",
      "comments": "",
      "samples": [
        {
          "count": 67428,
          "cases": 437,
          "controls": 66991,
          "malePercent": 46,
          "age": null,
          "followup": null,
          "ancestry": "European / White British",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.831624672285122,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "Covariate-adjusted pseudo-R2",
          "estimate": 0.040761373980392,
          "lower": null,
          "upper": null,
          "standardError": null
        },
        {
          "name": "AUPRC",
          "estimate": 0.831624672285122,
          "lower": null,
          "upper": null,
          "standardError": null
        }
      ]
    },
    "name": "GenoBoost_alzheimer_s_disease_4",
    "publicationPMID": 38811555
  }
});
