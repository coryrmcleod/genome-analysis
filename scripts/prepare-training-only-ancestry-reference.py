"""Experimental training-only marker selection from local public references.

Uses the pinned local PGS 1000G archive and PLINK's HGDP 2019 main release.
Common forward-strand SNVs must match both panels after reciprocal liftOver.
"""
import pathlib, subprocess, json, hashlib, sys, collections, re, shutil, gc

if len(sys.argv) != 7:
    raise ValueError('Supply NEW output, public 1000G, public HGDP, verified FASTA, frozen partition JSON and original prepared JSON')

root = pathlib.Path(sys.argv[1]).resolve()
kg = pathlib.Path(sys.argv[2]).resolve()
hg = pathlib.Path(sys.argv[3]).resolve()
fasta = pathlib.Path(sys.argv[4]).resolve()
partition_path = pathlib.Path(sys.argv[5]).resolve()
original_prepared_path = pathlib.Path(sys.argv[6]).resolve()
partition = json.loads(partition_path.read_text())
original_prepared = json.loads(original_prepared_path.read_text())
if root == original_prepared_path.parent or root in original_prepared_path.parents or root == kg or root == hg:
    raise ValueError('Experimental output must not replace existing references')
root.mkdir(exist_ok=True, parents=True)
def run(args):
    if args[0]=='plink2': args += ['--memory','6400']
    print('Running', args[0], *map(str,args[1:5]), flush=True)
    subprocess.run(list(map(str,args)),check=True,cwd=root)
def zlines(path):
    p=subprocess.Popen(['zstd','-dc',str(path)],stdout=subprocess.PIPE,text=True)
    for line in p.stdout:
        yield line.rstrip('\n')
    if p.wait(): raise ValueError('zstd failed')
def sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
print('Verifying frozen public partition and complete reference source identities', flush=True)
if sha(original_prepared_path) != partition['sourcePreparedSha256']:
    raise ValueError('Original public metadata changed after partition freezing')
for name, expected in partition['keepSha256'].items():
    if sha(partition_path.parent / name) != expected:
        raise ValueError('Frozen sample keep file changed')
training_ids = [row['iid'] for row in partition['training']]
heldout_ids = [row['iid'] for row in partition['heldout']]
cohort_ids = training_ids + heldout_ids
if len(set(cohort_ids)) != len(cohort_ids) or len(training_ids) != partition['trainingSamples'] or len(heldout_ids) != partition['heldOutSamples']:
    raise ValueError('Invalid training/holdout partition')
reference_proof = json.loads(pathlib.Path(str(fasta)+'.verification.json').read_text())
if not reference_proof['allRequiredSequencesMatch'] or sha(fasta) != reference_proof['sha256']:
    raise ValueError('Public FASTA identity is not verified')
print('Verified complete public GRCh38 FASTA identity', flush=True)
for name, expected in original_prepared['sources']['chains'].items():
    source_path = original_prepared_path.parent / name
    if sha(source_path) != expected:
        raise ValueError('Assembly chain changed')
    shutil.copyfile(source_path, root / name)
shutil.copyfile(original_prepared_path.parent/'liftOver', root/'liftOver')
(root/'liftOver').chmod(0o755)
for name, expected in original_prepared['sources']['hgdp']['sha256'].items():
    if sha(hg/name) != expected:
        raise ValueError('Public HGDP source changed')
inputs = {'partitionSha256':sha(partition_path), 'originalPreparedSha256':sha(original_prepared_path), 'fastaSha256':reference_proof['sha256'], 'markerSelection':'Training individuals only for 1000G QC, combined QC and LD pruning', 'cohortSelection':'Frozen existing unrelated cohort; earlier pooled kinship screening retained'}
input_bytes = (json.dumps(inputs, indent=2)+'\n').encode()
input_path = root/'build-inputs.json'
if input_path.exists() and input_path.read_bytes() != input_bytes:
    raise ValueError('Experimental build inputs changed')
