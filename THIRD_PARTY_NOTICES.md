# Third-party notices

The root MIT license applies to project-authored source code and documentation. It does not replace third-party data licenses, attribution requirements, trademarks, or dependency licenses.

## Bundled reference data

See [docs/DATA-LICENSES.md](docs/DATA-LICENSES.md) for provider terms, access dates and the distinction between code and data. Original source URLs, retrieved dates, versions and provenance are retained within each bundled JSON library. The [release inventory](docs/data-rights-audit.json) records the exact SHA-256 of each included snapshot and identifies withheld datasets. It includes no participant genomes or individual-level reference genotype panels.

## Windows runtime

The Windows download bundles Electron 44.3.0 and its Chromium, Node.js and other runtime components. Electron is MIT licensed; the binary distribution includes its upstream `LICENSE.electron.txt` and `LICENSES.chromium.html` files. Keep both files and the runtime's other required supporting files with the application. Their upstream notices govern those components, independently of this project's MIT license.

Development uses electron-builder 26.15.3 (MIT) and transitive tools with their own licenses. `package-lock.json` records exact versions, integrity values and package license metadata where provided. Development packages are installed with `npm ci`; they are not checked into this repository.

## Tools and material not bundled

WSL, Ubuntu, SAMtools, BCFtools, Python, PLINK, zstd and external reference FASTA sequences are not included in the public Windows download. Historical preparation/reference-building source remains available to inspect, but missing data and proof fixtures mean those workflows are not an advertised working feature of this edition. If you install or redistribute those tools independently, their own terms apply.

Publication PDFs, article full text/XML, original PGS scoring files, population genome panels, private inputs, saved analyses and the earlier full-data installer are not part of this public release.

Provider names and citations identify evidence sources; no provider endorsement or logo license is claimed.
