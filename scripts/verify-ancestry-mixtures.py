"""Check synthetic browser fits with independent enumeration of simplex faces."""
import hashlib, json, pathlib, sys
import numpy as np

if len(sys.argv) != 4:
    raise SystemExit('Usage: verify-ancestry-mixtures.py reference.json challenges.json output.json')
reference_bytes = pathlib.Path(sys.argv[1]).read_bytes()
panel = json.loads(reference_bytes)
challenge_bytes = pathlib.Path(sys.argv[2]).read_bytes()
challenge = json.loads(challenge_bytes)
if (challenge.get('kind') not in ['synthetic-ancestry-mixture-challenges', 'synthetic-ancestry-chromosome-mixtures']
        or challenge.get('referenceSha256') != hashlib.sha256(reference_bytes).hexdigest()
        or challenge.get('codes') != [g['code'] for g in panel['groups']]):
    raise ValueError('Synthetic reference binding mismatch')
f = np.array([m['frequencies'] for m in panel['markers']]).T
mean = f.mean(axis=0)
w = 1 / np.maximum(mean * (1-mean), .05)
x = 2 * (f - mean)
a = (x*w) @ x.T
checks = []
for scenario in challenge['results']:
    case = scenario['worstCase']
    d = np.array(case['dosages'], dtype=float)
    if d.shape != mean.shape or not np.isin(d, [0, 1, 2]).all():
        raise ValueError('Invalid synthetic dosage fixture')
    y = d - 2*mean
    b = x @ (w*y)
    best = None
    for face in range(1, 128):
        active = [i for i in range(7) if face & (1 << i)]
        n = len(active)
        system = np.block([[a[np.ix_(active, active)], np.ones((n, 1))],
                           [np.ones((1, n)), np.zeros((1, 1))]])
        try:
            solved = np.linalg.solve(system, np.r_[b[active], 1])[:n]
        except np.linalg.LinAlgError:
            continue
        if np.min(solved) < -1e-10:
            continue
        q = np.zeros(7)
        q[active] = np.maximum(solved, 0)
        q /= q.sum()
        loss = q @ a @ q - 2*q @ b
        if best is None or loss < best[0]:
            best = loss, q
    if best is None:
        raise ValueError('No feasible independent fit')
    q = best[1]
    residual = (np.sum(w*y*y) + best[0])/len(d)
    difference = float(np.max(np.abs(q - case['fractions'])))
    residual_difference = abs(float(residual) - case['residual'])
    if difference > 2e-6 or residual_difference > 1e-8:
        raise ValueError(f'Independent fit disagreement: {scenario["label"]}: {difference}')
    checks.append({'label': scenario['label'], 'replicate': case['replicate'],
                   'fractions': q.tolist(), 'residual': float(residual),
                   'maximumFractionDifference': difference,
                   'residualDifference': residual_difference})
result = {'method': 'Independent equality-constrained least squares over all 127 nonempty simplex faces',
          'referenceSha256': challenge['referenceSha256'],
          'challengeSha256': hashlib.sha256(challenge_bytes).hexdigest(),
          'checks': checks,
          'maximumFractionDifference': max(c['maximumFractionDifference'] for c in checks)}
pathlib.Path(sys.argv[3]).write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'verifiedCases': len(checks), 'maximumFractionDifference': result['maximumFractionDifference']}))
