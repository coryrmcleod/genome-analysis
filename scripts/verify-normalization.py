"""Check that unsplit normalization preserves genotype records and quality fields.

Recover original allele spellings from BCFtools' old-record tag. Two commutative accumulators over SHA-256 digests permit output reordering without retaining DNA
records in memory or writing them to the project directory.
"""
import hashlib,json,pathlib,subprocess,sys
MODULUS=2**256
def digest(filename,normalized=False):
    fmt='%CHROM\t%POS\t%REF\t%ALT\t%QUAL\t%FILTER'
    if normalized: fmt+='\t%INFO/GA_NORM_ORIGINAL'
    fmt+='[\t%GT\t%GQ\t%DP]\n'
    process=subprocess.Popen(['bcftools','query','-f',fmt,str(filename)],stdout=subprocess.PIPE)
    total=squared=count=changed=0
    for raw in process.stdout:
        fields=raw.decode().rstrip('\n').split('\t')
        if normalized:
            tag=fields.pop(6)
            if tag!='.':
                original=tag.split('|')
                if len(original)!=4: raise RuntimeError('Split or malformed original-record annotation')
                fields[:4]=original
                changed+=1
        value=int.from_bytes(hashlib.sha256(('\t'.join(fields)+'\n').encode()).digest(),'big')
        total=(total+value)%MODULUS;squared=(squared+value*value)%MODULUS;count+=1
    if process.wait()!=0: raise RuntimeError('BCFtools genotype query failed')
    return {'records':count,'sha256Sum':f'{total:064x}','sha256SquaredSum':f'{squared:064x}'},changed
if __name__=='__main__':
    source,destination=map(pathlib.Path,sys.argv[1:3])
    before,_=digest(source);after,changed=digest(destination,True)
    result={'original':before,'normalizedRecoveredOriginal':after,'identicalGenotypeRecordMultiset':before==after,'representationChanges':changed,'fields':'CHROM POS REF ALT QUAL FILTER GT GQ DP, including phase separators; original representation recovered from GA_NORM_ORIGINAL'}
    if len(sys.argv)>3:pathlib.Path(sys.argv[3]).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    if before!=after:raise RuntimeError('Normalization altered genotype or quality records')
