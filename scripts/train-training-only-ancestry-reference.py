"""Fit the experimental training-only marker reference using its frozen split.

No individual reference genomes or personal genomes are bundled in the app.
Validation individuals never contribute to fitted allele frequencies.
"""
import pathlib, json, sys, hashlib, datetime, collections
import numpy as np

if len(sys.argv) != 4:
    raise ValueError('Supply experimental build directory, NEW reference JSON and frozen partition JSON')
root=pathlib.Path(sys.argv[1]).resolve()
destination=pathlib.Path(sys.argv[2]).resolve()
if destination == pathlib.Path(__file__).resolve().parents[1]/'public/data/ancestry-reference.json':
    raise ValueError('Experimental training cannot replace the installed reference')
partition_path=pathlib.Path(sys.argv[3]).resolve()
partition=json.loads(partition_path.read_text())
prepared=json.loads((root/'prepared.json').read_text())
selection_proof=prepared['sources'].get('trainingOnlySelection')
if not selection_proof or selection_proof['partitionSha256'] != hashlib.sha256(partition_path.read_bytes()).hexdigest():
    raise ValueError('Prepared reference does not bind this frozen partition')
markers={m['id']:m for m in prepared['markers']}
if len(markers) != len(prepared['markers']):
    raise ValueError('Duplicate prepared marker identity')
region_codes=['AFR','EUR','MENA','SAS','EAS','OCE','IAM']
region_labels=['Sub-Saharan African references','European references','Middle Eastern / North African references','Central / South Asian references','East Asian references','Oceanian references','Indigenous American references']
hg_regions={'AFRICA':'AFR','EUROPE':'EUR','MIDDLE_EAST':'MENA','CENTRAL_SOUTH_ASIA':'SAS','EAST_ASIA':'EAS','OCEANIA':'OCE','AMERICA':'IAM'}
kg_labels={'GBR':'British in England and Scotland','FIN':'Finnish in Finland','IBS':'Iberian populations in Spain','CEU':'Utah residents with Northern and Western European ancestry','TSI':'Toscani in Italy','CHB':'Han Chinese in Beijing','CHS':'Southern Han Chinese','JPT':'Japanese in Tokyo','CDX':'Chinese Dai in Xishuangbanna','KHV':'Kinh in Ho Chi Minh City, Vietnam','YRI':'Yoruba in Ibadan, Nigeria','LWK':'Luhya in Webuye, Kenya','GWD':'Gambian in Western Divisions','MSL':'Mende in Sierra Leone','ESN':'Esan in Nigeria','ASW':'African ancestry in Southwest USA (admixed reference)','ACB':'African Caribbean in Barbados (admixed reference)','GIH':'Gujarati Indian in Houston','PJL':'Punjabi in Lahore, Pakistan','BEB':'Bengali in Bangladesh','STU':'Sri Lankan Tamil in the UK','ITU':'Indian Telugu in the UK','MXL':'Mexican ancestry in Los Angeles (admixed reference)','PUR':'Puerto Rican (admixed reference)','CLM':'Colombian in Medellin (admixed reference)','PEL':'Peruvian in Lima (admixed reference)'}
ids=None; dosage=[]; selected=[]
with (root/'final.vcf').open() as f:
    for line in f:
        if line.startswith('#CHROM'):
            if ids is not None: raise ValueError('Duplicate public VCF sample header')
            ids=line.rstrip().split('\t')[9:]
            if not ids or len(set(ids)) != len(ids): raise ValueError('Missing or duplicate public samples')
        elif not line.startswith('#'):
            if ids is None: raise ValueError('Public genotype row precedes sample header')
            c=line.rstrip().split('\t'); m=markers[c[2]]
            if [c[0],int(c[1]),c[3],c[4]] != [m['chrom'],m['pos38'],m['ref'],m['alt']]: raise ValueError('Final marker mapping mismatch')
            if len(c[9:]) != len(ids): raise ValueError('Public genotype sample count mismatch')
            gt_index=c[8].split(':').index('GT')
            row=[]
            for s in c[9:]:
                gt=s.split(':')[gt_index].replace('|','/').split('/')
                row.append(sum(map(int,gt)) if len(gt)==2 and all(a in ['0','1'] for a in gt) else np.nan)
            dosage.append(row); selected.append(m)
