import json, hashlib, pathlib, sys
import numpy as np
if len(sys.argv) != 5:
    raise ValueError('Supply reference JSON, public fixtures JSON, challenges JSON and output JSON')
reference_path,fixture_path,challenge_path,output_path=map(pathlib.Path,sys.argv[1:])
if output_path.resolve() in {p.resolve() for p in [reference_path,fixture_path,challenge_path]}:
    raise ValueError('Verification output must preserve inputs')
reference_bytes=reference_path.read_bytes()
panel=json.loads(reference_bytes)
source_bytes=challenge_path.read_bytes()
source=json.loads(source_bytes)
if source['referenceSha256']!=hashlib.sha256(reference_bytes).hexdigest():
    raise ValueError('Reference binding mismatch')
if source['publicFixturesSha256']!=hashlib.sha256(fixture_path.read_bytes()).hexdigest():
    raise ValueError('Public fixture binding mismatch')
f=np.array([m['frequencies'] for m in panel['markers']]).T
mean=f.mean(axis=0);w=1/np.maximum(mean*(1-mean),.05);x=2*(f-mean)
checks=[]
for mode in ['reference-biased','heterozygote-biased','alternate-biased']:
    for proportion in [.01,.05,.1]:
        passing=[r for r in source['results'] if r['mode']==mode and r['proportion']==proportion and r['status']=='Estimated']
        if not passing:
            continue
        case=max(passing,key=lambda r:r['maximumChange'])
        d=np.array(case['dosages'],dtype=float);mask=np.isfinite(d)
        xm=x[:,mask];wm=w[mask];y=d[mask]-2*mean[mask]
        a=(xm*wm)@xm.T;b=xm@(wm*y);best=None
        for face in range(1,128):
            active=[i for i in range(7) if face&(1<<i)];n=len(active)
            system=np.block([[a[np.ix_(active,active)],np.ones((n,1))],[np.ones((1,n)),np.zeros((1,1))]])
            try:
                solved=np.linalg.solve(system,np.r_[b[active],1])[:n]
            except np.linalg.LinAlgError:
                continue
            if np.min(solved)<-1e-10:
                continue
            q=np.zeros(7);q[active]=np.maximum(solved,0);q/=q.sum()
            loss=q@a@q-2*q@b
            if best is None or loss<best[0]:
                best=(loss,q)
        if best is None:
            raise ValueError('No independent fit')
        residual=(np.sum(wm*y*y)+best[0])/sum(mask)
        difference=float(np.max(np.abs(best[1]-case['fractions'])))
        if difference>2e-6 or abs(residual-case['residual'])>1e-8:
            raise ValueError('Independent disagreement')
        checks.append({'publicSample':case['publicSample'],'mode':mode,'proportion':proportion,'fractions':best[1].tolist(),'residual':float(residual),'maximumFractionDifference':difference})
result={'referenceSha256':source['referenceSha256'],'challengeSha256':hashlib.sha256(source_bytes).hexdigest(),'checks':checks,'maximumFractionDifference':max(c['maximumFractionDifference'] for c in checks)}
output_path.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'verified':len(checks),'maximumFractionDifference':result['maximumFractionDifference']}))
