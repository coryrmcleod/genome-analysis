"""Extract public EUR genotypes at installed score positions; run with WSL."""
import json, pathlib, subprocess, sys
root=pathlib.Path(sys.argv[1]).resolve()
library=json.loads(pathlib.Path(sys.argv[2]).read_text())
source=root/'extracted'/'GRCh37_1000G_ALL'
sample_text=pathlib.Path(str(source)+'.psam').read_text().splitlines()
print('Sample metadata header:',sample_text[0],flush=True)
headers=sample_text[0].lstrip('#').split()
samples=[dict(zip(headers,line.split())) for line in sample_text[1:] if line.strip()]
print('First public sample metadata:',samples[0],flush=True)
pop_key=next((k for k in headers if k.lower() in ['superpop','superpopulation','super_pop']),None)
sub_key=next((k for k in headers if k.lower() in ['pop','population']),None)
if not pop_key:
    raise ValueError('Review actual population column before selecting EUR samples')
excluded_path=root/'extracted'/'GRCh37_1000G.king.cutoff.out.id'
excluded_text=excluded_path.read_text().splitlines()
print('Related-sample exclusion file:',excluded_text,flush=True)
excluded=set(line.split()[-1] for line in excluded_text if line.strip() and not line.startswith('#'))
eur=[s for s in samples if s[pop_key]=='EUR' and s['IID'] not in excluded]
if len(eur)<100 or len({s['IID'] for s in eur})!=len(eur):
    raise ValueError('Insufficient or duplicate EUR samples')
keep=root/'eur.keep'
keep.write_text('#IID\n'+'\n'.join(s['IID'] for s in eur)+'\n')
bed=root/'score-targets.bed1'
bed.write_text(''.join(f"{t['mappings']['GRCh37']['chrom']}\t{t['mappings']['GRCh37']['position']}\t{t['mappings']['GRCh37']['position']}\t{t['id']}\n" for t in library['targets']))
prefix=str(root/'eur-score-targets')
command=['plink2','--pfile',str(source),'vzs','--keep',str(keep),'--extract','bed1',str(bed),'--make-pgen','--export','vcf','id-paste=iid','--out',prefix,'--threads','4','--memory','6400']
subprocess.run(command,check=True)
groups={}
for s in eur:
    label=s.get(sub_key,'Not supplied')
    groups[label]=groups.get(label,0)+1
(root/'sample-provenance.json').write_text(json.dumps({'sampleCount':len(eur),'groups':groups,'selection':'Source EUR labels; source KING cutoff exclusion list removed. No ancestry inference on personal data.','excludedCount':len(excluded),'command':command},indent=2))
print('EUR reference subset:',len(eur),groups,flush=True)
