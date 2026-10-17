// Exact primary covariate-adjusted AUC scope; deposited metrics remain intact.
export const PGS_ADJUSTED_AUC_REVIEWS=Object.freeze([
  {
    "id": "PGS003025",
    "terms": 9,
    "originalSha256": "986af362519c723c3a591fdb525d3d30926a76f68ff463d1d62bb4d1d01f3ac4",
    "evaluationSourceSha256": "4a1fb0b7934cac62a3c7e409eef4dc7947597c609459b1c5b88f7b56188adf96",
    "record": {
      "id": "PPM015906",
      "sampleSet": "PSS010030",
      "endpoint": "Hypertension",
      "publication": "Ma Y · Am J Hum Genet · 2022-09-23 · PMID 36152628",
      "covariates": "Sex,birthYear,genotyping.array,PC1,PC2,PC3,PC4",
      "comments": "",
      "samples": [
        {
          "count": 203639,
          "cases": 38801,
          "controls": 164838,
          "malePercent": null,
          "age": null,
          "followup": null,
          "ancestry": "European",
          "country": "",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": "PheCode 401.1 (http://phewascatalog.org/); Binary"
        }
      ],
      "metrics": [
        {
          "name": "Odds Ratio",
          "estimate": 0.991,
          "lower": 0.98,
          "upper": 1.002,
          "standardError": null
        },
        {
          "name": "Beta",
          "estimate": -0.00913,
          "lower": null,
          "upper": null,
          "standardError": 0.00587
        },
        {
          "name": "Area Under the Receiver-Operating Characteristic Curve",
          "estimate": 0.504,
          "lower": 0.501,
          "upper": 0.507,
          "standardError": null
        }
      ]
    },
    "primaryPDFSHA256": "ddc8ec02ebae335940656304fa313f51c8a7e71c1e77d2854eaec5060e9c9771",
    "authorTableSHA256": "57fbb0b5cf133f56b5dadbe7654564e756b1d247616191d855e131ac73061d08",
    "primaryAAUC": 0.504,
    "primaryInterval": "0.501-0.507",
    "primaryURL": "https://csg.sph.umich.edu/larsf/exprsweb/manuscripts/Ma-et-al-2022-AJHG-ExPRSweb.pdf",
    "primaryPages": "5–6",
    "authorRowID": "exprsweb-hypertension-finngen-r4-i9-pt-ukb-20211120"
  }
]);
