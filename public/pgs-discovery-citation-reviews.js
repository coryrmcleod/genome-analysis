// Exact deposited discovery context and independently verified citation evidence.
export const PGS_DISCOVERY_CITATION_REVIEWS=[
  {
    "id": "PGS003310",
    "name": "ExPRSweb_CysC_eGFRcys-overall-EA_PT_UKB_20211120",
    "terms": 6,
    "publicationPMID": 36152628,
    "originalSha256": "a47f37b3a8040a59a9a8fef412e6285e32f2df1646f4fc9419a333986a110be4",
    "metadataSha256": "6e1dbf7879afbaba725e4435bad5a47e4b7d58ebe0f9171cd960f7c5ddb32a4e",
    "studySamples": {
      "variantAssociation": [
        {
          "sample_number": 32861,
          "sample_cases": null,
          "sample_controls": null,
          "sample_percent_male": null,
          "sample_age": null,
          "phenotyping_free": "Cystatin C; eGFRcys-overall-EA",
          "followup_time": null,
          "ancestry_broad": "European",
          "ancestry_free": null,
          "ancestry_country": null,
          "ancestry_additional": null,
          "source_GWAS_catalog": null,
          "source_PMID": 28932557,
          "source_DOI": null,
          "cohorts": [],
          "cohorts_additional": null
        }
      ],
      "training": [
        {
          "sample_number": 195101,
          "sample_cases": null,
          "sample_controls": null,
          "sample_percent_male": null,
          "sample_age": null,
          "phenotyping_free": "Field ID: 30720; Quantitative",
          "followup_time": null,
          "ancestry_broad": "European",
          "ancestry_free": null,
          "ancestry_country": null,
          "ancestry_additional": null,
          "source_GWAS_catalog": null,
          "source_PMID": null,
          "source_DOI": null,
          "cohorts": [
            {
              "name_short": "UKB",
              "name_full": "UK Biobank",
              "name_others": null
            }
          ],
          "cohorts_additional": null
        }
      ]
    },
    "development": {
      "metadataSource": {
        "url": "https://www.pgscatalog.org/rest/score/PGS003310",
        "sha256": "6e1dbf7879afbaba725e4435bad5a47e4b7d58ebe0f9171cd960f7c5ddb32a4e"
      },
      "phenotypes": [
        {
          "stage": "Variant-association discovery",
          "definition": "Cystatin C; eGFRcys-overall-EA"
        },
        {
          "stage": "Score development/training",
          "definition": "Field ID: 30720; Quantitative"
        }
      ]
    },
    "depositedPMID": 28932557,
    "datasetPMID": 27920155,
    "datasetURL": "https://ckdgen.imbi.uni-freiburg.de/datasets/li-et-al-2017/",
    "sourceProofs": [
      {
        "url": "https://ckdgen.imbi.uni-freiburg.de/datasets/li-et-al-2017/",
        "destination": "work/remaining-small-definitions-2026-10-02/ckdgen-Li2017.html",
        "sha256": "156bdb0d88031fa83084fd6a823fdbe3c6dc9537a38034d2f10ab2b0cb135510",
        "bytes": 21161
      },
      {
        "url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:27920155%20AND%20SRC:MED&format=json",
        "destination": "work/remaining-small-definitions-2026-10-02/PMID27920155.json",
        "sha256": "878ac1faa8b258288f536fb59c39b2a548eb84ed188038983e0c6d58b2365b85",
        "bytes": 2933
      },
      {
        "url": "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:28932557%20AND%20SRC:MED&format=json",
        "destination": "work/remaining-small-definitions-2026-10-02/PMID28932557.json",
        "sha256": "35cc2f587b6c565a284e3b483cf15ac2e7795ada55e06baafe0b59fb62863464",
        "bytes": 1127
      }
    ]
  }
];
