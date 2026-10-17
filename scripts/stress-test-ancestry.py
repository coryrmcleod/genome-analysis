"""Read-only challenges for a supplied aggregate ancestry reference.

Only public reference genotypes are read. No frequency templates are published.
Population exclusion tests retain the supplied panel's marker selection.
"""
import argparse, collections, hashlib, json, pathlib
import numpy as np


def simplex(v):
    ordered = np.sort(v)[::-1]
    cumulative = np.cumsum(ordered) - 1
    last = np.where(ordered - cumulative / np.arange(1, len(v) + 1) > 0)[0][-1]
    return np.maximum(v - cumulative[last] / (last + 1), 0)


def fit(d, frequencies, mask=None):
    good = np.isfinite(d)
    if mask is not None:
        good &= mask
    f = frequencies[:, good]
    mean = f.mean(axis=0)
    weights = 1 / np.maximum(mean * (1 - mean), .05)
    x = (2 * (f - mean)).T
    a = (x.T * weights) @ x
    b = x.T @ (weights * (d[good] - 2 * mean))
    step = 1 / max(np.abs(a).sum(axis=1))
    q = np.full(len(frequencies), 1 / len(frequencies))
    converged = False
    for _ in range(2000):
        next_q = simplex(q - step * (a @ q - b))
        change = np.max(np.abs(q - next_q))
        q = next_q
        if change < 1e-9:
            converged = True
            break
    residual = float(np.mean(weights * (d[good] - 2 * (q @ f)) ** 2))
    return q, residual, converged


def gates(d, mask, chromosomes, panel, residual, converged):
    usable = np.isfinite(d) & mask
    n = int(usable.sum())
    counts = collections.Counter(chromosomes[usable])
    return bool(n >= panel['minimumMarkers'] and n / len(d) >= panel['minimumCoverage'] and sum(v >= 30 for v in counts.values()) >= panel['minimumChromosomes'] and np.mean(d[usable] == 0) >= panel['minimumReferenceHomozygoteFraction'] and .08 <= np.mean(d[usable] == 1) <= .6 and converged and residual <= panel['residualLimit'])


