"""Verify a second supplementation preserves every prior call, including earlier targeted calls."""
import subprocess, hashlib, json, pathlib, sys
before, after, targets, output = map(pathlib.Path, sys.argv[1:5])
excluded = {tuple(line.split()[:2]) for line in targets.read_text().splitlines() if line.strip()}
fmt = '%CHROM\t%POS\t%REF\t%ALT\t%QUAL\t%FILTER[\t%GT\t%GQ\t%DP\t%AD\t%PL\t%PS]\n'
def digest(file, omit_new):
    p=subprocess.Popen(['bcftools','query','-u','-f',fmt,str(file)],stdout=subprocess.PIPE)
    h=hashlib.sha256(); n=0; removed=0
    for line in p.stdout:
        fields=line.decode().split('\t',2)
        if tuple(fields[:2]) in excluded:
            if not omit_new:
                raise ValueError('A supposedly new target already occurs in the source VCF')
            removed+=1; continue
        h.update(line); n+=1
    if p.wait()!=0: raise ValueError('VCF query failed')
    return {'records':n,'sha256':h.hexdigest()},removed
a,_=digest(before,False);b,added=digest(after,True)
result={'source':a,'retainedSource':b,'newRecords':added,'identical':a==b,'fields':'CHROM POS REF ALT QUAL FILTER GT GQ DP AD PL PS, including phase separators'}
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
if a!=b: raise ValueError('Existing calls changed')
