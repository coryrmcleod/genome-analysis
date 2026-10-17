# Genome Analysis

A local genome variant explorer for VCF, VCF.GZ, 23andMe TXT and AncestryDNA TXT files. Processing stays on your computer. There is no account, genome upload endpoint or telemetry service.

**This is an unsigned research preview, not a diagnostic test.** A variant finding does not establish a diagnosis, medication response or treatment recommendation. Missing calls do not establish a normal result.

## Download and run on Windows

Download the Windows x64 portable ZIP or installer from [Releases](https://github.com/coryrmcleod/genome-analysis/releases). The portable ZIP works on Intel/AMD 64-bit Windows PCs; it is not a macOS, Linux or Windows ARM package.

1. Extract the **entire ZIP** to a folder on your computer or flash drive.
2. Double-click **Start Genome Analysis.cmd**. Keep its `Application` folder intact and keep the flash drive connected while running from it.
3. Choose your own supported genetic data file, select the assembly if needed, and choose **Analyze locally**. Extract consumer ZIP downloads first. To try synthetic data, choose the supplied `Examples/synthetic-demo.vcf` file in the portable download (or `public/synthetic-demo.vcf` in a source checkout).

The installer is an alternative to the portable folder; you do not need both. Windows may show an unknown-publisher warning because the preview is unsigned. No separate Node.js or Python installation is required to use the Windows download. Ordinary analysis uses the bundled references offline; visiting evidence links uses the internet.

## What this public edition includes

This first public edition includes the variant explorer, clinical variant and short-indel references, pharmacogenetic component context, gene-disease and dosage context, research associations, saving/reopening analyses and source links. Reference snapshots are dated and do not update automatically.

**Polygenic scores, their population comparisons, and ancestry estimates are unavailable in this edition.** The scoring and ancestry implementation is included as source, but the supporting reference data are held pending source-specific redistribution review. Guided CRAM/BAM preparation is also unavailable in the public app because its target/reference dependencies are incomplete. Import an existing supported VCF or consumer TXT file. [Public edition scope](docs/PUBLIC-EDITION.md) explains the differences and remaining work. Nothing is silently replaced with a reduced or invented score model.

## Run from source

Install Node.js 22 or newer and npm. To run in a browser, no package installation is required:

```sh
node server.mjs
```

Open `http://127.0.0.1:4317` on the same computer. Keep the process running while using the app. To run the desktop interface:

```sh
npm ci
npm run desktop
```

For local development on macOS/Linux, use the browser option or Electron development command. No packaged macOS/Linux release has been validated.

## Tests and Windows builds

```sh
npm test
node scripts/check-public-release.mjs
npm ci
npm run desktop:preview
```

`npm test` runs the public regression suite, including parsing, genotype quality/coverage, saved analyses, browser-server boundaries, reference arithmetic, desktop setup logic and release data boundaries. Further upstream tests are retained under `test/` for transparency, but tests requiring withheld references, original scoring files or article fixtures are outside this edition's default suite. Test results verify implementation behavior, not medical or scientific validity.

The Windows build writes an unsigned installer and `win-unpacked` folder to `dist-desktop/`. It is intended to run on Windows x64. The separate `desktop:release` command requires code signing; it does not make the preview clinically validated.

## Privacy and saved files

Desktop saved analyses default to `%LOCALAPPDATA%\Genome Analysis\Saved Analyses`. Use the app menu to open that folder. Settings and saved analyses can remain on the computer after a flash drive is removed or the application is uninstalled. Protect your source genomes and exported reports; do not attach them to public issues or pull requests. The browser version uses your browser's local storage and your chosen export locations.

Opening a source link shares the requested public variant/article URL with that website. It does not upload your input genome file. Development import/update tools contact public reference providers; they are separate from ordinary offline analysis.

## License and credits

Project-authored software is under the [MIT license](LICENSE). Third-party data and runtime components retain their own terms; they are **not relicensed under MIT**. See [data licenses and citations](docs/DATA-LICENSES.md), [third-party notices](THIRD_PARTY_NOTICES.md), and the [release inventory](docs/data-rights-audit.json).

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before reporting problems, and use synthetic examples rather than personal genetic data.
