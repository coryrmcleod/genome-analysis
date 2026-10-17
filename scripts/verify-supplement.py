import subprocess,hashlib,json,pathlib,sys
original=pathlib.Path(sys.argv[1])
out=pathlib.Path(sys.argv[2])
fmt='%CHROM\t%POS\t%REF\t%ALT[\t%GT\t%GQ\t%DP]\n'
def digest(file,exclude=False):
 args=['bcftools','query','-f',fmt]
 if exclude: args+=['-e','INFO/GA_TARGET_CALL=1']
 args+=[str(file)]
 p=subprocess.Popen(args,stdout=subprocess.PIPE)
 h=hashlib.sha256();n=0
 for line in p.stdout: h.update(line);n+=1
 if p.wait()!=0: raise RuntimeError('Query failed')
 return {'records':n,'sha256':h.hexdigest()}
a=digest(original)
b=digest(out/'MMWDDW2BV.supplemented.vcf.gz',True)
result={'original':a,'retainedOriginal':b,'identical':a==b,'fields':'CHROM POS REF ALT GT GQ DP, including phase separators'}
(out/'original-call-preservation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
if a!=b: raise RuntimeError('Original call preservation check failed')