if [m['id'] for m in selected] != [m['id'] for m in prepared['markers']]:
    raise ValueError('Final public marker inventory or order differs from preparation')
D=np.array(dosage,dtype=np.float64).T
meta=prepared['metadata']; pops=[]; sample_pop=[]; sample_region=[]
for id in ids:
    m=meta[id]
    if 'region' in m:
        code='HGDP:'+m['population']; label=m['population']; region=hg_regions[m['region']]; admixed=False
    else:
        code='1KG:'+m['Population']; label=kg_labels[m['Population']]; region=m['SuperPop']; admixed=m['Population'] in ['ACB','ASW'] or region=='AMR'
    if code not in [p['code'] for p in pops]:
        pops.append({'code':code,'label':label,'region':region if not admixed else 'ADMIXED','source':'HGDP' if code.startswith('HGDP') else '1000 Genomes','admixed':admixed})
    sample_pop.append(code); sample_region.append(None if admixed else region)
sp=np.array(sample_pop); sr=np.array(sample_region,dtype=object)
rng=np.random.default_rng(20260929); train=[]; holdout=[]
for p in pops:
    indexes=np.where(sp==p['code'])[0]; rng.shuffle(indexes)
    # Small groups retained as affinity references but not assigned validation claims.
    n=max(1,int(len(indexes)*0.2)) if len(indexes)>=5 else 0
    holdout.extend(indexes[:n]); train.extend(indexes[n:])
train=np.array(train); holdout=np.array(holdout)
if [ids[i] for i in train] != [row['iid'] for row in partition['training']] or [ids[i] for i in holdout] != [row['iid'] for row in partition['heldout']]:
    raise ValueError('Calculated sample split differs from the frozen public partition')
for row in partition['training']+partition['heldout']:
    index=ids.index(row['iid'])
    region='ADMIXED' if sr[index] is None else sr[index]
    if sp[index] != row['population'] or region != row['region']:
        raise ValueError('Public sample metadata changed after partition freezing')
print('Verified exact frozen public training and held-out sample identities', flush=True)
# Equal population weights within each broad group avoid dominance by large cohorts.
pf=[]
for p in pops:
    ix=train[sp[train]==p['code']]; a=D[ix]; present=np.isfinite(a)
    f=(np.nansum(a,axis=0)+0.5)/(2*present.sum(axis=0)+1)
    pf.append(f); p['sampleCount']=int(len(ix)); p['validationCount']=int(sum(sp[holdout]==p['code'])); p['totalUnrelatedCount']=int(sum(sp==p['code']))
PF=np.array(pf)
F=np.array([np.mean(PF[[i for i,p in enumerate(pops) if p['region']==g]],axis=0) for g in region_codes])
# Round before validation so the deployed model, not a higher-precision precursor, is tested.
F=np.round(F,6); PF=np.round(PF,6)
mean=F.mean(axis=0); weights=1/np.maximum(mean*(1-mean),0.05); X=(2*(F-mean)).T
A=(X.T*weights)@X; step=1/max(np.abs(A).sum(axis=1))
def simplex(v):
    u=np.sort(v)[::-1]; cs=np.cumsum(u)-1; j=np.where(u-cs/(np.arange(len(v))+1)>0)[0][-1]
    return np.maximum(v-cs[j]/(j+1),0)
def fit(d, mask=None):
    usable=np.isfinite(d)
    if mask is not None: usable &=mask
    x=X[usable]; w=weights[usable]; a=A if usable.all() else (x.T*w)@x
    b=x.T@(w*(d[usable]-2*mean[usable])); q=np.ones(7)/7
    step=1/max(np.abs(a).sum(axis=1))
    for _ in range(2000):
        v=simplex(q-step*(a@q-b))
        if np.max(np.abs(q-v))<1e-9: break
        q=v
    residual=float(np.mean(w*(d[usable]-2*(q@F[:,usable]))**2))
    return q,residual
