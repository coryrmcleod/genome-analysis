export const PGS_CHOLELITHIASIS_REVIEWS = [
  {
    "id": "PGS012582",
    "terms": 13,
    "originalSha256": "32cb07aafb7c7e14a3ee6e479253af05ee2d6326b1e892b1b6c19a8b16a2c885",
    "metadataSha256": "1affcaa7e18ff7cce2c032041878d95d4518821d94550500d6d62c24bd1e1f1e",
    "sources": [
      {
        "url": "https://www.pgscatalog.org/rest/performance/search?pgs_id=PGS012582",
        "sha256": "9e7aa2c7fb2fecb39f692fb6a7f429f8912652daceceb9c120e5649301aaaa6c"
      }
    ],
    "record": {
      "id": "PPM030739",
      "sampleSet": "PSS012273",
      "endpoint": "cholelithiasis",
      "publication": "Mi N \u00b7 Prev Med \u00b7 2024-03-27 \u00b7 PMID 38548025",
      "covariates": "age, sex, UK Biobank assessment centers, and additionally adjusted for index of multiple deprivation, overall health rating, long-standing illness, obesity, dyslipidemia for triglycerides, dyslipidemia for high-density lipoprotein cholesterol, hypertension, hyperglycemia, multivitamin use, mineral use, aspirin use, non-steroidal anti-inflammatory drugs use, statin use,  proton pump inhibitors use, lifestyle factors (diet, smoking, alcohol consumption, coffee consumption, physical activity and body weight)",
      "comments": "",
      "samples": [
        {
          "count": 317640,
          "cases": 11017,
          "controls": 306623,
          "malePercent": 48.1,
          "age": {
            "estimate_type": "mean",
            "estimate": 56.7,
            "variability_type": "sd",
            "variability": 7.97,
            "unit": "years"
          },
          "followup": {
            "estimate_type": "median",
            "estimate": 12.7,
            "unit": "years"
          },
          "ancestry": "European",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Hazard ratio (HR, high vs low tertile)",
          "estimate": 1.24,
          "lower": 1.16,
          "upper": 1.32,
          "standardError": null
        }
      ]
    },
    "comparisonLabelConflicts": true,
    "primaryComparison": "Highest PRS quintile versus lowest PRS quintile; intermediate quintiles 2\u20134 are a separate group."
  },
  {
    "id": "PGS012582",
    "terms": 13,
    "originalSha256": "32cb07aafb7c7e14a3ee6e479253af05ee2d6326b1e892b1b6c19a8b16a2c885",
    "metadataSha256": "1affcaa7e18ff7cce2c032041878d95d4518821d94550500d6d62c24bd1e1f1e",
    "sources": [
      {
        "url": "https://www.pgscatalog.org/rest/performance/search?pgs_id=PGS012582",
        "sha256": "9e7aa2c7fb2fecb39f692fb6a7f429f8912652daceceb9c120e5649301aaaa6c"
      }
    ],
    "record": {
      "id": "PPM030740",
      "sampleSet": "PSS012273",
      "endpoint": "cholelithiasis x lifestyle interaction",
      "publication": "Mi N \u00b7 Prev Med \u00b7 2024-03-27 \u00b7 PMID 38548025",
      "covariates": "cerides, dyslipidemia for high-density lipoprotein cholesterol, hypertension, hyperglycemia, multivitamin use, mineral use, aspirin use, non-steroidal anti-inflammatory drugs use, statin use and proton pump inhibitors use",
      "comments": "",
      "samples": [
        {
          "count": 317640,
          "cases": 11017,
          "controls": 306623,
          "malePercent": 48.1,
          "age": {
            "estimate_type": "mean",
            "estimate": 56.7,
            "variability_type": "sd",
            "variability": 7.97,
            "unit": "years"
          },
          "followup": {
            "estimate_type": "median",
            "estimate": 12.7,
            "unit": "years"
          },
          "ancestry": "European",
          "country": "UK",
          "populationDetails": "",
          "cohort": "UKB",
          "phenotyping": ""
        }
      ],
      "metrics": [
        {
          "name": "Hazard ratio (HR, unfavorable lifestyle and high PRS vs. favorable lifestyle and low PRS)",
          "estimate": 1.98,
          "lower": 1.67,
          "upper": 2.35,
          "standardError": null
        }
      ]
    },
    "comparisonLabelConflicts": false,
    "primaryComparison": "High genetic risk and unfavorable lifestyle versus low genetic risk and favorable lifestyle. Genetic groups are quintile 5 versus quintile 1."
  }
];
