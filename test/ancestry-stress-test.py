"""Independent mathematical checks for the read-only ancestry challenge tool."""
import importlib.util, pathlib, unittest
import numpy as np

source = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'stress-test-ancestry.py'
spec = importlib.util.spec_from_file_location('ancestry_stress', source)
stress = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stress)


def exact(d, f, mask):
    good = np.isfinite(d) & mask
    mean = f[:, good].mean(axis=0)
    w = 1 / np.maximum(mean * (1 - mean), .05)
    x = 2 * (f[:, good] - mean)
    a = (x * w) @ x.T
    b = x @ (w * (d[good] - 2 * mean))
    best = None
    for face in range(1, 128):
        active = [i for i in range(7) if face & (1 << i)]
        n = len(active)
        system = np.block([[a[np.ix_(active, active)], np.ones((n, 1))], [np.ones((1, n)), np.zeros((1, 1))]])
        try:
            q_active = np.linalg.solve(system, np.r_[b[active], 1])[:n]
        except np.linalg.LinAlgError:
            continue
        if np.min(q_active) < -1e-10:
            continue
        q = np.zeros(7)
        q[active] = np.maximum(q_active, 0)
        q /= q.sum()
        loss = q @ a @ q - 2 * q @ b
        if best is None or loss < best[0]:
            best = loss, q
    return best[1]


class ChallengeMath(unittest.TestCase):
    def test_optimizer_matches_independent_active_faces_with_biased_missingness(self):
        rng = np.random.default_rng(17)
        f = rng.uniform(.02, .98, (7, 700))
        for i in range(8):
            expected = np.eye(7)[i] if i < 7 else np.array([.5, .5, 0, 0, 0, 0, 0])
            d = rng.binomial(2, expected @ f).astype(float)
            mask = np.ones(700, dtype=bool)
            mask[np.argsort(d, kind='stable')[:70]] = False
            d[699] = np.nan
            q, residual, converged = stress.fit(d, f, mask)
            self.assertTrue(converged)
            np.testing.assert_allclose(q, exact(d, f, mask), atol=2e-7)
            self.assertTrue(np.isfinite(residual))
            self.assertAlmostEqual(q.sum(), 1)

    def test_gate_boundary_requires_explicit_genotypes_and_adequate_chromosomes(self):
        panel = {'minimumMarkers': 3000, 'minimumCoverage': .9, 'minimumChromosomes': 20, 'minimumReferenceHomozygoteFraction': .05, 'residualLimit': 4}
        chrom = np.array([str(i % 22 + 1) for i in range(4400)])
        d = np.arange(4400) % 3
        mask = np.ones(4400, dtype=bool)
        mask[:440] = False
        self.assertIs(stress.gates(d, mask, chrom, panel, 3, True), True)
        mask[440] = False
        self.assertIs(stress.gates(d, mask, chrom, panel, 3, True), False)
        mask[:] = True
        self.assertIs(stress.gates(np.full(4400, 2), mask, chrom, panel, 3, True), False)
        self.assertIs(stress.gates(d, mask, chrom, panel, 5, True), False)
        self.assertIs(stress.gates(d, mask, chrom, panel, 3, False), False)


if __name__ == '__main__':
    unittest.main()