def affinity(d):
    good=np.isfinite(d); f=np.clip(PF[:,good],0.0001,0.9999); dd=d[good]
    return (np.log(f)@dd +np.log(1-f)@(2-dd))/good.sum()
def exact_fit(d):
    """Independent optimizer: enumerate all 127 simplex faces and solve KKT systems."""
    good=np.isfinite(d); x=X[good]; w=weights[good]; a=(x.T*w)@x; b=x.T@(w*(d[good]-2*mean[good])); best=None
    for mask in range(1,128):
        active=[i for i in range(7) if mask&(1<<i)]; n=len(active)
        system=np.zeros((n+1,n+1)); system[:n,:n]=a[np.ix_(active,active)]; system[:n,n]=1; system[n,:n]=1
        try: solution=np.linalg.solve(system,np.r_[b[active],1])[:n]
        except np.linalg.LinAlgError: continue
        if min(solution)<-1e-10: continue
        q=np.zeros(7); q[active]=np.maximum(solution,0); q/=sum(q)
        objective=float(q@a@q-2*q@b)
        if best is None or objective<best[0]: best=(objective,q)
    return best[1]
validation=[]; residuals=[]; source_rows=[]
for ix in holdout:
    q,res=fit(D[ix]); scores=affinity(D[ix]); ranks=np.argsort(-scores)
    truth=sample_region[ix]
    validation.append({'population':sample_pop[ix],'region':truth,'predicted':region_codes[int(q.argmax())],'trueRegionFraction':float(q[region_codes.index(truth)]) if truth else None,'residual':res,'populationTop1':pops[int(ranks[0])]['code']==sample_pop[ix],'populationTop5':sample_pop[ix] in [pops[int(i)]['code'] for i in ranks[:5]]})
    residuals.append(res)
    if truth: source_rows.append((ix,q))
