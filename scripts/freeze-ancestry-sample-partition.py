"""Freeze the existing public-reference split before experimental marker selection."""
import pathlib, json, hashlib, sys, collections
import numpy as np

source = pathlib.Path(sys.argv[1]).resolve()
destination = pathlib.Path(sys.argv[2]).resolve()
prepared_bytes = (source / 'prepared.json').read_bytes()
prepared = json.loads(prepared_bytes)
with (source / 'final.vcf').open() as stream:
    ids = None
    for line in stream:
        if line.startswith('#CHROM'):
            ids = line.rstrip().split('\t')[9:]
            break
if not ids or len(ids) != len(set(ids)):
    raise ValueError('Invalid public sample inventory')
psam = (source / 'unrelated.psam').read_text().splitlines()
columns = psam[0].lstrip('#').split()
psam_ids = [dict(zip(columns, line.split()))['IID'] for line in psam[1:] if line.strip()]
if ids != psam_ids:
    raise ValueError('Public final VCF and unrelated sample order differ')
regions = {'AFRICA':'AFR', 'EUROPE':'EUR', 'MIDDLE_EAST':'MENA', 'CENTRAL_SOUTH_ASIA':'SAS', 'EAST_ASIA':'EAS', 'OCEANIA':'OCE', 'AMERICA':'IAM'}
rows = []
for iid in ids:
    meta = prepared['metadata'][iid]
    if 'region' in meta:
        population, region = 'HGDP:' + meta['population'], regions[meta['region']]
    else:
        population = '1KG:' + meta['Population']
        region = 'ADMIXED' if meta['Population'] in ['ACB','ASW'] or meta['SuperPop'] == 'AMR' else meta['SuperPop']
    rows.append({'iid':iid, 'population':population, 'region':region})
populations = list(dict.fromkeys(row['population'] for row in rows))
rng = np.random.default_rng(20260929)
training, heldout = [], []
for population in populations:
    indexes = np.array([i for i, row in enumerate(rows) if row['population'] == population])
    rng.shuffle(indexes)
    count = max(1, int(len(indexes) * .2)) if len(indexes) >= 5 else 0
    heldout.extend(map(int, indexes[:count]))
    training.extend(map(int, indexes[count:]))
benchmark = json.loads((source / 'validation.json').read_text())
details = json.loads((source / 'heldout-details.json').read_text())
if benchmark['seed'] != 20260929 or len(training) != benchmark['trainingSamples'] or len(heldout) != benchmark['heldOutSamples']:
    raise ValueError('Public split disagrees with original validation counts')
if [rows[i]['population'] for i in heldout] != [row['population'] for row in details]:
    raise ValueError('Held-out population order disagrees with original validation')
counts = collections.Counter(rows[i]['region'] for i in heldout)
for region, group in benchmark['broadGroups'].items():
    if counts[region] != group['heldOutSamples']:
        raise ValueError('Held-out regional inventory changed')
if set(training) & set(heldout) or set(training) | set(heldout) != set(range(len(ids))):
    raise ValueError('Incomplete or overlapping partition')
destination.mkdir(parents=True, exist_ok=True)
hash_bytes = lambda value: hashlib.sha256(value).hexdigest()
artifacts = {}
for name, indexes in [('training.keep', training), ('heldout.keep', heldout)]:
    artifacts[name] = ('#IID\n' + '\n'.join(rows[i]['iid'] for i in indexes) + '\n').encode()
proof = {'scope':'Public references only; frozen stratified split, not independent validation of the new marker-selection experiment', 'seed':20260929, 'numpyVersion':np.__version__, 'sourcePreparedSha256':hash_bytes(prepared_bytes), 'sourceUnrelatedPsamSha256':hash_bytes((source/'unrelated.psam').read_bytes()), 'sourceFinalSampleOrderSha256':hash_bytes(('\n'.join(ids)+'\n').encode()), 'trainingSamples':len(training), 'heldOutSamples':len(heldout), 'populations':len(populations), 'keepSha256':{name:hash_bytes(value) for name,value in artifacts.items()}, 'sampleSelectionNote':'Existing cohort retained after pooled unrelated-sample screening; genotype-driven marker selection must use training individuals only in the experimental rebuild.', 'training':[rows[i] for i in training], 'heldout':[rows[i] for i in heldout]}
artifacts['sample-partition.json'] = (json.dumps(proof, indent=2) + '\n').encode()
for name, value in artifacts.items():
    path = destination / name
    if path.exists():
        if path.read_bytes() != value:
            raise ValueError('Frozen partition changed: ' + name)
    else:
        with path.open('xb') as output:
            output.write(value)
print(json.dumps({key:proof[key] for key in ['trainingSamples','heldOutSamples','populations','keepSha256']}))