def main():
    args = argparse.ArgumentParser()
    args.add_argument('build_directory', type=pathlib.Path)
    args.add_argument('reference', type=pathlib.Path)
    args.add_argument('output', type=pathlib.Path)
    options = args.parse_args()
    panel_bytes = options.reference.read_bytes()
    panel = json.loads(panel_bytes)
    prepared = json.loads((options.build_directory / 'prepared.json').read_text())
    training_selection = panel.get('sources', {}).get('trainingOnlySelection')
    if training_selection and prepared.get('sources', {}).get('trainingOnlySelection') != training_selection:
        raise ValueError('Experimental preparation/reference partition provenance mismatch')
    region_map = {'AFRICA': 'AFR', 'EUROPE': 'EUR', 'MIDDLE_EAST': 'MENA', 'CENTRAL_SOUTH_ASIA': 'SAS', 'EAST_ASIA': 'EAS', 'OCEANIA': 'OCE', 'AMERICA': 'IAM'}
    codes = [g['code'] for g in panel['groups']]
    populations = [p['code'] for p in panel['populations']]
    sample_ids, rows = None, []
    vcf_path = options.build_directory / 'final.vcf'
    with vcf_path.open() as source:
        for line in source:
            if line.startswith('#CHROM'):
                sample_ids = line.rstrip().split('\t')[9:]
            elif not line.startswith('#'):
                columns = line.rstrip().split('\t')
                marker = panel['markers'][len(rows)]
                mapping = marker['mappings']['GRCh38']
                if [columns[0], int(columns[1]), columns[2], columns[3], columns[4]] != [mapping['chrom'], mapping['position'], marker['id'], mapping['ref'], marker['alt']]:
                    raise ValueError('Public genotype/reference marker identity mismatch')
                gt_index = columns[8].split(':').index('GT')
                row = []
                for call in columns[9:]:
                    gt = call.split(':')[gt_index].replace('|', '/').split('/')
                    row.append(sum(map(int, gt)) if len(gt) == 2 and all(a in ['0', '1'] for a in gt) else 255)
                if len(row) != len(sample_ids):
                    raise ValueError('Public genotype sample inventory mismatch')
                rows.append(np.array(row, dtype=np.uint8))
    if len(rows) != len(panel['markers']) or len(set(sample_ids)) != len(sample_ids):
        raise ValueError('Incomplete or duplicate public genotype inventory')
    dosages = np.stack(rows).T
    sample_pop, sample_region = [], []
    for sample in sample_ids:
        metadata = prepared['metadata'][sample]
        if 'region' in metadata:
            pop, region = 'HGDP:' + metadata['population'], region_map[metadata['region']]
        else:
            pop = '1KG:' + metadata['Population']
            region = None if metadata['Population'] in ['ACB', 'ASW'] or metadata['SuperPop'] == 'AMR' else metadata['SuperPop']
        sample_pop.append(pop)
        sample_region.append(region)
    sp = np.array(sample_pop)
    rng = np.random.default_rng(20260929)
    training, heldout = [], []
    for pop in panel['populations']:
        indices = np.where(sp == pop['code'])[0]
        rng.shuffle(indices)
        n = max(1, int(len(indices) * .2)) if len(indices) >= 5 else 0
        if len(indices) != pop['totalUnrelatedCount'] or n != pop['validationCount']:
            raise ValueError('Public population/split provenance mismatch')
        heldout.extend(indices[:n])
        training.extend(indices[n:])
    training = np.array(training)
    pf = np.array([m['populationFrequencies'] for m in panel['markers']]).T
    for i, pop in enumerate(populations):
        d = dosages[training[sp[training] == pop]].astype(float)
        present = d != 255
        reproduced = np.round((np.where(present, d, 0).sum(axis=0) + .5) / (2 * present.sum(axis=0) + 1), 6)
        if not np.array_equal(pf[i], reproduced):
            raise ValueError('Installed frequency template does not reproduce deterministic training split: ' + pop)
    frequencies = np.array([m['frequencies'] for m in panel['markers']]).T
    unrounded_pf = []
    for pop in populations:
        d = dosages[training[sp[training] == pop]].astype(float)
        present = d != 255
        unrounded_pf.append((np.where(present, d, 0).sum(axis=0) + .5) / (2 * present.sum(axis=0) + 1))
    unrounded_pf = np.array(unrounded_pf)
    reproduced_f = np.array([np.round(unrounded_pf[[i for i, p in enumerate(panel['populations']) if p['region'] == group]].mean(axis=0), 6) for group in codes])
    if not np.array_equal(frequencies, reproduced_f):
        raise ValueError('Installed broad frequency templates do not reproduce training')
    chromosomes = np.array([m['mappings']['GRCh38']['chrom'] for m in panel['markers']])
    baselines, exclusions = [], []
    for index in heldout:
        region = sample_region[index]
        if region is None:
            continue
        d = dosages[index].astype(float)
        d[d == 255] = np.nan
        q, residual, converged = fit(d, frequencies)
        baseline = {'population': sample_pop[index], 'region': region, 'dominantCorrect': codes[int(q.argmax())] == region, 'passesGates': gates(d, np.ones(len(d), dtype=bool), chromosomes, panel, residual, converged)}
        baselines.append((index, q, baseline))
        others = [i for i, p in enumerate(panel['populations']) if p['region'] == region and p['code'] != sample_pop[index]]
        if not others:
            continue
        omitted = frequencies.copy()
        omitted[codes.index(region)] = np.round(unrounded_pf[others].mean(axis=0), 6)
        alternate, res, ok = fit(d, omitted)
        exclusions.append({'population': sample_pop[index], 'region': region, 'dominantCorrect': codes[int(alternate.argmax())] == region, 'maximumFractionChange': float(np.max(np.abs(alternate - q))), 'passesOriginalGates': gates(d, np.ones(len(d), dtype=bool), chromosomes, panel, res, ok)})
    challenges, browser_cases = [], {}
    selected = []
    for group in codes:
        candidates = [row for row in baselines if row[2]['region'] == group]
        selected.extend(candidates[::max(1, len(candidates) // 10)])
    for index, q, baseline in selected:
        d = dosages[index].astype(float)
        d[d == 255] = np.nan
        observed = np.flatnonzero(np.isfinite(d))
        remove_count = max(0, len(observed) - int(np.ceil(panel['minimumCoverage'] * len(d))))
        rng = np.random.default_rng(20261001 + int(index))
        contrast = frequencies[int(q.argmax())] - frequencies.mean(axis=0)
        for name, order in [('random', rng.permutation(observed)), ('reference_homozygotes_first', observed[np.argsort(d[observed], kind='stable')]), ('alternate_homozygotes_first', observed[np.argsort(-d[observed], kind='stable')]), ('group_informative_markers_first', observed[np.argsort(-np.abs(contrast[observed]), kind='stable')]), ('chromosome_clustered', observed[np.lexsort((observed, chromosomes[observed].astype(int)))])]:
            mask = np.ones(len(d), dtype=bool)
            mask[order[:remove_count]] = False
            alternate, res, ok = fit(d, frequencies, mask)
            change = float(np.max(np.abs(alternate - q)))
            challenges.append({'population': sample_pop[index], 'region': sample_region[index], 'pattern': name, 'coverage': float((np.isfinite(d) & mask).mean()), 'maximumFractionChange': change, 'passesGates': gates(d, mask, chromosomes, panel, res, ok), 'baselinePassesGates': baseline['passesGates']})
            if name not in browser_cases or change > browser_cases[name]['maximumFractionChange']:
                browser_cases[name] = {'pattern': name, 'publicSample': sample_ids[index], 'maximumFractionChange': change, 'dosages': [int(value) if keep and np.isfinite(value) else None for value, keep in zip(d, mask)], 'expectedFractions': alternate.tolist(), 'expectedResidual': res, 'expectedPassesGates': challenges[-1]['passesGates']}
    def summarize(rows, passed='passesGates'):
        changes = [r['maximumFractionChange'] for r in rows if 'maximumFractionChange' in r]
        return {'count': len(rows), 'passing': sum(r[passed] for r in rows), 'dominantAccuracy': float(np.mean([r['dominantCorrect'] for r in rows])) if rows and 'dominantCorrect' in rows[0] else None, 'maximumFractionChange': max(changes) if changes else None, 'percentile95FractionChange': float(np.quantile(changes, .95)) if changes else None}
    result = {'referenceSha256': hashlib.sha256(panel_bytes).hexdigest(), 'publicGenotypesSha256': hashlib.file_digest(vcf_path.open('rb'), 'sha256').hexdigest(), 'frequencyReproductionExact': True, 'heldOutSamples': len(heldout), 'baseline': summarize([r[2] for r in baselines]), 'populationExcluded': summarize(exclusions, 'passesOriginalGates'), 'populationExcludedByGroup': {g: summarize([r for r in exclusions if r['region'] == g], 'passesOriginalGates') for g in codes}, 'missingness': {name: summarize([r for r in challenges if r['pattern'] == name]) for name in sorted({r['pattern'] for r in challenges})}, 'populationExclusionDetails': exclusions, 'missingnessDetails': challenges, 'limitations': ['Population labels are metadata, not known unmixed genetic truth.', 'Omitted populations remain in pooled marker QC and selection; this is not a fully independent population-external evaluation.', 'The original residual gate is reported descriptively; a rebuilt reference would need its own validation and calibrated gate.', 'Missingness changes are relative to the full-panel fit, not errors against genealogical truth.', 'Results do not supply confidence intervals or individual risk.']}
    if training_selection:
        result['trainingOnlySelection'] = training_selection
        result['limitations'][1] = 'Omitted populations remain in training-cohort marker QC and selection; earlier pooled kinship cohort selection is retained. This is not fully independent population-external evaluation.'
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(json.dumps(result, indent=2) + '\n')
    options.output.with_name(options.output.stem + '-browser-fixtures.json').write_text(json.dumps({'referenceSha256': result['referenceSha256'], 'cases': list(browser_cases.values())}, separators=(',', ':')) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ['populationExclusionDetails', 'missingnessDetails']}, indent=2), flush=True)


if __name__ == '__main__':
    main()