chrom=np.array([m['chrom'] for m in selected])
random_missing=[]; variant_only=[]
for ix,q in source_rows[::max(1,len(source_rows)//70)]:
    mask=rng.random(D.shape[1])>0.1
    sparse,_=fit(D[ix],mask); random_missing.append(float(np.max(np.abs(q-sparse))))
    # Deliberately biased data: absence of reference homozygotes is not valid missing-at-random data.
    mask=D[ix]>0; biased,_=fit(D[ix],mask); variant_only.append({'coverage':float(mask.mean()),'maxFractionChange':float(np.max(np.abs(q-biased)))})
mixes=[]
for _ in range(120):
    a,b=rng.choice([r[0] for r in source_rows],2,replace=False)
    # Random allele from each held-out donor; validates arithmetic under a defined simulation only.
    d=(rng.random(D.shape[1])<D[a]/2).astype(float)+(rng.random(D.shape[1])<D[b]/2).astype(float)
    d[~np.isfinite(D[a])|~np.isfinite(D[b])]=np.nan
    q,res=fit(d); expected=np.zeros(7); expected[region_codes.index(sr[a])]+=0.5; expected[region_codes.index(sr[b])]+=0.5
    mixes.append({'maximumAbsoluteFractionError':float(np.max(np.abs(q-expected))),'residual':res})
byregion={}
for g in region_codes:
    rows=[r for r in validation if r['region']==g]
    byregion[g]={'heldOutSamples':len(rows),'dominantGroupAccuracy':float(np.mean([r['predicted']==g for r in rows])) if rows else None,'medianAssignedFraction':float(np.median([r['trueRegionFraction'] for r in rows])) if rows else None,'minimumAssignedFraction':float(min(r['trueRegionFraction'] for r in rows)) if rows else None}
benchmark={'seed':20260929,'heldOutSamples':len(holdout),'trainingSamples':len(train),'broadGroups':byregion,'populationTop1Accuracy':float(np.mean([r['populationTop1'] for r in validation])),'populationTop5Accuracy':float(np.mean([r['populationTop5'] for r in validation])),'randomTenPercentMissingMaxChange95':float(np.quantile(random_missing,.95)),'simulatedHalfMixtures':{'count':len(mixes),'medianMaximumAbsoluteFractionError':float(np.median([r['maximumAbsoluteFractionError'] for r in mixes])),'percentile95MaximumAbsoluteFractionError':float(np.quantile([r['maximumAbsoluteFractionError'] for r in mixes],.95))},'variantOnlyChallenge':variant_only,'limitations':['A single deterministic stratified holdout, not independent clinical or consumer-service validation.','Marker QC and LD pruning use pooled unlabeled reference genotypes; frequency fitting excludes held-out individuals.','Public population labels are source metadata, not proof of unmixed ancestry.','Half-mixture simulations draw one allele per locus from each donor; not phased segment or genealogy validation.','Nearby populations and underrepresented populations may not be distinguishable.']}
checks=[]
for ix,_ in source_rows[::max(1,len(source_rows)//14)]:
    q,_=fit(D[ix]); exact=exact_fit(D[ix]); checks.append(float(np.max(np.abs(q-exact))))
benchmark['independentOptimizationCheck']={'method':'Enumeration of 127 active simplex faces with KKT linear systems','samples':len(checks),'maximumAbsoluteFractionDifference':max(checks)}
if max(checks)>1e-5: raise ValueError('Projected optimizer disagrees with independent exact solution')
benchmark['heterozygosityScreen']={'minimumHeldOut':float(min(np.nanmean(D[ix]==1) for ix in holdout)),'maximumHeldOut':float(max(np.nanmean(D[ix]==1) for ix in holdout)),'supportedMinimum':0.08,'supportedMaximum':0.6}
model={'kind':'genome-ancestry-reference','version':'1.0.0','method':'supervised-frequency-simplex-wls-v1','referenceBuilds':['GRCh37','GRCh38'],'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceURL':'https://www.cog-genomics.org/plink/2.0/resources#hgdp','sources':prepared['sources'],'minimumCoverage':0.9,'minimumMarkers':3000,'minimumChromosomes':20,'minimumReferenceHomozygoteFraction':0.05,'residualLimit':float(max(np.quantile(residuals,.995),np.quantile([r['residual'] for r in mixes],.995))*1.2),'groups':[{'code':g,'label':label,'sampleCount':int(sum((sr[train]==g)))} for g,label in zip(region_codes,region_labels)],'populations':pops,'markers':[{'id':m['id'],'mappings':{'GRCh37':{'chrom':m['chrom'],'position':m['pos37'],'ref':m['ref'],'alleles':[m['ref'],m['alt']]},'GRCh38':{'chrom':m['chrom'],'position':m['pos38'],'ref':m['ref'],'alleles':[m['ref'],m['alt']]}},'alt':m['alt'],'frequencies':[float(f) for f in F[:,j]],'populationFrequencies':[float(f) for f in PF[:,j]]} for j,m in enumerate(selected)],'validation':{k:v for k,v in benchmark.items() if k!='variantOnlyChallenge'}}
model['version']='1.1.0-experimental'
benchmark['limitations']=[('Genotype-driven marker QC and LD pruning use the frozen training subset; the sample cohort was retained after earlier pooled kinship screening.' if item.startswith('Marker QC and LD pruning use pooled') else item) for item in benchmark['limitations']]
model['validation']['limitations']=benchmark['limitations']
destination.parent.mkdir(exist_ok=True,parents=True)
destination.write_text(json.dumps(model,separators=(',',':'))+'\n')
(root/'validation.json').write_text(json.dumps(benchmark,indent=2))
(root/'heldout-details.json').write_text(json.dumps(validation,indent=2))
# Public validation fixture: only reference genomes, never personal data.
fixture=[]
for g in region_codes:
    indexes=[ix for ix,_ in source_rows if sr[ix]==g]
    if indexes:
        ix=indexes[len(indexes)//2]; q,res=fit(D[ix]); fixture.append({'publicSample':ids[ix],'sourceRegion':g,'dosages':[int(d) if np.isfinite(d) else None for d in D[ix]],'expectedFractions':q.tolist(),'expectedResidual':res})
(root/'public-fixtures.json').write_text(json.dumps(fixture,separators=(',',':')))
print(json.dumps({'markers':len(selected),'populations':len(pops),'validation':model['validation'],'modelSha256':hashlib.sha256(destination.read_bytes()).hexdigest()},indent=2),flush=True)