input_path.write_bytes(input_bytes)
(root/'cohort.keep').write_text('#IID\n'+'\n'.join(cohort_ids)+'\n')
shutil.copyfile(partition_path.parent/'training.keep', root/'training.keep')
archive=json.loads((kg/'archive-provenance.json').read_text())
if archive['sha256']!='a3749573b7f2bdbafbe724a13bf111d7fe0ba4c9daa18db0b8a68bb95094fca9' or not archive['zstdIntegrityVerified']:
    raise ValueError('Unreviewed 1000G archive')
source=kg/'extracted/GRCh37_1000G_ALL'
excluded={l.split()[-1] for l in (kg/'extracted/GRCh37_1000G.king.cutoff.out.id').read_text().splitlines() if l and not l.startswith('#')}
samples=(pathlib.Path(str(source)+'.psam')).read_text().splitlines()
header=samples[0].lstrip('#').split()
meta={r['IID']:r for l in samples[1:] if l.strip() for r in [dict(zip(header,l.split()))] if r['IID'] not in excluded}
(root/'kg.keep').write_text('#IID\n'+'\n'.join(meta)+'\n')
# Bounded deterministic candidate pool; no population label or personal genotype used.
counts=collections.Counter(); pool=[]
for line in ([] if (root/'pool.ids').exists() else zlines(pathlib.Path(str(source)+'.pvar.zst'))):
    if line.startswith('#'): continue
    c=line.split('\t'); chrom,pos,id,ref,alt=c[:5]
    if not chrom.isdigit() or not 1<=int(chrom)<=22 or len(ref)!=1 or len(alt)!=1 or ref+alt in ['AT','TA','CG','GC'] or not re.fullmatch('[ACGT]{2}',ref+alt): continue
    pos=int(pos)
    # Exclude known long-range LD regions, expanded conservatively in GRCh37.
    if (chrom=='6' and 25000000<=pos<=35000000) or (chrom=='8' and 7000000<=pos<=13000000): continue
    key=(chrom,pos//100000)
    if counts[key]>=16: continue
    counts[key]+=1; pool.append(id)
if pool: (root/'pool.ids').write_text('\n'.join(pool)+'\n')
for chrom in range(1,23):
    dest=root/f'kg-chr{chrom}'
    if not pathlib.Path(str(dest)+'.pgen').exists():
        qc=root/f'kg-training-qc-chr{chrom}'
        run(['plink2','--pfile',source,'vzs','--chr',str(chrom),'--keep',root/'training.keep','--extract',root/'pool.ids','--maf','0.05','--geno','0.01','--max-alleles','2','--write-snplist','--out',qc,'--threads','4'])
        run(['plink2','--pfile',source,'vzs','--chr',str(chrom),'--keep',root/'cohort.keep','--extract',str(qc)+'.snplist','--max-alleles','2','--make-pgen','--out',dest,'--threads','4'])
(root/'kg-merge.txt').write_text(''.join(f'kg-chr{c}\n' for c in range(1,23)))
run(['plink2','--pmerge-list',root/'kg-merge.txt','pfile','--make-pgen','--out',root/'kg-pool','--threads','4'])
rows=[]
for l in (root/'kg-pool.pvar').read_text().splitlines():
    if not l.startswith('#'): rows.append(l.split('\t')[:5])
index={r[2]:r for r in rows}
(root/'37.bed').write_text(''.join(f'chr{r[0]}\t{int(r[1])-1}\t{r[1]}\t{r[2]}\t0\t+\n' for r in rows))
run([root/'liftOver',root/'37.bed',root/'hg19ToHg38.over.chain.gz',root/'38.bed',root/'unmapped37.bed'])
run([root/'liftOver',root/'38.bed',root/'hg38ToHg19.over.chain.gz',root/'roundtrip.bed',root/'unmapped38.bed'])
roundtrip={c[3] for l in (root/'roundtrip.bed').read_text().splitlines() for c in [l.split()] if c[3] in index and c[0]=='chr'+index[c[3]][0] and c[1]==str(int(index[c[3]][1])-1) and c[2]==index[c[3]][1] and c[5]=='+'}
lift={}
for l in (root/'38.bed').read_text().splitlines():
    c=l.split(); old=index[c[3]]
    if c[3] in roundtrip and c[0]=='chr'+old[0] and int(c[2])-int(c[1])==1 and c[5]=='+':
        lift[(old[0],int(c[2]))]=old
matched={}; duplicates=set()
for l in zlines(hg/'hgdp_all.pvar.zst'):
    if l.startswith('#'): continue
    c=l.split('\t'); key=(c[0],int(c[1]))
    if key not in lift: continue
    old=lift[key]
    if c[3:5]!=old[3:5] or not re.fullmatch(r'rs\d+',c[2]): continue
    if key in matched: duplicates.add(key)
    matched[key]={'id':c[2],'chrom':c[0],'pos38':int(c[1]),'pos37':int(old[1]),'oldId':old[2],'ref':c[3],'alt':c[4]}
for key in duplicates: matched.pop(key)
rs_counts=collections.Counter(m['id'] for m in matched.values())
markers=[m for m in matched.values() if rs_counts[m['id']]==1]
# Verify the destination base independently in the exact installed GRCh38 FASTA.
(root/'reference-regions.txt').write_text(''.join(f"chr{m['chrom']}:{m['pos38']}-{m['pos38']}\n" for m in markers))
with (root/'bases38.fa').open('w') as out:
    subprocess.run(['samtools','faidx','-r',str(root/'reference-regions.txt'),str(fasta)],stdout=out,check=True)
bases={}; key=None
for l in (root/'bases38.fa').read_text().splitlines():
    if l.startswith('>'): key=l[1:]; bases[key]=''
    else: bases[key]+=l.strip().upper()
markers=[m for m in markers if bases.get(f"chr{m['chrom']}:{m['pos38']}-{m['pos38']}")==m['ref']]
(root/'kg.ids').write_text('\n'.join(m['oldId'] for m in markers)+'\n')
(root/'hg.ids').write_text('\n'.join(m['id'] for m in markers)+'\n')
if not (hg/'hgdp_all.pgen').exists(): run(['zstd','-d',hg/'hgdp_all.pgen.zst','-o',hg/'hgdp_all.pgen'])
run(['plink2','--pfile',root/'kg-pool','--extract',root/'kg.ids','--export','vcf','id-paste=iid','--out',root/'kg-calls','--threads','4'])
for chrom in range(1,23):
    dest=root/f'hg-chr{chrom}'
    run(['plink2','--pfile',hg/'hgdp_all','vzs','--chr',str(chrom),'--keep',root/'cohort.keep','--extract',root/'hg.ids','--export','vcf','id-paste=iid','--out',dest,'--threads','4'])
with (root/'hg-calls.vcf').open('w') as out:
    for chrom in range(1,23):
        with (root/f'hg-chr{chrom}.vcf').open() as part:
            for line in part:
                if chrom==1 or not line.startswith('#'): out.write(line)
def readvcf(path):
    rows={}; ids=None
    with path.open() as f:
        for l in f:
            if l.startswith('#CHROM'): ids=l.rstrip().split('\t')[9:]
            elif not l.startswith('#'):
                c=l.rstrip().split('\t'); rows[(c[0],int(c[1]))]=c
    return ids,rows
kgids,kgrows=readvcf(root/'kg-calls.vcf'); hgids,hgrows=readvcf(root/'hg-calls.vcf')
if set(kgids+hgids) != set(cohort_ids) or len(kgids+hgids) != len(cohort_ids):
    raise ValueError('Exported public sample inventory changed')
if hashlib.sha256(('\n'.join(kgids+hgids)+'\n').encode()).hexdigest() != partition['sourceFinalSampleOrderSha256']:
    raise ValueError('Frozen public sample order changed')
hgtext=(hg/'hgdp_all.psam').read_text().splitlines(); cols=hgtext[0].lstrip('#').split()
hgmeta={r['IID']:r for l in hgtext[1:] for r in [dict(zip(cols,l.split()))]}
with (root/'joint.vcf').open('w') as out:
    out.write('##fileformat=VCFv4.2\n##reference=GRCh38\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n')
    out.write('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t'+'\t'.join(kgids+hgids)+'\n')
    for m in sorted(markers,key=lambda m:(int(m['chrom']),m['pos38'])):
        a=kgrows[(m['chrom'],m['pos37'])]; b=hgrows[(m['chrom'],m['pos38'])]
        if a[3:5]!=b[3:5]: raise ValueError('Export allele mismatch')
        calls=[]
        for c in [a,b]:
            gt=c[8].split(':').index('GT'); calls += [s.split(':')[gt].replace('|','/') for s in c[9:]]
        out.write('\t'.join([m['chrom'],str(m['pos38']),m['id'],m['ref'],m['alt'],'.','PASS','.','GT',*calls])+'\n')
# Public VCF row strings are no longer needed once the joint file is closed.
# Release them before PLINK allocates its workspace for combined QC and LD.
del kgrows, hgrows
gc.collect()
run(['plink2','--vcf',root/'joint.vcf','--make-pgen','--out',root/'joint','--threads','4'])
run(['plink2','--pfile',root/'joint','--keep',root/'training.keep','--geno','0.01','--maf','0.05','--make-pgen','--out',root/'training','--threads','4'])
run(['plink2','--pfile',root/'training','--indep-pairwise','1000kb','1','0.1','--out',root/'pruned','--threads','4'])
pruned=set((root/'pruned.prune.in').read_text().split())
final=[]; previous={}
for m in sorted(markers,key=lambda m:(int(m['chrom']),m['pos38'])):
    if m['id'] in pruned and m['pos38']-previous.get(m['chrom'],-1000000)>=100000:
        final.append(m); previous[m['chrom']]=m['pos38']
(root/'final.ids').write_text('\n'.join(m['id'] for m in final)+'\n')
run(['plink2','--pfile',root/'joint','--extract',root/'final.ids','--export','vcf','id-paste=iid','--out',root/'final','--threads','4'])
sources={
    'kg':archive,
    'hgdp':{'release':'2019-05-16 main release','sourceURL':'https://www.cog-genomics.org/plink/2.0/resources#hgdp','pgenURL':'https://www.dropbox.com/s/hppj1g1gzygcocq/hgdp_all.pgen.zst?dl=1','pvarURL':'https://www.dropbox.com/s/mypl0wgpmhxwgjg/hgdp_all_noannot.pvar.zst?dl=1','psamURL':'https://www.dropbox.com/s/0zg57558fqpj3w1/hgdp.psam?dl=1','sha256':{f:sha(hg/f) for f in ['hgdp_all.pgen.zst','hgdp_all.pvar.zst','hgdp_all.psam']}},
    'chains':{f:sha(root/f) for f in ['hg19ToHg38.over.chain.gz','hg38ToHg19.over.chain.gz']},
    'selection':'Common non-palindromic autosomal SNVs, identical REF/ALT in both public panels; reciprocal same-strand assembly mapping and verified GRCh38 FASTA base check; frequency/missingness QC and LD r2 <= 0.1 in 1 Mb windows use training individuals only; >=100 kb spacing; MHC and chr8 inversion excluded; existing frozen cohort retained after prior pooled KING screening.',
    'trainingOnlySelection':inputs,
    'note':'This is a locally harmonized intersection of PLINK HGDP and PGS 1000G, not the gnomAD jointly called 4094-genome resource.'
}
(root/'prepared.json').write_text(json.dumps({'markers':final,'metadata':meta|hgmeta,'sources':sources},indent=2))
print('Prepared markers',len(final),flush=True)
